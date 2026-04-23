import { useCallback, useState } from "react";
import { Route, Routes } from "react-router-dom";
import postsData from "./generated/posts.json";
import type { Post } from "./types.ts";
import { TerminalBlog } from "./TerminalBlog.tsx";
import { FallbackBlog } from "./FallbackBlog.tsx";
import { FallbackPost } from "./FallbackPost.tsx";
import { TagRoute } from "./TagRoute.tsx";
import { FileViewer, FileViewerContext, type GithubFile } from "./terminal/index.ts";
import { AudienceProvider } from "./AudienceContext.tsx";
import { PreferencesProvider, useActiveView } from "./PreferencesContext.tsx";
import { usePageTitle } from "./seo/usePageTitle.ts";
import { SITE_NAME, SITE_TAGLINE } from "./seo/siteConfig.ts";

const posts = postsData as Post[];

function HomeRoute() {
  const view = useActiveView();
  usePageTitle(`${SITE_NAME} — ${SITE_TAGLINE}`);
  return view === "blog" ? <FallbackBlog posts={posts} /> : <TerminalBlog posts={posts} />;
}

function PostRoute() {
  const view = useActiveView();
  return view === "blog" ? <FallbackPost posts={posts} /> : <TerminalBlog posts={posts} />;
}

export default function App() {
  const [viewerFile, setViewerFile] = useState<GithubFile | null>(null);
  const openFile = useCallback((file: GithubFile) => setViewerFile(file), []);
  const closeFile = useCallback(() => setViewerFile(null), []);

  return (
    <AudienceProvider>
      <PreferencesProvider>
        <FileViewerContext.Provider value={openFile}>
          <main className="relative min-h-screen w-full overflow-hidden">
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/posts/:slug" element={<PostRoute />} />
              <Route path="/tags/:tag" element={<TagRoute posts={posts} />} />
            </Routes>
          </main>
          {viewerFile && <FileViewer file={viewerFile} onClose={closeFile} />}
        </FileViewerContext.Provider>
      </PreferencesProvider>
    </AudienceProvider>
  );
}
