import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import type { LineData } from "./terminalTypes.ts";
import type { AnchorSignal } from "./useTerminalAnimation.ts";
import { TerminalLine } from "./TerminalLine.tsx";

const MIN_WIDTH = 320;
const MIN_HEIGHT = 220;
const DEFAULT_WIDTH = 820;
const DEFAULT_HEIGHT = 560;
const VIEWPORT_MARGIN = 12;
const MOBILE_BREAKPOINT = 900;
// Tolerance (px) for detecting "at the bottom" during stick-to-bottom. A few
// pixels of slack covers sub-pixel rounding in scrollHeight/clientHeight on
// mobile browsers that would otherwise flip the flag false on every tick.
const BOTTOM_SLACK_PX = 8;
// Tolerance (px) for detecting that the user has scrolled away from an active
// anchor. We only release the anchor when the anchored line has drifted more
// than this from the top of the viewport — small drift from programmatic
// re-pinning or browser layout jitter doesn't count.
const ANCHOR_DRIFT_PX = 48;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function detectSmall(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth < MOBILE_BREAKPOINT) return true;
  const coarse = window.matchMedia?.("(pointer: coarse)");
  return !!coarse?.matches;
}

function useSmallViewport(): boolean {
  const [small, setSmall] = useState<boolean>(() => detectSmall());
  useEffect(() => {
    const update = () => setSmall(detectSmall());
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    const mq = window.matchMedia?.("(pointer: coarse)");
    mq?.addEventListener?.("change", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      mq?.removeEventListener?.("change", update);
    };
  }, []);
  return small;
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

function cwdFromLines(lines: LineData[]): string {
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i];
    if (l.kind === "command" && l.prompt) {
      return l.prompt.replace(/\s*\$\s*$/, "").trim();
    }
  }
  return "~";
}

export function Terminal({
  user = "niclaslindstedt",
  title,
  lines,
  idle,
  idlePrompt = "~/code/blog $",
  tabs,
  anchor,
}: {
  user?: string;
  title?: string;
  lines: LineData[];
  idle: boolean;
  idlePrompt?: string;
  tabs?: ReactNode;
  anchor?: AnchorSignal | null;
}) {
  const computedTitle = title ?? `${user} — ${cwdFromLines(lines)}`;
  const small = useSmallViewport();
  const [size, setSize] = useState(() => initialSize());
  const [pos, setPos] = useState(() => initialPos(initialSize()));
  const [dragging, setDragging] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  // Active anchor = the anchor signal the terminal is currently honoring. We
  // also remember the highest epoch we've seen (honored or dismissed) so the
  // user can scroll past an anchor and we don't reactivate it on the next
  // render just because the prop hasn't changed.
  const activeAnchorRef = useRef<AnchorSignal | null>(null);
  const lastSeenEpochRef = useRef<number>(0);
  // Whether the user is sitting at (or near) the bottom of the scrollback. We
  // use this to decide whether new output should keep the user pinned to the
  // bottom ("stick-to-bottom"), or leave their scroll position alone because
  // they scrolled up to read history.
  const userAtBottomRef = useRef<boolean>(true);
  // True while we're programmatically adjusting scrollTop. The scroll event
  // that fires as a result must not be interpreted as a user gesture, or we'd
  // fight our own anchor/stick logic.
  const programmaticScrollRef = useRef<boolean>(false);

  const scrollLineToTop = useCallback((index: number): boolean => {
    const el = bodyRef.current;
    if (!el) return false;
    const node = el.querySelector<HTMLElement>(`[data-line-index="${index}"]`);
    if (!node) return false;
    const containerRect = el.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const delta = nodeRect.top - containerRect.top;
    if (Math.abs(delta) < 1) return true;
    programmaticScrollRef.current = true;
    el.scrollTop += delta;
    requestAnimationFrame(() => {
      programmaticScrollRef.current = false;
    });
    return true;
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    programmaticScrollRef.current = true;
    el.scrollTop = el.scrollHeight;
    requestAnimationFrame(() => {
      programmaticScrollRef.current = false;
    });
  }, []);

  // After every lines change (new typing tick, new committed line), decide
  // where the viewport should be: active anchor wins, otherwise stick-to-
  // bottom if the user was already at the bottom. A fresh anchor epoch seen
  // here activates anchor mode; same-epoch renders either re-pin (if still
  // active) or stay dismissed (if the user has scrolled past it). Using
  // useLayoutEffect avoids a single-frame flash between React painting new
  // content and us correcting scrollTop.
  useLayoutEffect(() => {
    if (anchor) {
      if (anchor.epoch !== lastSeenEpochRef.current) {
        activeAnchorRef.current = anchor;
        lastSeenEpochRef.current = anchor.epoch;
      }
    } else {
      // Session without an anchor (e.g. freshly-visited audience tab) — drop
      // any activation carried over from the previous session.
      activeAnchorRef.current = null;
    }
    const active = activeAnchorRef.current;
    if (active) {
      if (scrollLineToTop(active.index)) return;
    }
    if (userAtBottomRef.current) scrollToBottom();
  }, [lines, anchor, scrollLineToTop, scrollToBottom]);

  const onBodyScroll = useCallback(() => {
    if (programmaticScrollRef.current) return;
    const el = bodyRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    userAtBottomRef.current = distanceFromBottom <= BOTTOM_SLACK_PX;
    const active = activeAnchorRef.current;
    if (active) {
      const node = el.querySelector<HTMLElement>(`[data-line-index="${active.index}"]`);
      if (!node) return;
      const containerRect = el.getBoundingClientRect();
      const nodeRect = node.getBoundingClientRect();
      // The anchored line naturally sits at delta=0 (top of viewport) while
      // we're honoring the anchor. A user scroll moves the line off the top.
      // Drift in either direction past ANCHOR_DRIFT_PX means the user has
      // taken over and we should stop re-pinning.
      if (Math.abs(nodeRect.top - containerRect.top) > ANCHOR_DRIFT_PX) {
        activeAnchorRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    if (small) return; // mobile fills the viewport via CSS; size/pos state is ignored.
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
  }, [small]);

  const onResizeStart = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (small) return;
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
    [small, size.width, size.height, pos.x, pos.y],
  );

  const onDragStart = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (small) return;
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
    [small, pos.x, pos.y, size.width, size.height],
  );

  const wrapperClass = small
    ? "fixed inset-0 flex flex-col overflow-hidden border-b border-term-border bg-term-bg"
    : "absolute flex flex-col overflow-hidden rounded-lg border border-term-border bg-term-bg shadow-2xl";

  const wrapperStyle: CSSProperties = small
    ? {
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }
    : {
        left: pos.x,
        top: pos.y,
        width: size.width,
        height: size.height,
        userSelect: dragging ? "none" : undefined,
      };

  return (
    <div className={wrapperClass} style={wrapperStyle}>
      <div
        className={`flex select-none items-center gap-3 border-b border-term-border bg-term-titlebar px-3 py-2 ${small ? "" : dragging ? "cursor-grabbing" : "cursor-grab"}`}
        onPointerDown={small ? undefined : onDragStart}
        style={{ touchAction: small ? undefined : "none" }}
      >
        <div className="flex gap-1.5" data-no-drag>
          <span className="h-3 w-3 rounded-full bg-red" />
          <span className="h-3 w-3 rounded-full bg-yellow" />
          <span className="h-3 w-3 rounded-full bg-green" />
        </div>
        <div className="flex-1 text-center font-ui text-[13px] tracking-wide text-dim">
          {computedTitle}
        </div>
        <div className="w-14" aria-hidden="true" />
      </div>

      {tabs}

      <div
        ref={bodyRef}
        onScroll={onBodyScroll}
        className="flex-1 overflow-auto px-3 pt-2 pb-4 text-fg sm:px-4 sm:pt-3"
      >
        {lines.map((l, i) => (
          <div key={i} data-line-index={i}>
            <TerminalLine line={l} />
          </div>
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

      {!small && (
        <div
          className="resize-handle-grip absolute right-0 bottom-0 h-4 w-4 cursor-nwse-resize text-dim hover:text-accent"
          style={{ touchAction: "none" }}
          onPointerDown={onResizeStart}
          data-no-drag
          role="separator"
          aria-label="Resize terminal"
        />
      )}
    </div>
  );
}
