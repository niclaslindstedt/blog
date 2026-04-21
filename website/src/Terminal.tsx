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

export function Terminal({
  title = "niclas@blog ~ /posts",
  lines,
  idle,
}: {
  title?: string;
  lines: LineData[];
  idle: boolean;
}) {
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const onResizeStart = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const startW = size.width;
      const startH = size.height;

      const onMove = (ev: PointerEvent) => {
        setSize({
          width: Math.max(MIN_WIDTH, startW + (ev.clientX - startX)),
          height: Math.max(MIN_HEIGHT, startH + (ev.clientY - startY)),
        });
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [size.width, size.height],
  );

  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-lg border border-term-border bg-term-bg shadow-2xl"
      style={{
        width: size.width,
        height: size.height,
        maxWidth: "calc(100vw - 3rem)",
        maxHeight: "calc(100vh - 4rem)",
      }}
    >
      <div className="flex select-none items-center gap-3 border-b border-term-border bg-term-titlebar px-3 py-2">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red" />
          <span className="h-3 w-3 rounded-full bg-yellow" />
          <span className="h-3 w-3 rounded-full bg-green" />
        </div>
        <div className="flex-1 text-center text-xs tracking-wide text-dim">{title}</div>
        <div className="w-14" aria-hidden="true" />
      </div>

      <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 pb-4 pt-3 text-fg">
        {lines.map((l, i) => (
          <TerminalLine key={i} line={l} />
        ))}
        {idle && (
          <div className="flex gap-2">
            <span className="shrink-0 text-accent">$</span>
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
        role="separator"
        aria-label="Resize terminal"
      />
    </div>
  );
}
