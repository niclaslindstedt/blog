import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AUDIENCES } from "./types.ts";
import { useAudience } from "./AudienceContext.tsx";
import { usePreferences } from "./PreferencesContext.tsx";
import { ThemeToggle } from "./ThemeToggle.tsx";
import { fallbackHref, withViewParam } from "./postFilters.ts";

export function FallbackShell({ children }: { children: ReactNode }) {
  const { audience, setAudience } = useAudience();
  const { theme, setTerminalClosed, setTerminalMinimized } = usePreferences();
  const navigate = useNavigate();
  const location = useLocation();

  // Reopen the terminal: clear the persisted close flag and strip `view=blog`
  // from the URL in a single navigation so the user lands back in the
  // terminal at the same path. Also clear any stale minimize flag so the
  // reopen lands on the full widget rather than the bottom bar. /tags/<tag>/
  // has no terminal analogue, so that case redirects to `/` — otherwise the
  // click would appear to do nothing because the tag route always renders
  // the fallback.
  const openTerminal = () => {
    setTerminalClosed(false);
    setTerminalMinimized(false);
    const pathname = location.pathname.startsWith("/tags/") ? "/" : location.pathname;
    navigate({ pathname, search: withViewParam(location.search, null) });
  };

  return (
    <div
      className={
        theme === "light"
          ? "theme-light min-h-screen w-full bg-page-bg text-fg"
          : "min-h-screen w-full bg-page-bg text-fg"
      }
    >
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-8 break-words">
        <header className="mb-10 flex items-center justify-between gap-4 border-b border-term-border pb-5">
          <Link
            to={fallbackHref("/")}
            className="text-base font-bold tracking-wide text-fg-bright hover:text-accent"
          >
            niclaslindstedt
          </Link>
          <div className="flex items-center gap-3">
            <nav aria-label="Audience" className="flex items-center gap-1 text-sm">
              {AUDIENCES.map((a) => {
                const isActive = a === audience;
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAudience(a)}
                    aria-pressed={isActive}
                    className={`cursor-pointer rounded bg-transparent px-2 py-1 transition-colors ${
                      isActive
                        ? "text-fg-bright underline decoration-dotted underline-offset-4"
                        : "text-dim hover:text-fg"
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </nav>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-16 border-t border-term-border pt-5 text-sm text-dim">
          <button
            type="button"
            onClick={openTerminal}
            className="cursor-pointer bg-transparent p-0 text-dim underline decoration-dotted hover:text-fg"
          >
            Open terminal
          </button>
        </footer>
      </div>
    </div>
  );
}
