// Pure helpers for the build-time SEO generator: escaping, canonical URL
// resolution, <head> fragment assembly, and JSON-LD builders. Kept free of
// Node APIs and React so the functions are easy to reason about and the
// escaping can't silently regress.

import {
  AUTHOR,
  AUTHOR_SAME_AS,
  DEFAULT_OG_IMAGE,
  FEED_POST_LIMIT,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  SITE_DESCRIPTION,
  SITE_LANGUAGE,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  absoluteUrl,
} from "../../src/seo/siteConfig.ts";
import type { Post, PostVersion } from "../../src/types.ts";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// XML escaping is the same core set, but we also strip control chars that XML
// 1.0 forbids — stray 0x00-0x08 / 0x0B / 0x0C / 0x0E-0x1F bytes from editor
// artefacts will otherwise break a strict RSS/Atom parser.
export function escapeXml(s: string): string {
  let stripped = "";
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (
      code === 0x09 ||
      code === 0x0a ||
      code === 0x0d ||
      (code >= 0x20 && code !== 0xfffe && code !== 0xffff)
    ) {
      stripped += s[i];
    }
  }
  return stripped
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Pick the audience version the generator should use for meta tags.
// Technical wins when both exist — matches the tie-break extract-posts.ts uses
// for the display-fallback title, so meta and UI don't disagree.
export function pickPrimaryVersion(post: Post): PostVersion {
  const v = post.versions.technical ?? post.versions["non-technical"];
  if (!v) throw new Error(`post ${post.slug} has no audience versions`);
  return v;
}

export interface HeadMeta {
  title: string;
  description: string;
  canonicalPath: string;
  ogType: "website" | "article";
  ogImagePath?: string;
  keywords?: string[];
  article?: {
    publishedTime: string;
    modifiedTime: string;
    tags: string[];
  };
  jsonLd?: object | object[];
}

function metaTag(attrs: Record<string, string | number | undefined>): string {
  const parts = Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}="${escapeHtml(String(v))}"`);
  return `<meta ${parts.join(" ")} />`;
}

function linkTag(attrs: Record<string, string | undefined>): string {
  const parts = Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}="${escapeHtml(String(v))}"`);
  return `<link ${parts.join(" ")} />`;
}

// Build the full <head> fragment for a single route. Returns the string we
// splice into the Vite-generated index.html before the closing </head>.
export function renderHead(meta: HeadMeta): string {
  const title = meta.title;
  const desc = meta.description;
  const canonical = absoluteUrl(meta.canonicalPath);
  const image = absoluteUrl(meta.ogImagePath ?? DEFAULT_OG_IMAGE);
  const keywords = meta.keywords?.length ? meta.keywords.join(", ") : undefined;

  const lines: string[] = [];
  lines.push(`<title>${escapeHtml(title)}</title>`);
  lines.push(metaTag({ name: "description", content: desc }));
  if (keywords) lines.push(metaTag({ name: "keywords", content: keywords }));
  lines.push(linkTag({ rel: "canonical", href: canonical }));
  lines.push(metaTag({ name: "author", content: AUTHOR.name }));
  lines.push(metaTag({ name: "robots", content: "index,follow,max-image-preview:large" }));

  lines.push(metaTag({ property: "og:site_name", content: SITE_NAME }));
  lines.push(metaTag({ property: "og:locale", content: "en_US" }));
  lines.push(metaTag({ property: "og:type", content: meta.ogType }));
  lines.push(metaTag({ property: "og:title", content: title }));
  lines.push(metaTag({ property: "og:description", content: desc }));
  lines.push(metaTag({ property: "og:url", content: canonical }));
  lines.push(metaTag({ property: "og:image", content: image }));
  lines.push(metaTag({ property: "og:image:width", content: OG_IMAGE_WIDTH }));
  lines.push(metaTag({ property: "og:image:height", content: OG_IMAGE_HEIGHT }));
  lines.push(metaTag({ property: "og:image:alt", content: `${SITE_NAME} — ${SITE_TAGLINE}` }));

  if (meta.article) {
    lines.push(
      metaTag({ property: "article:published_time", content: meta.article.publishedTime }),
    );
    lines.push(metaTag({ property: "article:modified_time", content: meta.article.modifiedTime }));
    lines.push(metaTag({ property: "article:author", content: AUTHOR.url }));
    for (const tag of meta.article.tags) {
      lines.push(metaTag({ property: "article:tag", content: tag }));
    }
  }

  lines.push(metaTag({ name: "twitter:card", content: "summary_large_image" }));
  lines.push(metaTag({ name: "twitter:title", content: title }));
  lines.push(metaTag({ name: "twitter:description", content: desc }));
  lines.push(metaTag({ name: "twitter:image", content: image }));

  // Feed/sitemap discovery links are emitted once by the shell in
  // website/index.html — they're site-wide constants, so re-emitting them per
  // route just bloats the output.

  if (meta.jsonLd) {
    const payload = Array.isArray(meta.jsonLd) ? meta.jsonLd : [meta.jsonLd];
    for (const item of payload) {
      const json = JSON.stringify(item).replace(/</g, "\\u003c");
      lines.push(`<script type="application/ld+json">${json}</script>`);
    }
  }

  return lines.map((l) => `    ${l}`).join("\n");
}

export function homeJsonLd(posts: Post[]): object[] {
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE_URL}/#author`,
    name: AUTHOR.name,
    url: AUTHOR.url,
    sameAs: [...AUTHOR_SAME_AS],
  };
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: SITE_LANGUAGE,
    publisher: { "@id": `${SITE_URL}/#author` },
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/?tag={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
  const blog = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${SITE_URL}/#blog`,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: SITE_LANGUAGE,
    author: { "@id": `${SITE_URL}/#author` },
    publisher: { "@id": `${SITE_URL}/#author` },
    blogPost: posts.slice(0, FEED_POST_LIMIT).map((p) => {
      const v = pickPrimaryVersion(p);
      return {
        "@type": "BlogPosting",
        headline: v.title,
        url: absoluteUrl(`/posts/${p.slug}/`),
        datePublished: v.date,
        dateModified: v.edited_at,
        description: v.summary,
        keywords: v.tags.join(", "),
      };
    }),
  };
  return [person, website, blog];
}

export function postJsonLd(post: Post): object {
  const v = pickPrimaryVersion(post);
  const url = absoluteUrl(`/posts/${post.slug}/`);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#post`,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    headline: v.title,
    description: v.summary,
    datePublished: v.date,
    dateModified: v.edited_at,
    inLanguage: SITE_LANGUAGE,
    wordCount: v.wordCount,
    keywords: v.tags.join(", "),
    articleSection: v.tags,
    author: {
      "@type": "Person",
      name: AUTHOR.name,
      url: AUTHOR.url,
    },
    publisher: {
      "@type": "Person",
      name: AUTHOR.name,
      url: AUTHOR.url,
    },
    image: absoluteUrl(DEFAULT_OG_IMAGE),
  };
}

export function tagJsonLd(tag: string, posts: Post[]): object {
  const url = absoluteUrl(`/tags/${encodeURIComponent(tag)}/`);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    url,
    name: `Posts tagged #${tag}`,
    description: `${SITE_NAME} posts tagged #${tag}.`,
    inLanguage: SITE_LANGUAGE,
    about: tag,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    hasPart: posts.map((p) => {
      const v = pickPrimaryVersion(p);
      return {
        "@type": "BlogPosting",
        headline: v.title,
        url: absoluteUrl(`/posts/${p.slug}/`),
        datePublished: v.date,
        dateModified: v.edited_at,
        description: v.summary,
      };
    }),
  };
}

// Breadcrumb trail for a single post: Home › #<primary-tag> › <title>. Posts
// without tags get a two-item trail (Home › Title) so the BreadcrumbList is
// always valid — single-element lists are rejected by Google's validator.
export function postBreadcrumbJsonLd(post: Post): object {
  const v = pickPrimaryVersion(post);
  const items: { "@type": "ListItem"; position: number; name: string; item: string }[] = [
    { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
  ];
  const primaryTag = v.tags[0];
  if (primaryTag) {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: `#${primaryTag}`,
      item: absoluteUrl(`/tags/${encodeURIComponent(primaryTag)}/`),
    });
  }
  items.push({
    "@type": "ListItem",
    position: items.length + 1,
    name: v.title,
    item: absoluteUrl(`/posts/${post.slug}/`),
  });
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

// Breadcrumb for the all-tags index page: Home › Tags.
export function tagsIndexBreadcrumbJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Tags", item: `${SITE_URL}/tags/` },
    ],
  };
}

// CollectionPage listing every tag with its post count — powers /tags/.
export function tagsIndexJsonLd(tagCounts: { tag: string; count: number }[]): object {
  const url = `${SITE_URL}/tags/`;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    url,
    name: `All tags — ${SITE_NAME}`,
    description: `Every topic tag used across posts on ${SITE_NAME}.`,
    inLanguage: SITE_LANGUAGE,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    hasPart: tagCounts.map((t) => ({
      "@type": "CollectionPage",
      name: `#${t.tag}`,
      url: absoluteUrl(`/tags/${encodeURIComponent(t.tag)}/`),
    })),
  };
}
