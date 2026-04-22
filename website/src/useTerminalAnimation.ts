import { useCallback, useEffect, useRef, useState } from "react";
import type { LineColor, LineData, Step, TabStop } from "./terminalTypes.ts";
import { charDelayMs } from "./typing.ts";

const COMMAND_MS_PER_CHAR_NORMAL = 36;
const COMMAND_MS_PER_CHAR_FAST = 10;
const OUTPUT_MS_PER_TICK_NORMAL = 14;
const OUTPUT_MS_PER_TICK_FAST = 6;
const OUTPUT_CHARS_PER_TICK_NORMAL = 3;
const OUTPUT_CHARS_PER_TICK_FAST = 20;
const IDLE_POLL_MS = 80;
const BETWEEN_STEP_MS = 60;
const ENTER_PAUSE_MIN_MS = 200;
const ENTER_PAUSE_MAX_MS = 400;
// Short beat between the last typed character of a unique filename prefix and
// the snapped-in completion, long enough for the eye to register the "tab"
// without feeling laggy.
const TAB_COMPLETE_PAUSE_MS = 90;
// Per-keystroke jitter range applied to `charDelayMs`. ±15% is wide enough to
// shake off the metronome feel without breaking the rhythm of same-finger /
// modifier penalties.
const TYPING_JITTER_MIN = 0.85;
const TYPING_JITTER_MAX = 1.15;

function enterPauseMs(): number {
  const span = ENTER_PAUSE_MAX_MS - ENTER_PAUSE_MIN_MS;
  return ENTER_PAUSE_MIN_MS + Math.floor(Math.random() * (span + 1));
}

function jitter(ms: number): number {
  const span = TYPING_JITTER_MAX - TYPING_JITTER_MIN;
  const factor = TYPING_JITTER_MIN + Math.random() * span;
  return Math.max(1, Math.round(ms * factor));
}

interface Active {
  kind: "command" | "output";
  full: string;
  shown: string;
  color?: LineColor;
  markdown?: boolean;
  fast?: boolean;
  wpm?: number;
  prompt?: string;
  tabStops?: TabStop[];
}

interface SessionState {
  committed: LineData[];
  queue: Step[];
  active: Active | null;
  anchor: AnchorSignal | null;
}

// The terminal's scroll container listens on `anchor.epoch`: a fresh epoch
// means "a new command has just started rendering; scroll so the line at
// `index` is at the top". `index` points into `lines` (committed ++ active),
// and is captured the moment the anchoring command begins — i.e. the index
// that line will keep once its typing finishes and it commits.
export interface AnchorSignal {
  index: number;
  epoch: number;
}

export interface UseTerminalAnimation {
  lines: LineData[];
  enqueue: (steps: Step[]) => void;
  idle: boolean;
  hasSession: (id: string) => boolean;
  anchor: AnchorSignal | null;
}

function newSession(): SessionState {
  return { committed: [], queue: [], active: null, anchor: null };
}

// Multi-session terminal animator. Each `sessionId` keeps its own scrollback,
// pending step queue, and in-flight animation. Changing the id snapshots the
// previous session into the map and loads the target's state, so tabs behave
// like real terminal tabs — focusing one restores exactly what was there.
export function useTerminalAnimation(sessionId: string): UseTerminalAnimation {
  const [committed, setCommitted] = useState<LineData[]>([]);
  const [active, setActive] = useState<Active | null>(null);
  const [idle, setIdle] = useState(true);
  const [anchor, setAnchor] = useState<AnchorSignal | null>(null);
  const queueRef = useRef<Step[]>([]);
  const activeRef = useRef<Active | null>(null);
  const committedRef = useRef<LineData[]>([]);
  const anchorRef = useRef<AnchorSignal | null>(null);
  const anchorEpochRef = useRef<number>(0);
  const currentIdRef = useRef<string>(sessionId);
  const sessionsRef = useRef<Map<string, SessionState>>(new Map());

  useEffect(() => {
    committedRef.current = committed;
  }, [committed]);

  useEffect(() => {
    if (currentIdRef.current === sessionId) return;
    sessionsRef.current.set(currentIdRef.current, {
      committed: committedRef.current,
      queue: queueRef.current,
      active: activeRef.current,
      anchor: anchorRef.current,
    });
    const target = sessionsRef.current.get(sessionId) ?? newSession();
    queueRef.current = target.queue;
    activeRef.current = target.active;
    committedRef.current = target.committed;
    anchorRef.current = target.anchor;
    setCommitted(target.committed);
    setActive(target.active);
    setAnchor(target.anchor);
    setIdle(target.queue.length === 0 && target.active === null);
    currentIdRef.current = sessionId;
  }, [sessionId]);

  const enqueue = useCallback((steps: Step[]) => {
    queueRef.current.push(...steps);
    setIdle(false);
  }, []);

  const hasSession = useCallback(
    (id: string) => id === currentIdRef.current || sessionsRef.current.has(id),
    [],
  );

  useEffect(() => {
    let canceled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = (delay: number) => {
      timer = setTimeout(tick, delay);
    };

    const commit = (line: LineData) => setCommitted((prev) => [...prev, line]);

    const startActive = (a: Active) => {
      activeRef.current = a;
      setActive(a);
    };

    const clearActive = () => {
      activeRef.current = null;
      setActive(null);
    };

    const tick = () => {
      if (canceled) return;

      const current = activeRef.current;
      if (current) {
        if (current.shown.length >= current.full.length) {
          const wasCommand = current.kind === "command";
          const wasFast = current.fast === true;
          if (wasCommand) {
            commit({ kind: "command", text: current.full, prompt: current.prompt });
          } else {
            commit({
              kind: "output",
              text: current.full,
              color: current.color,
              markdown: current.markdown,
            });
          }
          clearActive();
          schedule(wasCommand && !wasFast ? enterPauseMs() : BETWEEN_STEP_MS);
          return;
        }
        if (
          current.kind === "command" &&
          current.tabStops !== undefined &&
          current.tabStops.length > 0 &&
          current.shown.length >= current.tabStops[0].at &&
          current.shown.length < current.full.length
        ) {
          const [stop, ...rest] = current.tabStops;
          const snapTo = Math.min(stop.to, current.full.length);
          const snapped: Active = {
            ...current,
            shown: current.full.slice(0, snapTo),
            tabStops: rest,
          };
          activeRef.current = snapped;
          setActive(snapped);
          schedule(TAB_COMPLETE_PAUSE_MS);
          return;
        }
        let chunk: number;
        let delay: number;
        if (current.wpm !== undefined) {
          chunk = 1;
          // `charDelayMs(a, b)` models the real-world gap between pressing `a`
          // and pressing `b`. We schedule AFTER revealing a character, so the
          // delay to queue here is the gap from the character we're about to
          // reveal to the one AFTER it — not from the previously shown char to
          // the about-to-be-shown one (which is already in the past by now).
          const revealedIdx = current.shown.length;
          const justRevealed = current.full[revealedIdx];
          const successor =
            revealedIdx + 1 < current.full.length ? current.full[revealedIdx + 1] : null;
          delay =
            successor !== null ? jitter(charDelayMs(justRevealed, successor, current.wpm)) : 0;
        } else if (current.kind === "command") {
          chunk = 1;
          delay = current.fast ? COMMAND_MS_PER_CHAR_FAST : COMMAND_MS_PER_CHAR_NORMAL;
        } else {
          chunk = current.fast ? OUTPUT_CHARS_PER_TICK_FAST : OUTPUT_CHARS_PER_TICK_NORMAL;
          delay = current.fast ? OUTPUT_MS_PER_TICK_FAST : OUTPUT_MS_PER_TICK_NORMAL;
        }
        const nextLen = Math.min(current.full.length, current.shown.length + chunk);
        const updated: Active = { ...current, shown: current.full.slice(0, nextLen) };
        activeRef.current = updated;
        setActive(updated);
        schedule(delay);
        return;
      }

      const next = queueRef.current.shift();
      if (!next) {
        setIdle(true);
        schedule(IDLE_POLL_MS);
        return;
      }

      setIdle(false);

      switch (next.kind) {
        case "type-command":
          if (next.anchor === true) {
            // Capture the future committed index of this command. The active
            // typing line lives at `lines[committed.length]`, and when typing
            // finishes it commits at that same index — the anchor stays valid
            // before and after the transition.
            anchorEpochRef.current += 1;
            const signal: AnchorSignal = {
              index: committedRef.current.length,
              epoch: anchorEpochRef.current,
            };
            anchorRef.current = signal;
            setAnchor(signal);
          }
          startActive({
            kind: "command",
            full: next.text,
            shown: "",
            prompt: next.prompt,
            fast: next.fast,
            wpm: next.wpm,
            tabStops: next.tabStops,
          });
          schedule(
            next.wpm !== undefined
              ? jitter(charDelayMs(null, next.text[0] ?? "", next.wpm))
              : next.fast
                ? COMMAND_MS_PER_CHAR_FAST
                : COMMAND_MS_PER_CHAR_NORMAL,
          );
          return;
        case "type":
          startActive({
            kind: "output",
            full: next.text,
            shown: "",
            color: next.color,
            markdown: next.markdown,
            fast: next.fast,
            wpm: next.wpm,
          });
          schedule(
            next.wpm !== undefined
              ? jitter(charDelayMs(null, next.text[0] ?? "", next.wpm))
              : next.fast
                ? OUTPUT_MS_PER_TICK_FAST
                : OUTPUT_MS_PER_TICK_NORMAL,
          );
          return;
        case "print":
          commit({
            kind: "output",
            text: next.text,
            color: next.color,
            markdown: next.markdown,
          });
          schedule(BETWEEN_STEP_MS);
          return;
        case "blank":
          commit({ kind: "blank" });
          schedule(BETWEEN_STEP_MS);
          return;
        case "clear":
          committedRef.current = [];
          setCommitted([]);
          schedule(BETWEEN_STEP_MS);
          return;
        case "clickable":
          commit({
            kind: "clickable",
            label: next.label,
            onClick: next.onClick,
            color: next.color,
            prefix: next.prefix,
          });
          schedule(BETWEEN_STEP_MS);
          return;
        case "action":
          commit({ kind: "action", label: next.label, onClick: next.onClick });
          schedule(BETWEEN_STEP_MS);
          return;
        case "tag-row":
          commit({ kind: "tag-row", tags: next.tags, onClick: next.onClick });
          schedule(BETWEEN_STEP_MS);
          return;
        case "effect":
          next.run();
          schedule(BETWEEN_STEP_MS);
          return;
        case "delay":
          schedule(next.ms);
          return;
      }
    };

    schedule(120);

    return () => {
      canceled = true;
      if (timer !== null) clearTimeout(timer);
    };
  }, []);

  const lines: LineData[] = active
    ? [
        ...committed,
        active.kind === "command"
          ? ({
              kind: "command",
              text: active.shown,
              prompt: active.prompt,
              active: true,
            } as LineData)
          : ({
              kind: "output",
              text: active.shown,
              color: active.color,
              markdown: active.markdown,
              active: true,
            } as LineData),
      ]
    : committed;

  return { lines, enqueue, idle, hasSession, anchor };
}
