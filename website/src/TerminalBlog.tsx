import { useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AUDIENCES, type Audience, type Post } from "./types.ts";
import { Terminal, ViOpenerContext } from "./terminal/index.ts";
import { AudienceTabs } from "./AudienceTabs.tsx";
import { useAudience } from "./AudienceContext.tsx";
import { usePreferences } from "./PreferencesContext.tsx";
import { useTerminalBlogSession } from "./useTerminalBlogSession.ts";
import { withViewParam } from "./postFilters.ts";

export function TerminalBlog({ posts }: { posts: Post[] }) {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { audience, setAudience, closedAudiences, closeAudience, resetClosedAudiences } =
    useAudience();
  const {
    setTerminalClosed,
    terminalMinimized,
    setTerminalMinimized,
    closeHintDismissed,
    dismissCloseHint,
  } = usePreferences();

  const onNavigateToSlug = useCallback((slug: string) => navigate(`/posts/${slug}`), [navigate]);

  const { lines, idle, anchor, cwd, prompt, openInVi } = useTerminalBlogSession({
    posts,
    audience,
    slugParam,
    setAudience,
    onNavigateToSlug,
  });

  // Red dot dismisses the terminal entirely — persists the choice in
  // localStorage *and* reflects it in the URL (`?view=blog`) so the fallback
  // state is shareable. Pasting the URL into another browser lands the
  // recipient directly on the prose view without relying on their storage.
  const closeTerminal = useCallback(() => {
    setTerminalClosed(true);
    // Any pending minimize is superseded by a full close; otherwise reopening
    // the terminal would land on a minimized bar instead of the full widget.
    setTerminalMinimized(false);
    // Touch users never fire onMouseEnter, so dismiss the first-visit hint here
    // too — by the time they've tapped the red dot they've found the feature.
    dismissCloseHint();
    navigate(
      {
        pathname: location.pathname,
        search: withViewParam(location.search, "blog"),
      },
      { replace: true },
    );
  }, [
    setTerminalClosed,
    setTerminalMinimized,
    dismissCloseHint,
    navigate,
    location.pathname,
    location.search,
  ]);

  // Yellow dot parks the terminal as a bar at the bottom of the viewport. The
  // widget stays mounted so scrollback, typing animation, and session state
  // survive; the titlebar becomes a click target that restores it.
  const minimizeTerminal = useCallback(() => setTerminalMinimized(true), [setTerminalMinimized]);
  const restoreTerminal = useCallback(() => setTerminalMinimized(false), [setTerminalMinimized]);

  // The tab × hides that audience for the rest of the session. Closing the
  // last open tab tears down the terminal entirely and lands the reader on
  // the prose fallback — same end state as the red traffic-light button.
  // Closing the active (but not last) tab focuses the remaining one; if the
  // reader is on a post page we also bounce back to the index, since the
  // remaining audience may not have this post and a missing-post screen is
  // a worse landing than the listing.
  const handleCloseTab = useCallback(
    (id: Audience) => {
      const remaining = AUDIENCES.filter((a) => a !== id && !closedAudiences.includes(a));
      if (remaining.length === 0) {
        resetClosedAudiences();
        closeTerminal();
        return;
      }
      closeAudience(id);
      if (id === audience) {
        const next = remaining[0]!;
        setAudience(next);
        if (slugParam) navigate({ pathname: "/", search: location.search });
      }
    },
    [
      closedAudiences,
      resetClosedAudiences,
      closeTerminal,
      closeAudience,
      audience,
      setAudience,
      slugParam,
      navigate,
      location.search,
    ],
  );

  return (
    <ViOpenerContext.Provider value={openInVi}>
      <Terminal
        lines={lines}
        idle={idle}
        anchor={anchor}
        cwd={cwd}
        prompt={prompt}
        tabs={
          <AudienceTabs
            audience={audience}
            closedAudiences={closedAudiences}
            onSwitch={setAudience}
            onCloseTab={handleCloseTab}
          />
        }
        minimized={terminalMinimized}
        onClose={closeTerminal}
        onMinimize={minimizeTerminal}
        onRestore={restoreTerminal}
        showCloseHint={!closeHintDismissed}
        onDismissCloseHint={dismissCloseHint}
      />
    </ViOpenerContext.Provider>
  );
}
