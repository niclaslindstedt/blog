// Post-build SEO generator. Runs after `vite build`; takes the single SPA
// shell (dist/index.html) plus the canonical post data (src/generated/posts.json)
// and emits:
//   - dist/index.html                          (homepage, with homepage <head>)
//   - dist/posts/<slug>/index.html             (per-post, with BlogPosting meta)
//   - dist/tags/<tag>/index.html               (per-tag, with CollectionPage)
//   - dist/404.html                            (SPA fallback copy of home)
//   - dist/sitemap.xml
//   - dist/robots.txt
//   - dist/feed.xml                            (RSS 2.0, summary-level)
//   - dist/feed.atom                           (Atom 1.0, summary-level)
//
// The generator only touches <head>: the body stays as Vite emitted it, so
// React hydrates without hitches. Social-card crawlers and search engines get
// pre-rendered metadata; humans get the SPA they already had.

import fs from "node:fs";
import path from "node:path";
import type { Post } from "../src/types.ts";
import {
  ATOM_PATH,
  AUTHOR,
  DEFAULT_KEYWORDS,
  FEED_POST_LIMIT,
  RSS_PATH,
  SITEMAP_PATH,
  SITE_DESCRIPTION,
  SITE_LANGUAGE,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  absoluteUrl,
  postOgImagePath,
} from "../src/seo/siteConfig.ts";
import { renderOgImage } from "./seo/ogImage.ts";
import {
  escapeXml,
  homeJsonLd,
  pickPrimaryVersion,
  postBreadcrumbJsonLd,
  postJsonLd,
  renderHead,
  tagJsonLd,
  tagsIndexBreadcrumbJsonLd,
  tagsIndexJsonLd,
} from "./seo/meta.ts";

const DIST = path.resolve("dist");
const POSTS_JSON = path.resolve("src", "generated", "posts.json");
const posts = JSON.parse(fs.readFileSync(POSTS_JSON, "utf8")) as Post[];

function readShell(): string {
  const p = path.join(DIST, "index.html");
  if (!fs.existsSync(p)) {
    throw new Error(`generate-seo: ${p} is missing — run vite build first`);
  }
  return fs.readFileSync(p, "utf8");
}

// Splice the generated meta block before </head>. Also strip the placeholder
// <title>/<meta name="description"> that the shell ships with so we don't end
// up with two titles — per-route values replace the site-wide defaults.
function injectHead(shell: string, headFragment: string): string {
  const stripped = shell
    .replace(/\n\s*<title>[\s\S]*?<\/title>/g, "")
    .replace(/\n\s*<meta\s+name="description"[\s\S]*?\/>/g, "");
  const idx = stripped.indexOf("</head>");
  if (idx === -1) throw new Error("generate-seo: shell has no </head>");
  return stripped.slice(0, idx) + "\n" + headFragment + "\n  " + stripped.slice(idx);
}

function writeFile(rel: string, body: string | Buffer): void {
  const full = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, body);
}

function collectTags(): Map<string, Post[]> {
  const byTag = new Map<string, Post[]>();
  for (const p of posts) {
    const v = pickPrimaryVersion(p);
    for (const t of v.tags) {
      const list = byTag.get(t) ?? [];
      list.push(p);
      byTag.set(t, list);
    }
  }
  return byTag;
}

function maxEditedAt(list: Post[]): string {
  let max = "";
  for (const p of list) {
    const v = pickPrimaryVersion(p);
    if (v.edited_at > max) max = v.edited_at;
  }
  return max || new Date().toISOString();
}

// -- Homepage ---------------------------------------------------------------

function renderHome(shell: string): string {
  const topTags = [...collectTags().keys()].slice(0, 20);
  const head = renderHead({
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    canonicalPath: "/",
    ogType: "website",
    keywords: [...DEFAULT_KEYWORDS, ...topTags],
    jsonLd: homeJsonLd(posts),
  });
  return injectHead(shell, head);
}

// -- Per-post ---------------------------------------------------------------

function renderPost(shell: string, post: Post): string {
  const v = pickPrimaryVersion(post);
  const head = renderHead({
    title: `${v.title} — ${SITE_NAME}`,
    description: v.summary,
    canonicalPath: `/posts/${post.slug}/`,
    ogType: "article",
    ogImagePath: postOgImagePath(post.slug),
    keywords: [...v.tags, ...DEFAULT_KEYWORDS.slice(0, 3)],
    article: {
      publishedTime: v.date,
      modifiedTime: v.edited_at,
      tags: v.tags,
    },
    jsonLd: [postJsonLd(post), postBreadcrumbJsonLd(post)],
  });
  return injectHead(shell, head);
}

// -- Per-tag ----------------------------------------------------------------

function renderTag(shell: string, tag: string, tagPosts: Post[]): string {
  const head = renderHead({
    title: `Posts tagged #${tag} — ${SITE_NAME}`,
    description: `${SITE_NAME} posts tagged #${tag}. ${SITE_DESCRIPTION}`,
    canonicalPath: `/tags/${encodeURIComponent(tag)}/`,
    ogType: "website",
    keywords: [tag, ...DEFAULT_KEYWORDS],
    jsonLd: tagJsonLd(tag, tagPosts),
  });
  return injectHead(shell, head);
}

// -- Tags index -------------------------------------------------------------

function renderTagsIndex(shell: string, tagCounts: { tag: string; count: number }[]): string {
  const head = renderHead({
    title: `All tags — ${SITE_NAME}`,
    description: `Every topic tag used across posts on ${SITE_NAME}.`,
    canonicalPath: `/tags/`,
    ogType: "website",
    keywords: [...DEFAULT_KEYWORDS, ...tagCounts.slice(0, 10).map((t) => t.tag)],
    jsonLd: [tagsIndexJsonLd(tagCounts), tagsIndexBreadcrumbJsonLd()],
  });
  return injectHead(shell, head);
}

// -- Sitemap ----------------------------------------------------------------

function renderSitemap(): string {
  const tags = collectTags();
  const urls: { loc: string; lastmod: string; changefreq: string; priority: string }[] = [];

  urls.push({
    loc: absoluteUrl("/"),
    lastmod: posts.length ? maxEditedAt(posts) : new Date().toISOString(),
    changefreq: "weekly",
    priority: "1.0",
  });

  for (const p of posts) {
    const v = pickPrimaryVersion(p);
    urls.push({
      loc: absoluteUrl(`/posts/${p.slug}/`),
      lastmod: v.edited_at,
      changefreq: "monthly",
      priority: "0.8",
    });
  }

  if (tags.size > 0) {
    const allPosts = [...tags.values()].flat();
    urls.push({
      loc: absoluteUrl(`/tags/`),
      lastmod: maxEditedAt(allPosts),
      changefreq: "weekly",
      priority: "0.6",
    });
  }

  for (const [tag, list] of tags) {
    urls.push({
      loc: absoluteUrl(`/tags/${encodeURIComponent(tag)}/`),
      lastmod: maxEditedAt(list),
      changefreq: "weekly",
      priority: "0.5",
    });
  }

  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    <lastmod>${escapeXml(u.lastmod)}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

// -- robots.txt -------------------------------------------------------------

function renderRobots(): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${absoluteUrl(SITEMAP_PATH)}\n`;
}

// -- Shared feed item -------------------------------------------------------

function rfc822(iso: string): string {
  return new Date(iso).toUTCString();
}

// Per-post data needed by both RSS and Atom, pre-escaped once. A single source
// of truth for "which posts are in the feed, and what do they look like" means
// a fix to escaping, date formatting, or URL shape lands in both feeds at once.
interface FeedItem {
  title: string;
  url: string;
  summary: string;
  authorName: string;
  authorUrl: string;
  publishedRfc822: string;
  publishedIso: string;
  updatedIso: string;
  categories: string[];
}

function feedItems(): FeedItem[] {
  return posts.slice(0, FEED_POST_LIMIT).map((p) => {
    const v = pickPrimaryVersion(p);
    const url = absoluteUrl(`/posts/${p.slug}/`);
    return {
      title: escapeXml(v.title),
      url: escapeXml(url),
      summary: escapeXml(v.summary),
      authorName: escapeXml(AUTHOR.name),
      authorUrl: escapeXml(AUTHOR.url),
      publishedRfc822: escapeXml(rfc822(v.date)),
      publishedIso: escapeXml(v.date),
      updatedIso: escapeXml(v.edited_at),
      categories: v.tags.map((t) => escapeXml(t)),
    };
  });
}

function feedUpdatedIso(items: FeedItem[]): string {
  if (items.length === 0) return new Date().toISOString();
  const latest = posts.slice(0, FEED_POST_LIMIT)[0];
  return pickPrimaryVersion(latest).edited_at;
}

// -- RSS 2.0 ----------------------------------------------------------------

function renderRss(): string {
  const items = feedItems();
  const lastBuild = escapeXml(rfc822(feedUpdatedIso(items)));

  const body = items
    .map((it) =>
      [
        "    <item>",
        `      <title>${it.title}</title>`,
        `      <link>${it.url}</link>`,
        `      <guid isPermaLink="true">${it.url}</guid>`,
        `      <pubDate>${it.publishedRfc822}</pubDate>`,
        `      <description>${it.summary}</description>`,
        ...it.categories.map((c) => `      <category>${c}</category>`),
        `      <dc:creator>${it.authorName}</dc:creator>`,
        "    </item>",
      ].join("\n"),
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${escapeXml(SITE_URL + "/")}</link>
    <atom:link href="${escapeXml(absoluteUrl(RSS_PATH))}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>${SITE_LANGUAGE}</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <generator>blog.niclaslindstedt.se</generator>
${body}
  </channel>
</rss>
`;
}

// -- Atom 1.0 ---------------------------------------------------------------

function renderAtom(): string {
  const items = feedItems();
  const updated = escapeXml(feedUpdatedIso(items));

  const body = items
    .map((it) =>
      [
        "  <entry>",
        `    <id>${it.url}</id>`,
        `    <title>${it.title}</title>`,
        `    <link rel="alternate" type="text/html" href="${it.url}" />`,
        `    <published>${it.publishedIso}</published>`,
        `    <updated>${it.updatedIso}</updated>`,
        `    <author><name>${it.authorName}</name><uri>${it.authorUrl}</uri></author>`,
        `    <summary type="text">${it.summary}</summary>`,
        ...it.categories.map((c) => `    <category term="${c}" />`),
        "  </entry>",
      ].join("\n"),
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${escapeXml(SITE_URL + "/")}</id>
  <title>${escapeXml(SITE_NAME)}</title>
  <subtitle>${escapeXml(SITE_TAGLINE)}</subtitle>
  <link rel="self" type="application/atom+xml" href="${escapeXml(absoluteUrl(ATOM_PATH))}" />
  <link rel="alternate" type="text/html" href="${escapeXml(SITE_URL + "/")}" />
  <updated>${updated}</updated>
  <author><name>${escapeXml(AUTHOR.name)}</name><uri>${escapeXml(AUTHOR.url)}</uri></author>
  <generator uri="${escapeXml(SITE_URL)}">blog.niclaslindstedt.se</generator>
${body}
</feed>
`;
}

// -- Main -------------------------------------------------------------------

async function main(): Promise<void> {
  const shell = readShell();
  const tags = collectTags();

  const home = renderHome(shell);
  writeFile("index.html", home);
  writeFile("404.html", home);

  for (const post of posts) {
    writeFile(path.join("posts", post.slug, "index.html"), renderPost(shell, post));
  }

  for (const [tag, tagPosts] of tags) {
    writeFile(path.join("tags", tag, "index.html"), renderTag(shell, tag, tagPosts));
  }

  const tagCounts = [...tags.entries()]
    .map(([tag, list]) => ({ tag, count: list.length }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  if (tagCounts.length > 0) {
    writeFile(path.join("tags", "index.html"), renderTagsIndex(shell, tagCounts));
  }

  // Per-post OG cards. Rendered serially because wawoff2 (inside ogImage.ts)
  // isn't re-entrant; with a 2-figure post count the sequential cost is
  // negligible, and serial output keeps the generator's log readable.
  for (const post of posts) {
    const png = await renderOgImage(post);
    writeFile(path.join("og", `${post.slug}.png`), png);
  }

  writeFile("sitemap.xml", renderSitemap());
  writeFile("robots.txt", renderRobots());
  writeFile("feed.xml", renderRss());
  writeFile("feed.atom", renderAtom());

  process.stderr.write(
    `generate-seo: wrote homepage + ${posts.length} post page(s) + ${tags.size} tag page(s) + tags index + ${posts.length} OG image(s), sitemap, robots, RSS + Atom feeds\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`generate-seo: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
