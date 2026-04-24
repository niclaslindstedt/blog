import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AUDIENCES } from "./types.ts";
import { useAudience } from "./AudienceContext.tsx";
import { usePreferences } from "./PreferencesContext.tsx";
import { ThemeToggle } from "./ThemeToggle.tsx";
import { fallbackHref, withViewParam } from "./postFilters.ts";

export function FallbackShell({ children }: { children: ReactNode }) {
  const { audience, setAudience } = useAudience();
  const { setTerminalClosed, setTerminalMinimized } = usePreferences();
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
    <div className="min-h-screen w-full bg-page-bg text-fg">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-8 break-words">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-term-border pb-4">
          <Link
            to={fallbackHref("/")}
            className="group inline-flex items-baseline gap-2 whitespace-nowrap"
          >
            <span aria-hidden="true" className="font-bold text-accent">
              $
            </span>
            <span className="text-base font-bold tracking-wide text-fg-bright group-hover:text-accent">
              niclaslindstedt
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <nav
              aria-label="Audience"
              className="flex h-8 items-stretch overflow-hidden rounded border border-term-border text-sm"
            >
              {AUDIENCES.map((a) => {
                const isActive = a === audience;
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAudience(a)}
                    aria-pressed={isActive}
                    className={`inline-flex cursor-pointer items-center border-0 px-3 whitespace-nowrap transition-colors ${
                      isActive
                        ? "bg-term-titlebar text-fg-bright"
                        : "bg-transparent text-dim hover:text-fg"
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </nav>
            <ThemeToggle />
            <button
              type="button"
              onClick={openTerminal}
              aria-label="Open terminal"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-term-border bg-transparent text-fg hover:text-fg-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M7 10l3 2-3 2" />
                <line x1="13" y1="15" x2="17" y2="15" />
              </svg>
            </button>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
