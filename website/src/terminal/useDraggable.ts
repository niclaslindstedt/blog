import type { PointerEvent as ReactPointerEvent } from "react";
import { clamp, startPointerCapture } from "./pointerCapture.ts";

export interface UseDraggableOpts {
  pos: { x: number; y: number };
  size: { width: number; height: number };
  enabled: boolean;
  onChange: (pos: { x: number; y: number }) => void;
  onDraggingChange?: (dragging: boolean) => void;
  // CSS selector; if the pointerdown target is inside a matching ancestor,
  // the drag is suppressed. Used to opt out of dragging on child controls
  // (e.g. the traffic-light buttons inside a draggable titlebar).
  ignoreSelector?: string;
}

// Returns a pointerdown handler that drags the element within the viewport.
// Computed max bounds are snapshotted at pointerdown, so a window-resize
// during an active drag won't shift the element under the cursor.
export function useDraggable({
  pos,
  size,
  enabled,
  onChange,
  onDraggingChange,
  ignoreSelector,
}: UseDraggableOpts): (e: ReactPointerEvent<HTMLElement>) => void {
  return (e) => {
    if (!enabled) return;
    if (ignoreSelector && (e.target as HTMLElement).closest(ignoreSelector)) return;
    const origin = { x: pos.x, y: pos.y };
    const { width, height } = size;
    onDraggingChange?.(true);
    startPointerCapture(
      e,
      ({ dx, dy }) => {
        const maxX = Math.max(0, window.innerWidth - width);
        const maxY = Math.max(0, window.innerHeight - height);
        onChange({ x: clamp(origin.x + dx, 0, maxX), y: clamp(origin.y + dy, 0, maxY) });
      },
      () => onDraggingChange?.(false),
    );
  };
}
