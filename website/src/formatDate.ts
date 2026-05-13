import { useIsHydrated } from "./useIsHydrated.ts";

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

// `YYYY-MM-DD HH:mm` in UTC. Used during SSR and the first client render so
// the prerendered HTML in `dist/posts/<slug>/index.html` is timezone-stable —
// crawlers, feed readers, and no-JS visitors all see the same authoritative
// UTC label.
export function formatDateUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  );
}

// `YYYY-MM-DD HH:mm` in the reader's local timezone. Used after hydration so
// the visible label matches the wall clock the reader is reading by, without
// forcing them to do UTC math in their head.
export function formatDateLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

// Pick the formatter for the current render: UTC while the SSR markup is
// still on screen (so hydration matches byte-for-byte), local once mounted.
export function useDateFormatter(): (iso: string) => string {
  return useIsHydrated() ? formatDateLocal : formatDateUtc;
}
