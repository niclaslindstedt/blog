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
  body: string;
}

export interface Post {
  slug: string;
  // Earliest publication date across available versions — used for list sorting.
  date: string;
  // Display-fallback title (prefers the technical version when both exist).
  title: string;
  versions: Partial<Record<Audience, PostVersion>>;
}
