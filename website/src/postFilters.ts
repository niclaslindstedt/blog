import type { Audience, Post } from "./types.ts";

export function postsForAudience(posts: Post[], audience: Audience): Post[] {
  return posts.filter((p) => p.versions[audience]);
}

// Merge/remove the `view` param without trampling sibling params (e.g. `?tag=…`).
// `null` removes it; any non-null value sets it. Returns a leading-`?` string or
// the empty string so callers can concatenate onto a pathname.
export function withViewParam(search: string, view: "blog" | "terminal" | null): string {
  const p = new URLSearchParams(search);
  if (view) p.set("view", view);
  else p.delete("view");
  const s = p.toString();
  return s ? `?${s}` : "";
}

// Build a fallback-mode href that always carries `?view=blog` and merges any
// extra params alongside it. Keeps every internal link inside the fallback
// sticky so navigation doesn't accidentally drop the reader back to the
// terminal.
export function fallbackHref(pathname: string, extra?: Record<string, string>): string {
  const p = new URLSearchParams();
  p.set("view", "blog");
  if (extra) {
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
  }
  return `${pathname}?${p.toString()}`;
}
