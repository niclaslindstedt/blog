import { useCallback, useState } from "react";
import { Route, Routes } from "react-router-dom";
import postsData from "./generated/posts.json";
import type { Post } from "./types.ts";
import { TerminalBlog } from "./TerminalBlog.tsx";
import { FileViewer } from "./FileViewer.tsx";
import { FileViewerContext } from "./FileViewerContext.tsx";
import { AudienceProvider } from "./AudienceContext.tsx";
import type { GithubFile } from "./github.ts";

const posts = postsData as Post[];

export default function App() {
  const [viewerFile, setViewerFile] = useState<GithubFile | null>(null);
  const openFile = useCallback((file: GithubFile) => setViewerFile(file), []);
  const closeFile = useCallback(() => setViewerFile(null), []);

  return (
    <AudienceProvider>
      <FileViewerContext.Provider value={openFile}>
        <main className="relative min-h-screen w-screen overflow-hidden">
          <Routes>
            <Route path="/" element={<TerminalBlog posts={posts} />} />
            <Route path="/posts/:slug" element={<TerminalBlog posts={posts} />} />
          </Routes>
        </main>
        {viewerFile && <FileViewer file={viewerFile} onClose={closeFile} />}
      </FileViewerContext.Provider>
    </AudienceProvider>
  );
}
