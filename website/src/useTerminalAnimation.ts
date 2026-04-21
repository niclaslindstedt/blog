import { useCallback, useEffect, useRef, useState } from "react";
import type { LineColor, LineData, Step } from "./terminalTypes.ts";
import { charDelayMs } from "./typing.ts";

const COMMAND_MS_PER_CHAR_NORMAL = 36;
const COMMAND_MS_PER_CHAR_FAST = 10;
const OUTPUT_MS_PER_TICK_NORMAL = 14;
const OUTPUT_MS_PER_TICK_FAST = 6;
const OUTPUT_CHARS_PER_TICK_NORMAL = 3;
const OUTPUT_CHARS_PER_TICK_FAST = 20;
const IDLE_POLL_MS = 80;
const BETWEEN_STEP_MS = 60;

interface Active {
  kind: "command" | "output";
  full: string;
  shown: string;
  color?: LineColor;
  markdown?: boolean;
  fast?: boolean;
  wpm?: number;
  prompt?: string;
}

interface SessionState {
  committed: LineData[];
  queue: Step[];
  active: Active | null;
}

export interface UseTerminalAnimation {
  lines: LineData[];
  enqueue: (steps: Step[]) => void;
  idle: boolean;
  hasSession: (id: string) => boolean;
}

function newSession(): SessionState {
  return { committed: [], queue: [], active: null };
}

// Multi-session terminal animator. Each `sessionId` keeps its own scrollback,
// pending step queue, and in-flight animation. Changing the id snapshots the
// previous session into the map and loads the target's state, so tabs behave
// like real terminal tabs — focusing one restores exactly what was there.
export function useTerminalAnimation(sessionId: string): UseTerminalAnimation {
  const [committed, setCommitted] = useState<LineData[]>([]);
  const [active, setActive] = useState<Active | null>(null);
  const [idle, setIdle] = useState(true);
  const queueRef = useRef<Step[]>([]);
  const activeRef = useRef<Active | null>(null);
  const committedRef = useRef<LineData[]>([]);
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
    });
    const target = sessionsRef.current.get(sessionId) ?? newSession();
    queueRef.current = target.queue;
    activeRef.current = target.active;
    committedRef.current = target.committed;
    setCommitted(target.committed);
    setActive(target.active);
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
          if (current.kind === "command") {
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
          schedule(BETWEEN_STEP_MS);
          return;
        }
        let chunk: number;
        let delay: number;
        if (current.wpm !== undefined) {
          chunk = 1;
          const prev = current.shown.length === 0 ? null : current.shown[current.shown.length - 1];
          const next = current.full[current.shown.length];
          delay = charDelayMs(prev, next, current.wpm);
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
          startActive({
            kind: "command",
            full: next.text,
            shown: "",
            prompt: next.prompt,
            fast: next.fast,
            wpm: next.wpm,
          });
          schedule(
            next.wpm !== undefined
              ? charDelayMs(null, next.text[0] ?? "", next.wpm)
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
              ? charDelayMs(null, next.text[0] ?? "", next.wpm)
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

  return { lines, enqueue, idle, hasSession };
}
