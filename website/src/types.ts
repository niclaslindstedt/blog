export type Audience = "technical" | "non-technical";

export const AUDIENCES: readonly Audience[] = ["technical", "non-technical"] as const;

export const DEFAULT_AUDIENCE: Audience = "technical";

export function isAudience(value: unknown): value is Audience {
  return value === "technical" || value === "non-technical";
}

// External link surfaced at the top of a post. `highlight` is the one star
// reference the post is built around (at most one per audience version);
// `mention` covers everything else that's worth lifting out of the prose.
export type MentionType = "highlight" | "mention";

export const MENTION_TYPES: readonly MentionType[] = ["highlight", "mention"] as const;

export interface Mention {
  type: MentionType;
  title: string;
  description: string;
  link: string;
}

export interface PostVersion {
  title: string;
  date: string;
  edited_at: string;
  summary: string;
  tags: string[];
  // Optional, search-only synonym list. Not displayed; only fed into the
  // build-time search index. May be long (concepts + alternative phrasings
  // a reader might use) but should stay on a single comma-separated line.
  keywords: string[];
  // External references lifted to a panel above the body. May be empty.
  mentions: Mention[];
  body: string;
  wordCount: number;
  readingTimeMinutes: number;
  // Slugs of up to three posts in the same audience whose tags and keywords
  // overlap with this version, sorted by similarity. Computed at build time
  // by `scripts/extract-posts.ts`. Empty when nothing actually relates —
  // three arbitrary posts at the bottom of every page is worse than none.
  related: string[];
}

export interface Post {
  slug: string;
  // Earliest publication date across available versions — used for list sorting.
  date: string;
  // Display-fallback title (prefers the technical version when both exist).
  title: string;
  versions: Partial<Record<Audience, PostVersion>>;
}
