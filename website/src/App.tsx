import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Route, Routes, useParams } from "react-router-dom";
import postsData from "./generated/posts.json";
import type { Post } from "./types.ts";
import { FallbackBlog } from "./FallbackBlog.tsx";
import { FallbackPost } from "./FallbackPost.tsx";
import { FileViewerContext, ViOpenerContext, type GithubFile } from "./terminal/index.ts";
import { AudienceProvider } from "./AudienceContext.tsx";
import { PreferencesProvider, useActiveView, usePreferences } from "./PreferencesContext.tsx";
import { SearchOpenerContext } from "./SearchOpenerContext.tsx";
import { usePageTitle } from "./seo/usePageTitle.ts";
import { useAnalytics } from "./seo/useAnalytics.ts";
import { SITE_NAME, SITE_TAGLINE } from "./seo/siteConfig.ts";
import { useIsHydrated } from "./useIsHydrated.ts";

// Lazy boundaries: the SSR prerender ships the prose-fallback HTML inside
// <div id="root">, so the first paint is already painted by the time React
// boots. Everything below sits behind a Suspense; the user keeps seeing the
// prerendered prose while these chunks fetch and only swaps to the
// interactive widget once its code arrives. That trims ~250 KB off the main
// chunk and unblocks LCP — `prism-react-renderer`, the terminal animation
// state machine, the search index loader, and the file-viewer modal all
// follow the lazy boundary they're behind.
const TerminalBlog = lazy(() =>
  import("./TerminalBlog.tsx").then((m) => ({ default: m.TerminalBlog })),
);
const SearchModal = lazy(() =>
  import("./SearchModal.tsx").then((m) => ({ default: m.SearchModal })),
);
const FileViewer = lazy(() =>
  import("./terminal/FileViewer.tsx").then((m) => ({ default: m.FileViewer })),
);
const TagsIndex = lazy(() => import("./TagsIndex.tsx").then((m) => ({ default: m.TagsIndex })));
const TagRoute = lazy(() => import("./TagRoute.tsx").then((m) => ({ default: m.TagRoute })));
const AboutPage = lazy(() => import("./AboutPage.tsx").then((m) => ({ default: m.AboutPage })));
const NotFoundPage = lazy(() =>
  import("./NotFoundPage.tsx").then((m) => ({ default: m.NotFoundPage })),
);

const posts = postsData as Post[];

function HomeTitle() {
  usePageTitle(`${SITE_NAME} — ${SITE_TAGLINE}`);
  return null;
}

// Shared element for `/` and `/posts/:slug`. Using the same component for both
// routes lets React reconcile the inner tree across the navigation instead of
// unmounting it, so `TerminalBlog`'s session state (cwd, scrollback, pending
// animation) survives when the reader clicks a post filename.
function BlogRoute() {
  const hydrated = useIsHydrated();
  const view = useActiveView();
  const { terminalMinimized } = usePreferences();
  const { slug } = useParams<{ slug: string }>();
  const isHome = slug === undefined;
  // Until the client takes over from SSR, render exactly what the prerender
  // emitted: the prose fallback. After hydration completes (useIsHydrated
  // flips to true) we switch to whatever the reader's persisted view is.
  // Before this gate, the SSR shipped prose but `useActiveView()` defaults
  // to "terminal", so the first client render would have torn the SSR'd
  // HTML down as a hydration mismatch.
  const effectiveView = hydrated ? view : "blog";
  const showFallback =
    effectiveView === "blog" || (effectiveView === "terminal" && terminalMinimized);
  const fallbackProse = isHome ? <FallbackBlog posts={posts} /> : <FallbackPost posts={posts} />;
  return (
    <>
      {isHome && <HomeTitle />}
      {showFallback && fallbackProse}
      {effectiveView === "terminal" && (
        // Suspense fallback is the same prose view, so while the terminal
        // chunk fetches the reader keeps seeing the SSR'd post — no blank
        // flash between createRoot() wiping #root and the terminal mounting.
        <Suspense fallback={terminalMinimized ? null : fallbackProse}>
          <TerminalBlog posts={posts} />
        </Suspense>
      )}
    </>
  );
}

export default function App() {
  const [viewerFile, setViewerFile] = useState<GithubFile | null>(null);
  const openFile = useCallback((file: GithubFile) => setViewerFile(file), []);
  const closeFile = useCallback(() => setViewerFile(null), []);
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  useAnalytics();

  // Cmd-K / Ctrl-K opens the search modal from anywhere on the page.
  // Suppressed when the focus is inside an editable element so a reader
  // typing in a form (or in the terminal's REPL) doesn't get hijacked.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        const editable =
          tag === "INPUT" || tag === "TEXTAREA" || (target && target.isContentEditable);
        if (editable && !searchOpen) return;
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  return (
    <AudienceProvider>
      <PreferencesProvider>
        <SearchOpenerContext.Provider value={openSearch}>
          <FileViewerContext.Provider value={openFile}>
            {/* Default ViOpener for views without a terminal (prose / fallback):
                just pop the file viewer modal — there's no prompt to animate
                `curl ... | vi -` into. TerminalBlog overrides this with the
                animated version when the terminal is mounted. Without this
                default provider, sup links in the prose view would fall back
                to the no-op default and silently swallow clicks. */}
            <ViOpenerContext.Provider value={openFile}>
              <main className="relative min-h-screen w-full overflow-hidden">
                <Routes>
                  <Route path="/" element={<BlogRoute />} />
                  <Route path="/posts/:slug" element={<BlogRoute />} />
                  <Route
                    path="/tags"
                    element={
                      <Suspense fallback={null}>
                        <TagsIndex posts={posts} />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/tags/:tag"
                    element={
                      <Suspense fallback={null}>
                        <TagRoute posts={posts} />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/about"
                    element={
                      <Suspense fallback={null}>
                        <AboutPage />
                      </Suspense>
                    }
                  />
                  {/* Catchall: when GitHub Pages serves /404.html and the
                      React app boots on an unknown URL, this route's
                      rendered DOM must match the SSR'd NotFoundBody so
                      `hydrateRoot` doesn't tear it down. */}
                  <Route
                    path="*"
                    element={
                      <Suspense fallback={null}>
                        <NotFoundPage />
                      </Suspense>
                    }
                  />
                </Routes>
              </main>
              {/* Modals are pure overlays: null fallback is fine — the reader
                  triggered the open and a brief delay before paint is the
                  natural network cost of fetching the chunk. Gating the
                  lazy components on `open` (not just letting them return null
                  internally) keeps the chunk request itself behind the trigger
                  — otherwise React.lazy() would fetch on first render and
                  defeat the whole point of the split. */}
              {viewerFile && (
                <Suspense fallback={null}>
                  <FileViewer file={viewerFile} onClose={closeFile} />
                </Suspense>
              )}
              {searchOpen && (
                <Suspense fallback={null}>
                  <SearchModal open={searchOpen} onClose={closeSearch} />
                </Suspense>
              )}
            </ViOpenerContext.Provider>
          </FileViewerContext.Provider>
        </SearchOpenerContext.Provider>
      </PreferencesProvider>
    </AudienceProvider>
  );
}
