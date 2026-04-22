import { Link, useParams } from "react-router-dom";
import type { Audience, Post } from "./types.ts";
import { useAudience } from "./AudienceContext.tsx";
import { FallbackShell } from "./FallbackShell.tsx";
import { MarkdownBody } from "./terminal/MarkdownBody.tsx";
import { fallbackHref } from "./postFilters.ts";
import { usePageTitle } from "./seo/usePageTitle.ts";
import { SITE_NAME } from "./seo/siteConfig.ts";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toISOString().slice(0, 10);
  } catch {
    return iso;
  }
}

export function FallbackPost({ posts }: { posts: Post[] }) {
  const { slug } = useParams<{ slug: string }>();
  const { audience, setAudience } = useAudience();
  const post = posts.find((p) => p.slug === slug);
  const version = post && slug ? post.versions[audience] : undefined;
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

  return (
    <FallbackShell>
      <article itemScope itemType="https://schema.org/BlogPosting">
        <header className="mb-8">
          <h1
            className="mb-3 text-3xl leading-tight font-bold text-fg-bright"
            itemProp="headline name"
          >
            {version.title}
          </h1>
          <div className="text-sm text-dim">
            <time dateTime={version.date} itemProp="datePublished">
              {formatDate(version.date)}
            </time>
            {edited && (
              <>
                {" · edited "}
                <time dateTime={version.edited_at} itemProp="dateModified">
                  {formatDate(version.edited_at)}
                </time>
              </>
            )}
          </div>
          <meta itemProp="description" content={version.summary} />
          <meta itemProp="wordCount" content={String(version.wordCount)} />
          <meta itemProp="inLanguage" content="en" />
          <span itemProp="author" itemScope itemType="https://schema.org/Person">
            <meta itemProp="name" content="Niclas Lindstedt" />
            <meta itemProp="url" content="https://niclaslindstedt.se" />
          </span>
        </header>

        <div className="text-fg" itemProp="articleBody">
          <MarkdownBody text={version.body} variant="prose" />
        </div>

        {version.tags.length > 0 && (
          <footer className="mt-10 flex flex-wrap gap-2 border-t border-term-border pt-5 text-sm">
            {version.tags.map((t) => (
              <Link
                key={t}
                to={`/tags/${encodeURIComponent(t)}/`}
                className="text-dim underline decoration-dotted hover:text-fg"
                itemProp="keywords"
              >
                #{t}
              </Link>
            ))}
          </footer>
        )}
      </article>
    </FallbackShell>
  );
}
