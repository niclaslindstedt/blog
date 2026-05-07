// Shared search helpers used by both the build-time index generator
// (`scripts/build-search-index.ts`) and the runtime modal
// (`SearchModal.tsx`). Keeping the algorithm in one place ensures the
// indexed text and the query path agree on tokenization, so a query that
// matches at runtime is the same query the index was built for.

import type { Audience } from "./types.ts";

export interface SearchEntry {
  slug: string;
  audience: Audience;
  title: string;
  summary: string;
  tags: string[];
  keywords: string[];
  // Markdown-stripped, normalized prose body.
  bodyText: string;
  // Deduped union of normalized tokens across every searchable field.
  // Used for a fast first-pass filter before the full per-field scorer runs.
  tokens: string[];
}

export interface SearchIndex {
  version: number;
  entries: SearchEntry[];
}

export interface ScoredEntry {
  entry: SearchEntry;
  score: number;
}

export type SearchMode = "and" | "or";

// Strip markdown syntax for word counting and search indexing. Mirrors what
// a reader actually sees as prose, not the raw source: code fences, inline
// code, raw HTML, image refs, and markdown punctuation are removed; link
// text is kept (the URL is dropped). The output is intentionally lossy.
export function stripMarkdown(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~-]+/g, " ");
}

// Lowercase, strip diacritics, collapse non-alphanumerics to single spaces.
// `cv,resume` and `CV résumé` both normalize to `cv resume`. Diacritic
// stripping uses the Unicode combining-marks range explicitly so the source
// file stays ASCII-clean.
const COMBINING_MARKS = /[̀-ͯ]/g;
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function tokenize(s: string): string[] {
  const n = normalize(s);
  if (!n) return [];
  return n.split(/\s+/);
}

// Per-token field weights. Title beats keywords beats tags beats summary
// beats body. Body hits cap at 3 so a 50-mention post doesn't drown out a
// well-titled match.
const FIELD_WEIGHTS = {
  title: 10,
  keywords: 6,
  tags: 4,
  summary: 3,
} as const;
const BODY_HIT_CAP = 3;

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let i = 0;
  while ((i = haystack.indexOf(needle, i)) !== -1) {
    count += 1;
    i += needle.length;
  }
  return count;
}

// Score a single entry against a list of pre-tokenized query terms.
// Returns null when `mode === "and"` and any query token failed to hit any
// field — that's the AND gate. In `"or"` mode any non-zero score is
// returned.
export function scoreEntry(
  entry: SearchEntry,
  queryTokens: string[],
  mode: SearchMode,
): number | null {
  if (queryTokens.length === 0) return null;

  const titleN = normalize(entry.title);
  const summaryN = normalize(entry.summary);
  const tagsN = entry.tags.map(normalize);
  const keywordsN = entry.keywords.map(normalize);
  // bodyText is stored already-normalized.

  let total = 0;
  let anyHit = false;

  for (const t of queryTokens) {
    let tokenScore = 0;
    if (titleN.includes(t)) tokenScore += FIELD_WEIGHTS.title;
    if (keywordsN.some((k) => k.includes(t))) tokenScore += FIELD_WEIGHTS.keywords;
    if (tagsN.some((tag) => tag.includes(t))) tokenScore += FIELD_WEIGHTS.tags;
    if (summaryN.includes(t)) tokenScore += FIELD_WEIGHTS.summary;
    const bodyHits = countOccurrences(entry.bodyText, t);
    tokenScore += Math.min(bodyHits, BODY_HIT_CAP);

    if (tokenScore === 0) {
      if (mode === "and") return null;
    } else {
      anyHit = true;
    }
    total += tokenScore;
  }

  if (!anyHit) return null;
  return total;
}

export function searchAll(entries: SearchEntry[], query: string, mode: SearchMode): ScoredEntry[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const scored: ScoredEntry[] = [];
  for (const entry of entries) {
    const score = scoreEntry(entry, queryTokens, mode);
    if (score !== null) scored.push({ entry, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

export interface Snippet {
  before: string;
  match: string;
  after: string;
}

const SNIPPET_RADIUS = 100;

// Find the first occurrence of any matched query token in the body and
// build a single short snippet around it. Snaps to whitespace boundaries
// so words aren't cut in half. Returns null when no body match exists; the
// caller is expected to fall back to summary text.
export function snippet(bodyText: string, queryTokens: string[]): Snippet | null {
  if (!bodyText || queryTokens.length === 0) return null;

  // Try the longest token first — it's the most distinctive and gives the
  // best snippet. Tie-break on first appearance order.
  const sorted = [...queryTokens].sort((a, b) => b.length - a.length);

  let bestIdx = -1;
  let bestToken = "";
  for (const t of sorted) {
    const idx = bodyText.indexOf(t);
    if (idx !== -1) {
      bestIdx = idx;
      bestToken = t;
      break;
    }
  }
  if (bestIdx === -1) return null;

  const start = Math.max(0, bestIdx - SNIPPET_RADIUS);
  const end = Math.min(bodyText.length, bestIdx + bestToken.length + SNIPPET_RADIUS);

  // Snap outward to word boundaries so the snippet starts/ends on whole words.
  let realStart = start;
  while (realStart > 0 && bodyText[realStart - 1] !== " ") realStart -= 1;
  let realEnd = end;
  while (realEnd < bodyText.length && bodyText[realEnd] !== " ") realEnd += 1;

  const before = (realStart > 0 ? "…" : "") + bodyText.slice(realStart, bestIdx);
  const match = bodyText.slice(bestIdx, bestIdx + bestToken.length);
  const after =
    bodyText.slice(bestIdx + bestToken.length, realEnd) + (realEnd < bodyText.length ? "…" : "");
  return { before, match, after };
}

// Build the precomputed token set for an entry — the union of normalized
// tokens across every searchable field. Used as a fast first-pass filter.
export function buildTokenSet(args: {
  title: string;
  summary: string;
  tags: string[];
  keywords: string[];
  bodyText: string;
}): string[] {
  const tokens = new Set<string>();
  for (const t of tokenize(args.title)) tokens.add(t);
  for (const t of tokenize(args.summary)) tokens.add(t);
  for (const tag of args.tags) for (const t of tokenize(tag)) tokens.add(t);
  for (const kw of args.keywords) for (const t of tokenize(kw)) tokens.add(t);
  // bodyText is already normalized; split directly.
  for (const t of args.bodyText.split(/\s+/).filter(Boolean)) tokens.add(t);
  return [...tokens];
}
