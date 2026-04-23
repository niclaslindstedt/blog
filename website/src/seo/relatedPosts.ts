import type { Audience, Post } from "../types.ts";

// Score candidates by how many tags they share with the current post, break
// ties by recency (newer first), and drop anything that doesn't share at
// least one tag — three arbitrary posts at the bottom of every page is worse
// than no list at all. The scoring is deterministic so SSR + hydration don't
// disagree about which posts to show.
export function pickRelated(current: Post, audience: Audience, all: Post[], n = 3): Post[] {
  const currentTags = new Set(current.versions[audience]?.tags ?? []);
  if (currentTags.size === 0) return [];

  type Scored = { post: Post; overlap: number; date: string };
  const scored: Scored[] = [];
  for (const p of all) {
    if (p.slug === current.slug) continue;
    const v = p.versions[audience];
    if (!v) continue;
    let overlap = 0;
    for (const t of v.tags) if (currentTags.has(t)) overlap++;
    if (overlap === 0) continue;
    scored.push({ post: p, overlap, date: v.date });
  }

  scored.sort((a, b) => {
    if (b.overlap !== a.overlap) return b.overlap - a.overlap;
    return b.date.localeCompare(a.date);
  });

  return scored.slice(0, n).map((s) => s.post);
}
