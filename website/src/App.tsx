import { useCallback, useState } from "react";
import { Route, Routes, useParams } from "react-router-dom";
import postsData from "./generated/posts.json";
import type { Post } from "./types.ts";
import { TerminalBlog } from "./TerminalBlog.tsx";
import { FallbackBlog } from "./FallbackBlog.tsx";
import { FallbackPost } from "./FallbackPost.tsx";
import { TagRoute } from "./TagRoute.tsx";
import { TagsIndex } from "./TagsIndex.tsx";
import { FileViewer, FileViewerContext, type GithubFile } from "./terminal/index.ts";
import { AudienceProvider } from "./AudienceContext.tsx";
import { PreferencesProvider, useActiveView, usePreferences } from "./PreferencesContext.tsx";
import { usePageTitle } from "./seo/usePageTitle.ts";
import { useAnalytics } from "./seo/useAnalytics.ts";
import { SITE_NAME, SITE_TAGLINE } from "./seo/siteConfig.ts";

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
  const view = useActiveView();
  const { terminalMinimized } = usePreferences();
  const { slug } = useParams<{ slug: string }>();
  const isHome = slug === undefined;
  // When the terminal is minimized we still show the prose view behind the
  // bar so the reader isn't staring at a blank page — the minimized widget
  // is a fixed-position bar at the bottom and the fallback content flows
  // normally underneath.
  const showFallback = view === "blog" || (view === "terminal" && terminalMinimized);
  return (
    <>
      {isHome && <HomeTitle />}
      {showFallback && (isHome ? <FallbackBlog posts={posts} /> : <FallbackPost posts={posts} />)}
      {view === "terminal" && <TerminalBlog posts={posts} />}
    </>
  );
}

export default function App() {
  const [viewerFile, setViewerFile] = useState<GithubFile | null>(null);
  const openFile = useCallback((file: GithubFile) => setViewerFile(file), []);
  const closeFile = useCallback(() => setViewerFile(null), []);
  useAnalytics();

  return (
    <AudienceProvider>
      <PreferencesProvider>
        <FileViewerContext.Provider value={openFile}>
          <main className="relative min-h-screen w-full overflow-hidden">
            <Routes>
              <Route path="/" element={<BlogRoute />} />
              <Route path="/posts/:slug" element={<BlogRoute />} />
              <Route path="/tags" element={<TagsIndex posts={posts} />} />
              <Route path="/tags/:tag" element={<TagRoute posts={posts} />} />
            </Routes>
          </main>
          {viewerFile && <FileViewer file={viewerFile} onClose={closeFile} />}
        </FileViewerContext.Provider>
      </PreferencesProvider>
    </AudienceProvider>
  );
}
