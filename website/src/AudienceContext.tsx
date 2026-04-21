import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { DEFAULT_AUDIENCE, isAudience, type Audience } from "./types.ts";

const STORAGE_KEY = "blog:audience";

interface AudienceContextValue {
  audience: Audience;
  setAudience: (next: Audience) => void;
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
  const [audience, setAudienceState] = useState<Audience>(() => readStored());

  const setAudience = useCallback((next: Audience) => {
    setAudienceState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage may be unavailable (private mode, SSR) — fine to ignore.
    }
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && isAudience(e.newValue)) setAudienceState(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(() => ({ audience, setAudience }), [audience, setAudience]);
  return <AudienceContext.Provider value={value}>{children}</AudienceContext.Provider>;
}

export function useAudience(): AudienceContextValue {
  const ctx = useContext(AudienceContext);
  if (!ctx) throw new Error("useAudience must be used inside <AudienceProvider>");
  return ctx;
}
