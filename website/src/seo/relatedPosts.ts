import type { Audience, Post } from "../types.ts";

// Related posts are precomputed at build time in `scripts/extract-posts.ts`
// using tag + keyword overlap; this helper just resolves the stored slug
// list to Post objects in the same order, skipping any slug that has
// disappeared (defensive — should not happen between an extract and a
// matching `posts.json` import in the same build).
export function relatedPosts(current: Post, audience: Audience, all: Post[]): Post[] {
  const slugs = current.versions[audience]?.related ?? [];
  if (slugs.length === 0) return [];
  const bySlug = new Map(all.map((p) => [p.slug, p]));
  const out: Post[] = [];
  for (const slug of slugs) {
    const p = bySlug.get(slug);
    if (p) out.push(p);
  }
  return out;
}
