import type { PointerEvent as ReactPointerEvent } from "react";
import { clamp, startPointerCapture } from "./pointerCapture.ts";

export interface UseResizableOpts {
  pos: { x: number; y: number };
  size: { width: number; height: number };
  min: { width: number; height: number };
  enabled: boolean;
  onChange: (size: { width: number; height: number }) => void;
  onResizingChange?: (resizing: boolean) => void;
}

// Returns a pointerdown handler that resizes the element from its bottom-right
// corner. The top-left position is held fixed (resize grows the element), and
// the size is clamped between `min` and the distance from the origin to the
// viewport edge so the element can't be dragged out of view.
export function useResizable({
  pos,
  size,
  min,
  enabled,
  onChange,
  onResizingChange,
}: UseResizableOpts): (e: ReactPointerEvent<HTMLElement>) => void {
  return (e) => {
    if (!enabled) return;
    e.stopPropagation();
    const origin = { x: pos.x, y: pos.y };
    const start = { width: size.width, height: size.height };
    onResizingChange?.(true);
    startPointerCapture(
      e,
      ({ dx, dy }) => {
        const maxW = Math.max(min.width, window.innerWidth - origin.x);
        const maxH = Math.max(min.height, window.innerHeight - origin.y);
        onChange({
          width: clamp(start.width + dx, min.width, maxW),
          height: clamp(start.height + dy, min.height, maxH),
        });
      },
      () => onResizingChange?.(false),
    );
  };
}
