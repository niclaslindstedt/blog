import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { DEFAULT_AUDIENCE, isAudience, type Audience } from "./types.ts";

const STORAGE_KEY = "blog:audience";

interface AudienceContextValue {
  audience: Audience;
  setAudience: (next: Audience) => void;
  // Audiences the reader has closed via the tab × in this session. Held in
  // memory only — a refresh restores both tabs. Once every audience is in this
  // list the host is expected to dismiss the terminal entirely (there is no
  // "all tabs closed" empty state).
  closedAudiences: readonly Audience[];
  closeAudience: (a: Audience) => void;
  resetClosedAudiences: () => void;
}

const AudienceContext = createContext<AudienceContextValue | null>(null);

function readStored(): Audience {
  if (typeof window === "undefined") return DEFAULT_AUDIENCE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isAudience(raw) ? raw : DEFAULT_AUDIENCE;
  } catch {
    return DEFAULT_AUDIENCE;
  }
}

export function AudienceProvider({ children }: { children: ReactNode }) {
  // Initial state must match what the SSR prerender produced (DEFAULT_AUDIENCE)
  // so `hydrateRoot` doesn't tear down the server HTML on first render.
  // localStorage is read in a useEffect below, after hydration completes.
  const [audience, setAudienceState] = useState<Audience>(DEFAULT_AUDIENCE);
  const [closedAudiences, setClosedAudiences] = useState<readonly Audience[]>([]);

  const setAudience = useCallback((next: Audience) => {
    setAudienceState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage may be unavailable (private mode, SSR) — fine to ignore.
    }
  }, []);

  const closeAudience = useCallback((a: Audience) => {
    setClosedAudiences((prev) => (prev.includes(a) ? prev : [...prev, a]));
  }, []);

  const resetClosedAudiences = useCallback(() => setClosedAudiences([]), []);

  // Sync to the reader's persisted choice once the client has taken over.
  // Runs once on mount; the storage event listener below keeps it in sync
  // for the rest of the session.
  useEffect(() => {
    const stored = readStored();
    if (stored !== DEFAULT_AUDIENCE) setAudienceState(stored);
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && isAudience(e.newValue)) setAudienceState(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({ audience, setAudience, closedAudiences, closeAudience, resetClosedAudiences }),
    [audience, setAudience, closedAudiences, closeAudience, resetClosedAudiences],
  );
  return <AudienceContext.Provider value={value}>{children}</AudienceContext.Provider>;
}

export function useAudience(): AudienceContextValue {
  const ctx = useContext(AudienceContext);
  if (!ctx) throw new Error("useAudience must be used inside <AudienceProvider>");
  return ctx;
}
