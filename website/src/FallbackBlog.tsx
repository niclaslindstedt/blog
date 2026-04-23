import { Link, useSearchParams } from "react-router-dom";
import type { Post } from "./types.ts";
import { useAudience } from "./AudienceContext.tsx";
import { FallbackShell } from "./FallbackShell.tsx";
import { fallbackHref, postsForAudience } from "./postFilters.ts";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toISOString().slice(0, 10);
  } catch {
    return iso;
  }
}

export function FallbackBlog({ posts, tag: tagProp }: { posts: Post[]; tag?: string }) {
  const { audience } = useAudience();
  const [params] = useSearchParams();
  const tag = tagProp ?? params.get("tag");

  const visible = postsForAudience(posts, audience).filter((p) => {
    if (!tag) return true;
    const v = p.versions[audience];
    return !!v && v.tags.includes(tag);
  });

  return (
    <FallbackShell>
      {tag && (
        <div className="mb-8 flex items-center gap-2 text-sm text-dim">
          <span>
            Filtering by tag <span className="text-fg-bright">#{tag}</span>
          </span>
          <Link to={fallbackHref("/")} className="underline decoration-dotted hover:text-fg">
            clear
          </Link>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-dim">
          {tag
            ? `No ${audience} posts tagged #${tag}.`
            : `No ${audience} posts yet — check back soon.`}
        </p>
      ) : (
        <ul className="flex flex-col gap-8">
          {visible.map((p) => {
            const v = p.versions[audience];
            if (!v) return null;
            return (
              <li key={p.slug} className="flex flex-col gap-2">
                <Link
                  to={fallbackHref(`/posts/${p.slug}`)}
                  className="text-lg leading-snug font-bold text-dim underline decoration-dotted hover:text-fg-bright"
                >
                  {v.title}
                </Link>
                <div className="text-xs text-dim">
                  <time dateTime={v.date}>{formatDate(v.date)}</time>
                </div>
                <p className="text-sm text-fg">{v.summary}</p>
                {v.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {v.tags.map((t) => (
                      <Link
                        key={t}
                        to={`/tags/${encodeURIComponent(t)}/`}
                        className="text-dim underline decoration-dotted hover:text-fg"
                      >
                        #{t}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </FallbackShell>
  );
}
