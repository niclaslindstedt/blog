import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAudience } from "./AudienceContext.tsx";
import {
  scoreEntry,
  snippet,
  tokenize,
  type ScoredEntry,
  type SearchEntry,
  type SearchIndex,
  type SearchMode,
  type Snippet,
} from "./search.ts";
import { fallbackHref } from "./postFilters.ts";

// Cache the parsed index for the rest of the session — opening the modal
// twice should not reload the chunk. Module-level so it survives re-renders
// without React state.
let cachedIndex: SearchIndex | null = null;
async function loadIndex(): Promise<SearchIndex> {
  if (cachedIndex) return cachedIndex;
  const mod = await import("./generated/search-index.json");
  cachedIndex = (mod.default ?? mod) as SearchIndex;
  return cachedIndex;
}

interface ResultRow {
  entry: SearchEntry;
  score: number;
  // Snippet to render under the title — null when no body match exists,
  // in which case the row falls back to summary.
  snippet: Snippet | null;
  // Other-audience hint when both audience entries matched.
  otherAudience: SearchEntry["audience"] | null;
}

function collapseAudiences(
  scored: ScoredEntry[],
  preferredAudience: ReturnType<typeof useAudience>["audience"],
): ResultRow[] {
  const bySlug = new Map<string, { rows: ScoredEntry[] }>();
  for (const s of scored) {
    const bucket = bySlug.get(s.entry.slug) ?? { rows: [] };
    bucket.rows.push(s);
    bySlug.set(s.entry.slug, bucket);
  }
  const out: ResultRow[] = [];
  for (const { rows } of bySlug.values()) {
    rows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Tie-break: prefer the audience the reader is currently viewing.
      if (a.entry.audience === preferredAudience) return -1;
      if (b.entry.audience === preferredAudience) return 1;
      return 0;
    });
    const winner = rows[0];
    const other = rows.find((r) => r.entry.audience !== winner.entry.audience);
    out.push({
      entry: winner.entry,
      score: winner.score,
      snippet: null,
      otherAudience: other ? other.entry.audience : null,
    });
  }
  // Final ordering across slugs is by score.
  out.sort((a, b) => b.score - a.score);
  return out;
}

const MAX_RESULTS = 25;

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const navigate = useNavigate();
  const { audience } = useAudience();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const [query, setQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [index, setIndex] = useState<SearchIndex | null>(cachedIndex);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Lazy-load the index on first open. Subsequent opens use the cached copy.
  useEffect(() => {
    if (!open) return;
    if (cachedIndex) {
      setIndex(cachedIndex);
      return;
    }
    let canceled = false;
    loadIndex()
      .then((idx) => {
        if (!canceled) setIndex(idx);
      })
      .catch((e) => {
        if (!canceled) setLoadError(String(e?.message ?? e));
      });
    return () => {
      canceled = true;
    };
  }, [open]);

  // Reset query and focus on every open. The previous query is intentionally
  // not preserved — searches are cheap and starting fresh is more predictable.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setFocusedIndex(0);
    // Defer focus until after the input mounts.
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  const queryTokens = useMemo(() => tokenize(query), [query]);

  const { primary, partial } = useMemo(() => {
    if (!index || queryTokens.length === 0 || query.trim().length < 2) {
      return { primary: [] as ResultRow[], partial: [] as ResultRow[] };
    }
    const score = (mode: SearchMode): ScoredEntry[] => {
      const out: ScoredEntry[] = [];
      for (const entry of index.entries) {
        const s = scoreEntry(entry, queryTokens, mode);
        if (s !== null) out.push({ entry, score: s });
      }
      return out;
    };
    const andHits = collapseAudiences(score("and"), audience).slice(0, MAX_RESULTS);
    const partialHits =
      andHits.length > 0 ? [] : collapseAudiences(score("or"), audience).slice(0, MAX_RESULTS);
    const attachSnippet = (rows: ResultRow[]): ResultRow[] =>
      rows.map((r) => ({ ...r, snippet: snippet(r.entry.bodyText, queryTokens) }));
    return { primary: attachSnippet(andHits), partial: attachSnippet(partialHits) };
  }, [index, queryTokens, query, audience]);

  const allResults = useMemo(() => [...primary, ...partial], [primary, partial]);

  // Keep focusedIndex in range as results change.
  useEffect(() => {
    if (focusedIndex >= allResults.length) setFocusedIndex(0);
  }, [allResults.length, focusedIndex]);

  const handleSelect = useCallback(
    (row: ResultRow) => {
      navigate(fallbackHref(`/posts/${row.entry.slug}`));
      onClose();
    },
    [navigate, onClose],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (allResults.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, allResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const row = allResults[focusedIndex];
        if (row) handleSelect(row);
      }
    },
    [allResults, focusedIndex, handleSelect, onClose],
  );

  // Scroll the focused row into view as the reader navigates with arrows.
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-result-idx="${focusedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex]);

  if (!open) return null;

  const showHint = query.trim().length < 2;
  const showNoResults = !showHint && allResults.length === 0 && index !== null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[20vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={onKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Search posts"
    >
      <div className="flex max-h-[60vh] w-full max-w-2xl flex-col overflow-hidden rounded border border-term-border bg-term-bg text-fg shadow-xl">
        <div className="flex items-center gap-2 border-b border-term-border bg-term-titlebar px-3 py-2">
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-dim"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts…"
            aria-label="Search query"
            className="flex-1 border-0 bg-transparent text-sm text-fg outline-none placeholder:text-dim"
            spellCheck={false}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="shrink-0 cursor-pointer bg-transparent p-0 text-xs text-meta hover:text-accent"
          >
            [ esc ]
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadError && (
            <div className="px-3 py-4 text-sm text-red">
              Couldn&apos;t load search index: {loadError}
            </div>
          )}
          {!loadError && !index && (
            <div className="px-3 py-4 text-sm text-dim">Loading search index…</div>
          )}
          {!loadError && index && showHint && (
            <div className="px-3 py-4 text-sm text-dim">
              Type to search posts. <span className="text-meta">Cmd-K</span> /{" "}
              <span className="text-meta">Ctrl-K</span> toggles this anywhere.
            </div>
          )}
          {!loadError && index && showNoResults && (
            <div className="px-3 py-4 text-sm text-dim">
              No posts matched <span className="text-fg">{query}</span>.
            </div>
          )}
          {!loadError && index && allResults.length > 0 && (
            <ul ref={listRef} className="divide-y divide-term-border">
              {primary.map((row, i) => (
                <ResultRowView
                  key={`p-${row.entry.slug}`}
                  row={row}
                  index={i}
                  focused={focusedIndex === i}
                  onSelect={handleSelect}
                  onMouseEnter={() => setFocusedIndex(i)}
                />
              ))}
              {partial.length > 0 && (
                <li className="bg-term-titlebar px-3 py-1 text-xs uppercase tracking-wide text-dim">
                  Partial matches
                </li>
              )}
              {partial.map((row, i) => {
                const idx = primary.length + i;
                return (
                  <ResultRowView
                    key={`pp-${row.entry.slug}`}
                    row={row}
                    index={idx}
                    focused={focusedIndex === idx}
                    onSelect={handleSelect}
                    onMouseEnter={() => setFocusedIndex(idx)}
                  />
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultRowView({
  row,
  index,
  focused,
  onSelect,
  onMouseEnter,
}: {
  row: ResultRow;
  index: number;
  focused: boolean;
  onSelect: (row: ResultRow) => void;
  onMouseEnter: () => void;
}) {
  // Use a button-as-link: navigate via the parent's handler (which closes
  // the modal). For middle-click / Cmd-click we still want a real <a>, so
  // the row is wrapped in an anchor but with onClick intercepted for the
  // primary button.
  const href = fallbackHref(`/posts/${row.entry.slug}`);
  return (
    <li data-result-idx={index}>
      <a
        href={href}
        onClick={(e) => {
          // Let modifier-clicks open in a new tab; intercept plain clicks.
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          onSelect(row);
        }}
        onMouseEnter={onMouseEnter}
        className={`block px-3 py-2 no-underline focus:outline-none ${
          focused ? "bg-term-titlebar" : ""
        }`}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold text-fg-bright">{row.entry.title}</span>
          <span className="shrink-0 text-xs text-dim">
            {row.entry.audience}
            {row.otherAudience && <span className="text-meta"> · +{row.otherAudience}</span>}
          </span>
        </div>
        <div className="mt-1 text-sm text-dim">
          {row.snippet ? (
            <>
              {row.snippet.before}
              <mark className="rounded-sm bg-accent/30 px-0.5 text-fg">{row.snippet.match}</mark>
              {row.snippet.after}
            </>
          ) : (
            row.entry.summary
          )}
        </div>
      </a>
    </li>
  );
}
