export type Audience = "technical" | "non-technical";

export const AUDIENCES: readonly Audience[] = ["technical", "non-technical"] as const;

export const DEFAULT_AUDIENCE: Audience = "technical";

export function isAudience(value: unknown): value is Audience {
  return value === "technical" || value === "non-technical";
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
  body: string;
  wordCount: number;
  readingTimeMinutes: number;
}

export interface Post {
  slug: string;
  // Earliest publication date across available versions — used for list sorting.
  date: string;
  // Display-fallback title (prefers the technical version when both exist).
  title: string;
  versions: Partial<Record<Audience, PostVersion>>;
}
