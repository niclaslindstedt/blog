import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";

const CLOSED_KEY = "blog:terminal-closed";
const MINIMIZED_KEY = "blog:terminal-minimized";
const THEME_KEY = "blog:theme";

export type Theme = "light" | "dark";
export type View = "terminal" | "blog";

interface PreferencesContextValue {
  terminalClosed: boolean;
  setTerminalClosed: (v: boolean) => void;
  terminalMinimized: boolean;
  setTerminalMinimized: (v: boolean) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function readClosed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CLOSED_KEY) === "1";
  } catch {
    return false;
  }
}

function readMinimized(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MINIMIZED_KEY) === "1";
  } catch {
    return false;
  }
}

function readTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const raw = window.localStorage.getItem(THEME_KEY);
    return raw === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [terminalClosed, setClosedState] = useState<boolean>(() => readClosed());
  const [terminalMinimized, setMinimizedState] = useState<boolean>(() => readMinimized());
  const [theme, setThemeState] = useState<Theme>(() => readTheme());

  const setTerminalClosed = useCallback((next: boolean) => {
    setClosedState(next);
    try {
      if (next) window.localStorage.setItem(CLOSED_KEY, "1");
      else window.localStorage.removeItem(CLOSED_KEY);
    } catch {
      // localStorage unavailable — ignore.
    }
  }, []);

  const setTerminalMinimized = useCallback((next: boolean) => {
    setMinimizedState(next);
    try {
      if (next) window.localStorage.setItem(MINIMIZED_KEY, "1");
      else window.localStorage.removeItem(MINIMIZED_KEY);
    } catch {
      // localStorage unavailable — ignore.
    }
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // localStorage unavailable — ignore.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CLOSED_KEY) setClosedState(e.newValue === "1");
      else if (e.key === MINIMIZED_KEY) setMinimizedState(e.newValue === "1");
      else if (e.key === THEME_KEY) setThemeState(e.newValue === "light" ? "light" : "dark");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Apply the light palette globally via a class on <html> so both the
  // terminal widget and the fallback prose view rebind the same CSS
  // variables. Scoping the class to FallbackShell alone left the terminal
  // stuck in the dark palette.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("theme-light", theme === "light");
  }, [theme]);

  const value = useMemo(
    () => ({
      terminalClosed,
      setTerminalClosed,
      terminalMinimized,
      setTerminalMinimized,
      theme,
      setTheme,
      toggleTheme,
    }),
    [
      terminalClosed,
      setTerminalClosed,
      terminalMinimized,
      setTerminalMinimized,
      theme,
      setTheme,
      toggleTheme,
    ],
  );
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used inside <PreferencesProvider>");
  return ctx;
}

// Precedence: explicit ?view= URL override > localStorage preference > default (terminal).
// Keeping the URL as the top source lets shared links force a specific view even on a
// device that has never opted into the fallback.
export function useActiveView(): View {
  const [params] = useSearchParams();
  const { terminalClosed } = usePreferences();
  const viewParam = params.get("view");
  if (viewParam === "blog") return "blog";
  if (viewParam === "terminal") return "terminal";
  return terminalClosed ? "blog" : "terminal";
}
