import type { PointerEvent as ReactPointerEvent } from "react";

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// Subscribes window-level pointermove/pointerup listeners for the duration of
// a single pointer gesture started by `e`. `onMove` receives cumulative delta
// from the initial pointerdown position; `onEnd` fires once, after cleanup, on
// pointerup. Suitable for drag/resize handlers that need to track movement
// outside the element the pointerdown started on.
export function startPointerCapture(
  e: ReactPointerEvent<HTMLElement>,
  onMove: (delta: { dx: number; dy: number }) => void,
  onEnd?: () => void,
): void {
  e.preventDefault();
  const startX = e.clientX;
  const startY = e.clientY;
  const handleMove = (ev: PointerEvent) =>
    onMove({ dx: ev.clientX - startX, dy: ev.clientY - startY });
  // `pointercancel` covers the mobile case where the OS/browser hijacks the
  // gesture (system back-swipe, scroll intervention): `pointerup` never
  // fires, so without handling cancel we'd leak the move listener and
  // leave callers stuck in their dragging/resizing state.
  const handleEnd = () => {
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", handleEnd);
    window.removeEventListener("pointercancel", handleEnd);
    onEnd?.();
  };
  window.addEventListener("pointermove", handleMove);
  window.addEventListener("pointerup", handleEnd);
  window.addEventListener("pointercancel", handleEnd);
}
