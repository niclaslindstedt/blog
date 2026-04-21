import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { LineData } from "./terminalTypes.ts";
import { TerminalLine } from "./TerminalLine.tsx";

const MIN_WIDTH = 320;
const MIN_HEIGHT = 220;
const DEFAULT_WIDTH = 820;
const DEFAULT_HEIGHT = 560;
const VIEWPORT_MARGIN = 12;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function initialSize(): { width: number; height: number } {
  if (typeof window === "undefined") return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  return {
    width: Math.min(DEFAULT_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2),
    height: Math.min(DEFAULT_HEIGHT, window.innerHeight - VIEWPORT_MARGIN * 2),
  };
}

function initialPos(size: { width: number; height: number }): { x: number; y: number } {
  if (typeof window === "undefined") return { x: VIEWPORT_MARGIN, y: VIEWPORT_MARGIN };
  const x = Math.max(VIEWPORT_MARGIN, (window.innerWidth - size.width) / 2);
  const y = Math.max(VIEWPORT_MARGIN, Math.min(64, (window.innerHeight - size.height) / 2));
  return { x, y };
}

export function Terminal({
  title = "niclas@blog ~ /code",
  lines,
  idle,
  idlePrompt = "~/code $",
}: {
  title?: string;
  lines: LineData[];
  idle: boolean;
  idlePrompt?: string;
}) {
  const [size, setSize] = useState(() => initialSize());
  const [pos, setPos] = useState(() => initialPos(initialSize()));
  const [dragging, setDragging] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  useEffect(() => {
    const onResize = () => {
      setSize((s) => {
        const nextW = Math.min(s.width, window.innerWidth - VIEWPORT_MARGIN);
        const nextH = Math.min(s.height, window.innerHeight - VIEWPORT_MARGIN);
        return { width: Math.max(MIN_WIDTH, nextW), height: Math.max(MIN_HEIGHT, nextH) };
      });
      setPos((p) => ({
        x: clamp(p.x, 0, Math.max(0, window.innerWidth - MIN_WIDTH)),
        y: clamp(p.y, 0, Math.max(0, window.innerHeight - MIN_HEIGHT)),
      }));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onResizeStart = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      const startW = size.width;
      const startH = size.height;
      const originX = pos.x;
      const originY = pos.y;

      const onMove = (ev: PointerEvent) => {
        const maxW = Math.max(MIN_WIDTH, window.innerWidth - originX);
        const maxH = Math.max(MIN_HEIGHT, window.innerHeight - originY);
        setSize({
          width: clamp(startW + (ev.clientX - startX), MIN_WIDTH, maxW),
          height: clamp(startH + (ev.clientY - startY), MIN_HEIGHT, maxH),
        });
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [size.width, size.height, pos.x, pos.y],
  );

  const onDragStart = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
      e.preventDefault();
      setDragging(true);
      const startX = e.clientX;
      const startY = e.clientY;
      const originX = pos.x;
      const originY = pos.y;
      const w = size.width;
      const h = size.height;

      const onMove = (ev: PointerEvent) => {
        const maxX = Math.max(0, window.innerWidth - w);
        const maxY = Math.max(0, window.innerHeight - h);
        setPos({
          x: clamp(originX + (ev.clientX - startX), 0, maxX),
          y: clamp(originY + (ev.clientY - startY), 0, maxY),
        });
      };
      const onUp = () => {
        setDragging(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [pos.x, pos.y, size.width, size.height],
  );

  return (
    <div
      className="absolute flex flex-col overflow-hidden rounded-lg border border-term-border bg-term-bg shadow-2xl"
      style={{
        left: pos.x,
        top: pos.y,
        width: size.width,
        height: size.height,
        userSelect: dragging ? "none" : undefined,
      }}
    >
      <div
        className={`flex select-none items-center gap-3 border-b border-term-border bg-term-titlebar px-3 py-2 ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        onPointerDown={onDragStart}
        style={{ touchAction: "none" }}
      >
        <div className="flex gap-1.5" data-no-drag>
          <span className="h-3 w-3 rounded-full bg-red" />
          <span className="h-3 w-3 rounded-full bg-yellow" />
          <span className="h-3 w-3 rounded-full bg-green" />
        </div>
        <div className="flex-1 text-center text-xs tracking-wide text-dim">{title}</div>
        <div className="w-14" aria-hidden="true" />
      </div>

      <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 pt-3 pb-4 text-fg">
        {lines.map((l, i) => (
          <TerminalLine key={i} line={l} />
        ))}
        {idle && (
          <div className="flex gap-2">
            <span className="shrink-0 text-accent">{idlePrompt}</span>
            <span className="flex-1">
              <span className="animate-blink-cursor" aria-hidden="true" />
            </span>
          </div>
        )}
      </div>

      <div
        className="resize-handle-grip absolute right-0 bottom-0 h-4 w-4 cursor-nwse-resize text-dim hover:text-accent"
        style={{ touchAction: "none" }}
        onPointerDown={onResizeStart}
        data-no-drag
        role="separator"
        aria-label="Resize terminal"
      />
    </div>
  );
}
