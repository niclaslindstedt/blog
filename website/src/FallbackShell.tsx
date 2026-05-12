import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AUDIENCES } from "./types.ts";
import { useAudience } from "./AudienceContext.tsx";
import { usePreferences } from "./PreferencesContext.tsx";
import { ThemeToggle } from "./ThemeToggle.tsx";
import { useSearchOpener } from "./SearchOpenerContext.tsx";
import { fallbackHref, withViewParam } from "./postFilters.ts";

export function FallbackShell({ children }: { children: ReactNode }) {
  const { audience, setAudience, resetClosedAudiences } = useAudience();
  const { setTerminalClosed, setTerminalMinimized } = usePreferences();
  const openSearch = useSearchOpener();
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
    // If the reader closed individual tabs before dismissing the terminal,
    // restore them — reopening the widget should land on a clean two-tab row.
    resetClosedAudiences();
    const pathname = location.pathname.startsWith("/tags/") ? "/" : location.pathname;
    navigate({ pathname, search: withViewParam(location.search, null) });
  };

  return (
    <div className="min-h-screen w-full bg-page-bg text-fg">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-8 break-words">
        {/* Three children with explicit `order`: on mobile the icons group
            sits next to the title and the audience tabs wrap to a second
            row (full-width to force the wrap); on `sm:` and up everything
            sits on one line in the original visual order
            title · audience · icons. */}
        <header className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-term-border pb-4">
          <Link
            to={fallbackHref("/")}
            className="order-1 group inline-flex items-baseline gap-2 whitespace-nowrap"
          >
            <span aria-hidden="true" className="font-bold text-accent">
              $
            </span>
            <span className="text-base font-bold tracking-wide text-fg-bright group-hover:text-accent">
              niclaslindstedt
            </span>
          </Link>
          <nav
            aria-label="Audience"
            className="order-3 flex h-8 w-full items-stretch overflow-hidden rounded border border-term-border text-sm sm:order-2 sm:ml-auto sm:w-auto"
          >
            {AUDIENCES.map((a) => {
              const isActive = a === audience;
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAudience(a)}
                  aria-pressed={isActive}
                  className={`inline-flex flex-1 cursor-pointer items-center justify-center border-0 px-3 whitespace-nowrap transition-colors sm:flex-none ${
                    isActive
                      ? "bg-term-titlebar font-semibold text-accent"
                      : "bg-transparent text-dim hover:text-fg"
                  }`}
                >
                  {a}
                </button>
              );
            })}
          </nav>
          <div className="order-2 ml-auto flex items-center gap-2 sm:order-3 sm:ml-0">
            <Link
              to={fallbackHref("/tags")}
              aria-label="Browse all tags"
              title="Browse all tags"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-term-border bg-transparent font-mono text-base leading-none text-fg hover:text-fg-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg"
            >
              <span aria-hidden="true">#</span>
            </Link>
            <button
              type="button"
              onClick={openSearch}
              aria-label="Search posts"
              title="Search posts (Cmd-K)"
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
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
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

        {/* Site-wide footer. Lives here (not per-page) so every fallback view
            picks up the /about link — a single canonical internal pointer
            keeps the page from being orphaned in the link graph, which is
            what kept it out of Google's index before. */}
        <footer className="mt-12 border-t border-term-border pt-4 text-xs text-dim">
          <Link to={fallbackHref("/about")} className="underline decoration-dotted hover:text-fg">
            About
          </Link>
          {" · "}
          <a
            href="https://github.com/niclaslindstedt/blog"
            className="underline decoration-dotted hover:text-fg"
          >
            Source
          </a>
        </footer>
      </div>
    </div>
  );
}
