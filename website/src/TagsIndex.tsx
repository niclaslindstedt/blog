import { Link } from "react-router-dom";
import type { Post } from "./types.ts";
import { useAudience } from "./AudienceContext.tsx";
import { FallbackShell } from "./FallbackShell.tsx";
import { fallbackHref } from "./postFilters.ts";
import { usePageTitle } from "./seo/usePageTitle.ts";
import { SITE_NAME } from "./seo/siteConfig.ts";

// Aggregates every tag used across the currently-visible audience, sorted by
// post count desc with alphabetical tie-break. Mirrors the sort the generator
// uses for the static /tags/index.html so hydration matches.
function collectTagCounts(posts: Post[], audience: "technical" | "non-technical") {
  const counts = new Map<string, number>();
  for (const p of posts) {
    const v = p.versions[audience];
    if (!v) continue;
    for (const t of v.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function TagsIndex({ posts }: { posts: Post[] }) {
  const { audience } = useAudience();
  usePageTitle(`All tags — ${SITE_NAME}`);
  const tagCounts = collectTagCounts(posts, audience);

  return (
    <FallbackShell>
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-dim">
        <Link to={fallbackHref("/")} className="underline decoration-dotted hover:text-fg">
          Home
        </Link>
        {" › "}
        <span className="text-fg">Tags</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-fg-bright">All tags</h1>

      {tagCounts.length === 0 ? (
        <p className="text-dim">No tags yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {tagCounts.map(({ tag, count }) => (
            <li key={tag}>
              <Link
                to={`/tags/${encodeURIComponent(tag)}/`}
                className="text-dim underline decoration-dotted hover:text-fg-bright"
              >
                #{tag}
              </Link>
              <span className="ml-1 text-xs text-dim">({count})</span>
            </li>
          ))}
        </ul>
      )}
    </FallbackShell>
  );
}
