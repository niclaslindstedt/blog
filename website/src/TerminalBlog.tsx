import { useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { Post } from "./types.ts";
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
  const { audience, setAudience } = useAudience();
  const { setTerminalClosed } = usePreferences();

  const onNavigateToSlug = useCallback((slug: string) => navigate(`/posts/${slug}`), [navigate]);

  const { lines, idle, anchor, cwd, prompt, openInVi } = useTerminalBlogSession({
    posts,
    audience,
    slugParam,
    setAudience,
    onNavigateToSlug,
  });

  // Red and yellow dots both dismiss the terminal. Persist the choice in
  // localStorage *and* reflect it in the URL (`?view=blog`) so the fallback
  // state is shareable — pasting the URL into another browser lands the
  // recipient directly on the prose view without relying on their storage.
  const closeTerminal = useCallback(() => {
    setTerminalClosed(true);
    navigate(
      {
        pathname: location.pathname,
        search: withViewParam(location.search, "blog"),
      },
      { replace: true },
    );
  }, [setTerminalClosed, navigate, location.pathname, location.search]);

  // On a post page, the tab × returns to the index instead of swapping
  // audience — the reader is closing this post, not asking for the same
  // post in the other voice.
  const closeTabToIndex = useCallback(() => {
    navigate({ pathname: "/", search: location.search });
  }, [navigate, location.search]);

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
            onSwitch={setAudience}
            onClose={slugParam ? closeTabToIndex : undefined}
          />
        }
        onClose={closeTerminal}
        onMinimize={closeTerminal}
      />
    </ViOpenerContext.Provider>
  );
}
