import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import type { LineData } from "./types.ts";
import type { AnchorSignal } from "./useTerminalAnimation.ts";
import { PromptText, TerminalLine } from "./TerminalLine.tsx";
import { clamp } from "./pointerCapture.ts";
import { useDraggable } from "./useDraggable.ts";
import { useResizable } from "./useResizable.ts";

const MIN_WIDTH = 320;
const MIN_HEIGHT = 220;
const DEFAULT_WIDTH = 820;
const DEFAULT_HEIGHT = 560;
const VIEWPORT_MARGIN = 12;
const MOBILE_BREAKPOINT = 900;
// Fallback height (px) for the titlebar-only bar shown when the terminal is
// minimized. The titlebar itself is py-2 (16px) + one row of 12px dots + 1px
// border; 37px matches the single-line rendered height. When the title wraps
// (narrow mobile viewports), we measure the titlebar and use that instead so
// the bar always fits its content.
const MINIMIZED_HEIGHT = 37;
// Duration (ms) of the minimize / restore / zoom size-and-position tween.
// Kept short so the animation feels like a window manager response, not a
// page transition. Mirrored in the inline `transition` style below.
const MINIMIZE_MS = 260;
// Persisted window geometry so a drag or resize survives client-side
// navigation (clicking a post, then going back) and full reloads.
const POS_KEY = "blog:terminal-pos";
const SIZE_KEY = "blog:terminal-size";
// Tolerance (px) for detecting "at the bottom" during stick-to-bottom. A few
// pixels of slack covers sub-pixel rounding in scrollHeight/clientHeight on
// mobile browsers that would otherwise flip the flag false on every tick.
const BOTTOM_SLACK_PX = 8;
// Tolerance (px) for detecting that the user has scrolled away from an active
// anchor. We only release the anchor when the anchored line has drifted more
// than this from the top of the viewport — small drift from programmatic
// re-pinning or browser layout jitter doesn't count.
const ANCHOR_DRIFT_PX = 48;

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

function readStoredNumbers<K extends string>(
  key: string,
  fields: readonly [K, K],
): Record<K, number> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") {
      const a = (parsed as Record<string, unknown>)[fields[0]];
      const b = (parsed as Record<string, unknown>)[fields[1]];
      if (Number.isFinite(a) && Number.isFinite(b)) {
        return { [fields[0]]: a as number, [fields[1]]: b as number } as Record<K, number>;
      }
    }
  } catch {
    // corrupt entry — fall through to default.
  }
  return null;
}

function writeStored(key: string, value: object): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage unavailable — ignore.
  }
}

function initialSize(): { width: number; height: number } {
  if (typeof window === "undefined") return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  const maxW = window.innerWidth - VIEWPORT_MARGIN * 2;
  const maxH = window.innerHeight - VIEWPORT_MARGIN * 2;
  const stored = readStoredNumbers(SIZE_KEY, ["width", "height"] as const);
  if (stored) {
    return {
      width: clamp(stored.width, MIN_WIDTH, Math.max(MIN_WIDTH, maxW)),
      height: clamp(stored.height, MIN_HEIGHT, Math.max(MIN_HEIGHT, maxH)),
    };
  }
  return {
    width: Math.min(DEFAULT_WIDTH, maxW),
    height: Math.min(DEFAULT_HEIGHT, maxH),
  };
}

function initialPos(size: { width: number; height: number }): { x: number; y: number } {
  if (typeof window === "undefined") return { x: VIEWPORT_MARGIN, y: VIEWPORT_MARGIN };
  const maxX = Math.max(0, window.innerWidth - size.width);
  const maxY = Math.max(0, window.innerHeight - size.height);
  const stored = readStoredNumbers(POS_KEY, ["x", "y"] as const);
  if (stored) return { x: clamp(stored.x, 0, maxX), y: clamp(stored.y, 0, maxY) };
  const x = Math.max(VIEWPORT_MARGIN, (window.innerWidth - size.width) / 2);
  const y = Math.max(VIEWPORT_MARGIN, Math.min(64, (window.innerHeight - size.height) / 2));
  return { x, y };
}

export function Terminal({
  user = "niclaslindstedt",
  title,
  lines,
  idle,
  cwd,
  prompt,
  tabs,
  anchor,
  minimized = false,
  onClose,
  onMinimize,
  onRestore,
}: {
  user?: string;
  title?: string;
  lines: LineData[];
  idle: boolean;
  // Working directory shown in the titlebar. Derived by the caller from
  // session state (see `useTerminalAnimation`), not from the scrollback.
  cwd: string;
  // Idle prompt shown when the terminal is between commands. Typically
  // `<cwd> $`, but the caller supplies the exact string so a host app can
  // use a different prompt style without the widget prescribing it.
  prompt: string;
  tabs?: ReactNode;
  anchor?: AnchorSignal | null;
  minimized?: boolean;
  onClose?: () => void;
  onMinimize?: () => void;
  onRestore?: () => void;
}) {
  const computedTitle = title ?? `${user} — ${cwd}`;
  const small = useSmallViewport();
  const [size, setSize] = useState(() => initialSize());
  const [pos, setPos] = useState(() => initialPos(initialSize()));
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  // Viewport dimensions, tracked so the minimized bar and the fullscreen
  // rectangle can animate to numeric px targets rather than mixing px with
  // `vw`/`vh`/`inset-0` values that CSS can't interpolate between.
  const [viewport, setViewport] = useState<{ w: number; h: number }>(() => ({
    w: typeof window === "undefined" ? DEFAULT_WIDTH : window.innerWidth,
    h: typeof window === "undefined" ? DEFAULT_HEIGHT : window.innerHeight,
  }));
  const bodyRef = useRef<HTMLDivElement>(null);
  const titlebarRef = useRef<HTMLDivElement>(null);
  // Measured titlebar height, used as the minimized-state rectangle height so
  // a wrapped (two-line) title on narrow viewports isn't clipped by the fixed
  // 37px fallback.
  const [titlebarHeight, setTitlebarHeight] = useState<number>(MINIMIZED_HEIGHT);
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
  // Snapshot of pre-zoom geometry so the green dot can restore the window to
  // the exact size/position the user had before zooming.
  const preZoomRef = useRef<{
    size: { width: number; height: number };
    pos: { x: number; y: number };
  } | null>(null);
  const fullscreen = small || zoomed;

  const toggleZoom = useCallback(() => {
    if (small) return;
    setZoomed((z) => {
      if (!z) {
        preZoomRef.current = { size, pos };
      } else if (preZoomRef.current) {
        // Clamp the restored geometry against the current viewport — the
        // window may have shrunk while zoomed.
        const prev = preZoomRef.current;
        const w = Math.min(prev.size.width, window.innerWidth - VIEWPORT_MARGIN);
        const h = Math.min(prev.size.height, window.innerHeight - VIEWPORT_MARGIN);
        setSize({ width: Math.max(MIN_WIDTH, w), height: Math.max(MIN_HEIGHT, h) });
        setPos({
          x: clamp(prev.pos.x, 0, Math.max(0, window.innerWidth - MIN_WIDTH)),
          y: clamp(prev.pos.y, 0, Math.max(0, window.innerHeight - MIN_HEIGHT)),
        });
      }
      return !z;
    });
  }, [small, size, pos]);

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

  // Persist pos/size across client-side navigations (e.g. clicking a post,
  // then going back) and reloads. Skipped on mobile — the widget is CSS-
  // fullscreen there and pos/size are fixed at their defaults.
  useEffect(() => {
    if (small) return;
    writeStored(POS_KEY, pos);
  }, [pos, small]);
  useEffect(() => {
    if (small) return;
    writeStored(SIZE_KEY, size);
  }, [size, small]);

  useLayoutEffect(() => {
    const el = titlebarRef.current;
    if (!el) return;
    const update = () => {
      const h = el.offsetHeight;
      if (h > 0) setTitlebarHeight(h);
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onResize = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      if (small) return; // mobile fills the viewport via CSS; size/pos state is ignored.
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

  const onResizeStart = useResizable({
    pos,
    size,
    min: { width: MIN_WIDTH, height: MIN_HEIGHT },
    enabled: !fullscreen && !minimized,
    onChange: setSize,
    onResizingChange: setResizing,
  });

  const onDragStart = useDraggable({
    pos,
    size,
    enabled: !fullscreen && !minimized,
    onChange: setPos,
    onDraggingChange: setDragging,
    ignoreSelector: "[data-no-drag]",
  });

  // Base wrapper classes are identical across states — the rectangle is always
  // position:fixed so the minimize tween can animate between numeric
  // top/left/width/height values without swapping positioning strategies.
  // Rounded corners, borders, and shadow only apply in the floating state.
  const wrapperClass = `fixed flex flex-col overflow-hidden bg-term-bg ${
    minimized
      ? "border-t border-term-border shadow-[0_-4px_12px_rgba(0,0,0,0.25)]"
      : fullscreen
        ? "border-b border-term-border"
        : "rounded-lg border border-term-border shadow-2xl"
  }`;

  // During drag/resize, don't tween — those are direct manipulations and any
  // transition would cause visible lag. Everything else (minimize, restore,
  // zoom toggle, window-resize clamp) animates.
  const transition =
    dragging || resizing
      ? undefined
      : `top ${MINIMIZE_MS}ms ease, left ${MINIMIZE_MS}ms ease, width ${MINIMIZE_MS}ms ease, height ${MINIMIZE_MS}ms ease, border-radius ${MINIMIZE_MS}ms ease`;

  const wrapperStyle: CSSProperties = minimized
    ? {
        left: 0,
        top: Math.max(0, viewport.h - titlebarHeight),
        width: viewport.w,
        height: titlebarHeight,
        transition,
      }
    : fullscreen
      ? {
          left: 0,
          top: 0,
          width: viewport.w,
          height: viewport.h,
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
          transition,
        }
      : {
          left: pos.x,
          top: pos.y,
          width: size.width,
          height: size.height,
          userSelect: dragging ? "none" : undefined,
          transition,
        };

  const titlebarCursor = minimized
    ? "cursor-pointer"
    : fullscreen
      ? ""
      : dragging
        ? "cursor-grabbing"
        : "cursor-grab";

  // When minimized, clicking empty titlebar space restores the terminal. We
  // skip the restore if the click landed on (or inside) one of the
  // traffic-light buttons so they keep their own behavior.
  const onTitlebarClick =
    minimized && onRestore
      ? (e: ReactMouseEvent<HTMLDivElement>) => {
          if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
          onRestore();
        }
      : undefined;

  return (
    <div className={wrapperClass} style={wrapperStyle}>
      <div
        ref={titlebarRef}
        className={`flex shrink-0 select-none items-center gap-3 border-b border-term-border bg-term-titlebar px-3 py-2 ${titlebarCursor}`}
        onPointerDown={fullscreen || minimized ? undefined : onDragStart}
        onClick={onTitlebarClick}
        style={{ touchAction: fullscreen || minimized ? undefined : "none" }}
      >
        <div className="flex gap-1.5" data-no-drag>
          <button
            type="button"
            aria-label="Close terminal"
            onClick={onClose}
            className="h-3 w-3 cursor-pointer rounded-full border-0 bg-red p-0 outline-none focus-visible:ring-2 focus-visible:ring-fg"
          />
          <button
            type="button"
            aria-label={minimized ? "Restore terminal" : "Minimize terminal"}
            aria-pressed={minimized}
            onClick={minimized ? onRestore : onMinimize}
            className="h-3 w-3 cursor-pointer rounded-full border-0 bg-yellow p-0 outline-none focus-visible:ring-2 focus-visible:ring-fg"
          />
          <button
            type="button"
            aria-label={zoomed ? "Restore terminal size" : "Zoom terminal"}
            aria-pressed={zoomed}
            onClick={toggleZoom}
            disabled={small || minimized}
            className="h-3 w-3 cursor-pointer rounded-full border-0 bg-green p-0 outline-none focus-visible:ring-2 focus-visible:ring-fg disabled:cursor-default disabled:opacity-60"
          />
        </div>
        <div className="flex-1 text-center font-ui text-[13px] tracking-wide break-words text-dim">
          {computedTitle}
        </div>
        <div className="w-14" aria-hidden="true" />
      </div>

      {!minimized && tabs}

      <div
        ref={bodyRef}
        onScroll={onBodyScroll}
        className="flex-1 overflow-auto px-3 pt-2 pb-4 text-fg sm:px-4 sm:pt-3"
        aria-hidden={minimized ? true : undefined}
      >
        {lines.map((l, i) => (
          <div key={i} data-line-index={i}>
            <TerminalLine line={l} />
          </div>
        ))}
        {idle && (
          <div className="flex gap-2">
            <span className="shrink-0">
              <PromptText text={prompt} />
            </span>
            <span className="flex-1">
              <span className="animate-blink-cursor" aria-hidden="true" />
            </span>
          </div>
        )}
      </div>

      {!fullscreen && !minimized && (
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
