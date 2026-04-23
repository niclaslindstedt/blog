import { useCallback, useEffect, useRef, useState } from "react";
import type { LineColor, LineData, Step, TabStop } from "./types.ts";
import { charDelayMs } from "./typing.ts";

// Tuning knobs. Grouping them here makes it obvious at a glance which values
// drive typing/output cadence, and keeps the reducer/tick logic below focused
// on control flow rather than constants.
const TIMING = {
  commandMsPerCharNormal: 36,
  commandMsPerCharFast: 10,
  outputMsPerTickNormal: 14,
  outputMsPerTickFast: 6,
  outputCharsPerTickNormal: 3,
  outputCharsPerTickFast: 20,
  idlePollMs: 80,
  betweenStepMs: 60,
  enterPauseMinMs: 200,
  enterPauseMaxMs: 400,
  // Short beat between the last typed character of a unique filename prefix and
  // the snapped-in completion, long enough for the eye to register the "tab"
  // without feeling laggy.
  tabCompletePauseMs: 90,
  // Per-keystroke jitter range applied to `charDelayMs`. ±15% is wide enough to
  // shake off the metronome feel without breaking the rhythm of same-finger /
  // modifier penalties.
  typingJitterMin: 0.85,
  typingJitterMax: 1.15,
} as const;

function enterPauseMs(): number {
  const span = TIMING.enterPauseMaxMs - TIMING.enterPauseMinMs;
  return TIMING.enterPauseMinMs + Math.floor(Math.random() * (span + 1));
}

function jitter(ms: number): number {
  const span = TIMING.typingJitterMax - TIMING.typingJitterMin;
  const factor = TIMING.typingJitterMin + Math.random() * span;
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

// State the widget re-renders on. `queue` is intentionally NOT here — it
// mutates on every enqueue/shift, and we don't want a re-render for each
// queue churn. See `queueRef`.
interface RenderState {
  committed: LineData[];
  active: Active | null;
  anchor: AnchorSignal | null;
  cwd: string;
}

// Full snapshot of a session — what we save/restore on tab swap.
interface SessionSnapshot extends RenderState {
  queue: Step[];
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
  // Ctrl-C equivalent: drops any pending steps and any in-flight typing, so a
  // fresh sequence can be enqueued without waiting behind a long queue. When
  // a command was actually mid-type, the partial command commits as its own
  // line and a standalone `^C` drops underneath (matching how bash echoes
  // the control char on its own row). When nothing was actively typing —
  // only pending commits in the queue — we drop them silently; emitting
  // `^C` at an idle prompt would look like the reader aborted nothing.
  // Returns `true` if something was actually interrupted (so the caller can
  // e.g. add a beat before the next command), `false` otherwise.
  interrupt: () => boolean;
  idle: boolean;
  hasSession: (id: string) => boolean;
  anchor: AnchorSignal | null;
  cwd: string;
  prompt: string;
}

export interface UseTerminalAnimationOpts {
  // Default cwd for any session not already seen. Callers can override per
  // session by enqueuing a `cd` step as the first step of that session.
  initialCwd?: string;
  // Renders a prompt string from a cwd. Used for typed commands and for the
  // idle prompt shown at the bottom of the scrollback.
  promptFor?: (cwd: string) => string;
}

const DEFAULT_INITIAL_CWD = "~";
const DEFAULT_PROMPT_FOR = (cwd: string) => `${cwd} $`;

function newRenderState(initialCwd: string): RenderState {
  return { committed: [], active: null, anchor: null, cwd: initialCwd };
}

// Multi-session terminal animator. Each `sessionId` keeps its own scrollback,
// pending step queue, in-flight animation, and cwd. Changing the id snapshots
// the previous session into the map and loads the target's state, so tabs
// behave like real terminal tabs — focusing one restores exactly what was
// there, including the working directory its prompt will render.
export function useTerminalAnimation(
  sessionId: string,
  opts: UseTerminalAnimationOpts = {},
): UseTerminalAnimation {
  const initialCwd = opts.initialCwd ?? DEFAULT_INITIAL_CWD;
  const promptFor = opts.promptFor ?? DEFAULT_PROMPT_FOR;

  // Single source of truth for committed/active/anchor/cwd. `stateRef` is
  // updated synchronously alongside `setState` so the tick loop (which lives
  // in a one-shot useEffect and therefore can't re-subscribe to fresh state)
  // always sees the latest values without needing parallel per-field refs.
  const [state, setState] = useState<RenderState>(() => newRenderState(initialCwd));
  const stateRef = useRef<RenderState>(state);
  const update = useCallback((mut: (s: RenderState) => RenderState) => {
    const next = mut(stateRef.current);
    stateRef.current = next;
    setState(next);
  }, []);

  const [idle, setIdle] = useState(true);
  const queueRef = useRef<Step[]>([]);
  const anchorEpochRef = useRef<number>(0);
  const currentIdRef = useRef<string>(sessionId);
  const sessionsRef = useRef<Map<string, SessionSnapshot>>(new Map());
  const promptForRef = useRef(promptFor);
  promptForRef.current = promptFor;

  useEffect(() => {
    if (currentIdRef.current === sessionId) return;
    sessionsRef.current.set(currentIdRef.current, {
      ...stateRef.current,
      queue: queueRef.current,
    });
    const target = sessionsRef.current.get(sessionId);
    const next: RenderState = target
      ? {
          committed: target.committed,
          active: target.active,
          anchor: target.anchor,
          cwd: target.cwd,
        }
      : newRenderState(initialCwd);
    queueRef.current = target?.queue ?? [];
    stateRef.current = next;
    setState(next);
    setIdle(queueRef.current.length === 0 && next.active === null);
    currentIdRef.current = sessionId;
  }, [sessionId, initialCwd]);

  const enqueue = useCallback((steps: Step[]) => {
    queueRef.current.push(...steps);
    setIdle(false);
  }, []);

  const interrupt = useCallback((): boolean => {
    const wasTyping = stateRef.current.active !== null;
    queueRef.current = [];
    update((s) => {
      if (s.active === null) return s;
      const partial: LineData =
        s.active.kind === "command"
          ? { kind: "command", text: s.active.shown, prompt: s.active.prompt }
          : {
              kind: "output",
              text: s.active.shown,
              color: s.active.color,
              markdown: s.active.markdown,
            };
      return {
        ...s,
        committed: [...s.committed, partial, { kind: "output", text: "^C" }],
        active: null,
      };
    });
    setIdle(true);
    return wasTyping;
  }, [update]);

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

    const commit = (line: LineData) => update((s) => ({ ...s, committed: [...s.committed, line] }));

    const setActive = (active: Active | null) => update((s) => ({ ...s, active }));

    const tick = () => {
      if (canceled) return;

      const current = stateRef.current.active;
      if (current) {
        if (current.shown.length >= current.full.length) {
          const wasCommand = current.kind === "command";
          const wasFast = current.fast === true;
          update((s) => ({
            ...s,
            committed: [
              ...s.committed,
              wasCommand
                ? { kind: "command", text: current.full, prompt: current.prompt }
                : {
                    kind: "output",
                    text: current.full,
                    color: current.color,
                    markdown: current.markdown,
                  },
            ],
            active: null,
          }));
          schedule(wasCommand && !wasFast ? enterPauseMs() : TIMING.betweenStepMs);
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
          setActive({ ...current, shown: current.full.slice(0, snapTo), tabStops: rest });
          schedule(TIMING.tabCompletePauseMs);
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
          delay = current.fast ? TIMING.commandMsPerCharFast : TIMING.commandMsPerCharNormal;
        } else {
          chunk = current.fast ? TIMING.outputCharsPerTickFast : TIMING.outputCharsPerTickNormal;
          delay = current.fast ? TIMING.outputMsPerTickFast : TIMING.outputMsPerTickNormal;
        }
        const nextLen = Math.min(current.full.length, current.shown.length + chunk);
        setActive({ ...current, shown: current.full.slice(0, nextLen) });
        schedule(delay);
        return;
      }

      const next = queueRef.current.shift();
      if (!next) {
        setIdle(true);
        schedule(TIMING.idlePollMs);
        return;
      }

      setIdle(false);

      switch (next.kind) {
        case "type-command": {
          if (next.anchor === true) {
            // Capture the future committed index of this command. The active
            // typing line lives at `lines[committed.length]`, and when typing
            // finishes it commits at that same index — the anchor stays valid
            // before and after the transition.
            anchorEpochRef.current += 1;
            update((s) => ({
              ...s,
              anchor: { index: s.committed.length, epoch: anchorEpochRef.current },
            }));
          }
          setActive({
            kind: "command",
            full: next.text,
            shown: "",
            prompt: promptForRef.current(stateRef.current.cwd),
            fast: next.fast,
            wpm: next.wpm,
            tabStops: next.tabStops,
          });
          schedule(
            next.wpm !== undefined
              ? jitter(charDelayMs(null, next.text[0] ?? "", next.wpm))
              : next.fast
                ? TIMING.commandMsPerCharFast
                : TIMING.commandMsPerCharNormal,
          );
          return;
        }
        case "type":
          setActive({
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
                ? TIMING.outputMsPerTickFast
                : TIMING.outputMsPerTickNormal,
          );
          return;
        case "print":
          commit({
            kind: "output",
            text: next.text,
            color: next.color,
            markdown: next.markdown,
          });
          schedule(TIMING.betweenStepMs);
          return;
        case "print-command":
          commit({
            kind: "command",
            text: next.text,
            prompt: promptForRef.current(stateRef.current.cwd),
          });
          schedule(TIMING.betweenStepMs);
          return;
        case "blank":
          commit({ kind: "blank" });
          schedule(TIMING.betweenStepMs);
          return;
        case "clear":
          update((s) => ({ ...s, committed: [] }));
          schedule(TIMING.betweenStepMs);
          return;
        case "cd":
          update((s) => ({ ...s, cwd: next.to }));
          schedule(TIMING.betweenStepMs);
          return;
        case "clickable":
          commit({
            kind: "clickable",
            label: next.label,
            onClick: next.onClick,
            color: next.color,
            prefix: next.prefix,
          });
          schedule(TIMING.betweenStepMs);
          return;
        case "action":
          commit({ kind: "action", label: next.label, onClick: next.onClick });
          schedule(TIMING.betweenStepMs);
          return;
        case "tag-row":
          commit({ kind: "tag-row", tags: next.tags, onClick: next.onClick });
          schedule(TIMING.betweenStepMs);
          return;
        case "effect":
          next.run();
          schedule(TIMING.betweenStepMs);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { committed, active, anchor, cwd } = state;
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

  return { lines, enqueue, interrupt, idle, hasSession, anchor, cwd, prompt: promptFor(cwd) };
}
