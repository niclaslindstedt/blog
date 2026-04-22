// Single source of truth for every copy string and URL that appears in <title>,
// meta descriptions, Open Graph / Twitter tags, JSON-LD, robots.txt, the RSS
// and Atom feeds, and the sitemap. Both the client (via Helmet) and the
// post-build `generate-seo.ts` script import from here, so tweaking the site's
// pitch is a one-file change.

export const SITE_URL = "https://blog.niclaslindstedt.se";

export const SITE_NAME = "Niclas Lindstedt's blog";
export const SITE_SHORT_NAME = "niclaslindstedt";

export const SITE_TAGLINE = "AI, agents, and open source";

export const SITE_DESCRIPTION =
  "Writing about AI, agents, and open source — hands-on notes from building tools like zag, zad, ztf, zig, and oss-spec.";

export const SITE_LANGUAGE = "en";

export const AUTHOR = {
  name: "Niclas Lindstedt",
  url: "https://niclaslindstedt.se",
  github: "https://github.com/niclaslindstedt",
} as const;

export const DEFAULT_OG_IMAGE = "/og-default.png";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

// Broad topic keywords that always describe the site, independent of which
// posts exist. The generator merges these with the union of every post's tags
// for the homepage and with a post's own tags for each post page.
export const DEFAULT_KEYWORDS: readonly string[] = [
  "AI",
  "agents",
  "open source",
  "developer tools",
  "Claude",
  "Rust",
  "TypeScript",
  "Niclas Lindstedt",
];

// Feed filenames — kept as constants so <link rel="alternate"> URLs and the
// generator's output paths can't drift.
export const RSS_PATH = "/feed.xml";
export const ATOM_PATH = "/feed.atom";
export const SITEMAP_PATH = "/sitemap.xml";

// Number of posts to include in the RSS/Atom feed and in the homepage JSON-LD.
export const FEED_POST_LIMIT = 20;

export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = SITE_URL.replace(/\/$/, "");
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${path}`;
}
