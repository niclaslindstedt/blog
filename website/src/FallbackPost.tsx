import { Link, useParams } from "react-router-dom";
import type { Audience, Post } from "./types.ts";
import { useAudience } from "./AudienceContext.tsx";
import { FallbackShell } from "./FallbackShell.tsx";
import { MarkdownBody, MentionsPanel } from "./terminal/index.ts";
import { fallbackHref } from "./postFilters.ts";
import { usePageTitle } from "./seo/usePageTitle.ts";
import { SITE_NAME } from "./seo/siteConfig.ts";
import { relatedPosts } from "./seo/relatedPosts.ts";
import { useDateFormatter } from "./formatDate.ts";

export function FallbackPost({ posts }: { posts: Post[] }) {
  const { slug } = useParams<{ slug: string }>();
  const { audience, setAudience } = useAudience();
  const post = posts.find((p) => p.slug === slug);
  const version = post && slug ? post.versions[audience] : undefined;
  const formatDate = useDateFormatter();
  const titleForTab =
    version?.title ?? post?.title ?? (slug ? `Post not found — ${SITE_NAME}` : SITE_NAME);
  usePageTitle(version ? `${titleForTab} — ${SITE_NAME}` : titleForTab);

  if (!post || !slug) {
    return (
      <FallbackShell>
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold text-fg-bright">Post not found</h1>
          <p className="text-dim">
            There's no post at <code className="text-fg">/posts/{slug}</code>.
          </p>
          <Link
            to={fallbackHref("/")}
            className="text-fg underline decoration-dotted hover:text-accent"
          >
            Back to all posts
          </Link>
        </div>
      </FallbackShell>
    );
  }

  if (!version) {
    const other: Audience = audience === "technical" ? "non-technical" : "technical";
    const hasOther = !!post.versions[other];
    return (
      <FallbackShell>
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold text-fg-bright">{post.title || slug}</h1>
          <p className="text-dim">No {audience} version of this post.</p>
          {hasOther && (
            <button
              type="button"
              onClick={() => setAudience(other)}
              className="self-start cursor-pointer bg-transparent p-0 text-fg underline decoration-dotted hover:text-accent"
            >
              Read the {other} version
            </button>
          )}
          <Link
            to={fallbackHref("/")}
            className="text-dim underline decoration-dotted hover:text-fg"
          >
            Back to all posts
          </Link>
        </div>
      </FallbackShell>
    );
  }

  const edited = version.edited_at && version.edited_at !== version.date;
  const primaryTag = version.tags[0];
  const related = relatedPosts(post, audience, posts);

  return (
    <FallbackShell>
      <nav aria-label="Breadcrumb" className="-mt-4 mb-4 text-xs text-dim">
        <Link to={fallbackHref("/")} className="underline decoration-dotted hover:text-fg">
          Home
        </Link>
        {primaryTag && (
          <>
            {" › "}
            <Link
              to={`/tags/${encodeURIComponent(primaryTag)}/`}
              className="underline decoration-dotted hover:text-fg"
            >
              #{primaryTag}
            </Link>
          </>
        )}
        {" › "}
        <span className="text-fg">{version.title}</span>
      </nav>

      {/* No Microdata (itemScope / itemProp) here: the same BlogPosting fields
          ride along in the per-post JSON-LD block emitted by the SEO
          generator. Two parallel encodings of the same metadata is just a
          drift risk — Google reads the JSON-LD, which is the modern
          recommended form. */}
      <article>
        <header className="mb-8">
          <h1 className="mb-3 text-3xl leading-tight font-bold text-fg-bright">{version.title}</h1>
          <div className="text-sm text-dim">
            <time dateTime={version.date}>{formatDate(version.date)}</time>
            {edited && (
              <>
                {" · edited "}
                <time dateTime={version.edited_at}>{formatDate(version.edited_at)}</time>
              </>
            )}
            {" · "}
            <span>{version.readingTimeMinutes} min read</span>
          </div>
        </header>

        <MentionsPanel mentions={version.mentions} variant="prose" />

        <div className="text-fg">
          <MarkdownBody text={version.body} variant="prose" />
        </div>

        {version.tags.length > 0 && (
          <footer className="-mb-7 mt-10 flex flex-wrap gap-2 border-t border-term-border pt-5 text-sm">
            {version.tags.map((t) => (
              <Link
                key={t}
                to={`/tags/${encodeURIComponent(t)}/`}
                className="text-dim underline decoration-dotted hover:text-fg"
              >
                #{t}
              </Link>
            ))}
          </footer>
        )}
      </article>

      {related.length > 0 && (
        <aside
          className="-mb-7 mt-12 border-t border-term-border pt-5"
          aria-labelledby="related-heading"
        >
          <h2 id="related-heading" className="mb-3 text-sm font-bold text-dim uppercase">
            Related posts
          </h2>
          <ul className="flex flex-col gap-3">
            {related.map((r) => {
              const rv = r.versions[audience];
              if (!rv) return null;
              return (
                <li key={r.slug}>
                  <Link
                    to={fallbackHref(`/posts/${r.slug}`)}
                    rel="related"
                    className="text-dim underline decoration-dotted hover:text-fg-bright"
                  >
                    {rv.title}
                  </Link>
                  <div className="text-xs text-dim">
                    <time dateTime={rv.date}>{formatDate(rv.date)}</time>
                    {" · "}
                    {rv.readingTimeMinutes} min read
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>
      )}
    </FallbackShell>
  );
}
