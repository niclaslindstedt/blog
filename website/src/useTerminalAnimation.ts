import { useCallback, useEffect, useRef, useState } from "react";
import type { LineColor, LineData, Step } from "./terminalTypes.ts";

const COMMAND_MS_PER_CHAR = 32;
const OUTPUT_MS_PER_TICK = 14;
const OUTPUT_CHARS_PER_TICK = 3;
const IDLE_POLL_MS = 80;
const BETWEEN_STEP_MS = 60;

interface Active {
  kind: "command" | "output";
  full: string;
  shown: string;
  color?: LineColor;
  markdown?: boolean;
}

export interface UseTerminalAnimation {
  lines: LineData[];
  enqueue: (steps: Step[]) => void;
  idle: boolean;
}

export function useTerminalAnimation(): UseTerminalAnimation {
  const [committed, setCommitted] = useState<LineData[]>([]);
  const [active, setActive] = useState<Active | null>(null);
  const [idle, setIdle] = useState(true);
  const queueRef = useRef<Step[]>([]);
  const activeRef = useRef<Active | null>(null);

  const enqueue = useCallback((steps: Step[]) => {
    queueRef.current.push(...steps);
    setIdle(false);
  }, []);

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
          commit({
            kind: current.kind,
            text: current.full,
            color: current.color,
            markdown: current.markdown,
          });
          clearActive();
          schedule(BETWEEN_STEP_MS);
          return;
        }
        const chunk = current.kind === "command" ? 1 : OUTPUT_CHARS_PER_TICK;
        const nextLen = Math.min(current.full.length, current.shown.length + chunk);
        const updated: Active = { ...current, shown: current.full.slice(0, nextLen) };
        activeRef.current = updated;
        setActive(updated);
        schedule(current.kind === "command" ? COMMAND_MS_PER_CHAR : OUTPUT_MS_PER_TICK);
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
          startActive({ kind: "command", full: next.text, shown: "" });
          schedule(COMMAND_MS_PER_CHAR);
          return;
        case "type":
          startActive({
            kind: "output",
            full: next.text,
            shown: "",
            color: next.color,
            markdown: next.markdown,
          });
          schedule(OUTPUT_MS_PER_TICK);
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
        case "clickable":
          commit({
            kind: "clickable",
            label: next.label,
            onClick: next.onClick,
            color: next.color,
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
        {
          kind: active.kind,
          text: active.shown,
          color: active.color,
          markdown: active.markdown,
          active: true,
        } as LineData,
      ]
    : committed;

  return { lines, enqueue, idle };
}
