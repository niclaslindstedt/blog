// Build-time SSR: turn each route into the same prose-fallback HTML the React
// app renders, then splice the result into <div id="root"> before <script>
// tags load. Crawlers (and any reader with JS disabled) get a real <h1>, the
// full post body, breadcrumbs, tag links, and an internal link graph from the
// homepage to every post — the things Search Console was failing to index
// when the body was a bare <div id="root"></div>. After the bundle loads,
// React's createRoot() replaces this content with the interactive terminal
// (or keeps the same prose view if the reader has chosen that), so the SSR
// output is purely a head-start for the initial paint and for non-JS clients.

import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import type { Post } from "../../src/types.ts";
import { AudienceProvider } from "../../src/AudienceContext.tsx";
import { PreferencesProvider } from "../../src/PreferencesContext.tsx";
import { FileViewerContext, ViOpenerContext } from "../../src/terminal/index.ts";
import { SearchOpenerContext } from "../../src/SearchOpenerContext.tsx";
import { FallbackBlog } from "../../src/FallbackBlog.tsx";
import { FallbackPost } from "../../src/FallbackPost.tsx";
import { TagRoute } from "../../src/TagRoute.tsx";
import { TagsIndex } from "../../src/TagsIndex.tsx";
import { FallbackShell } from "../../src/FallbackShell.tsx";

const noopFile = () => {};
const noopSearch = () => {};

// Mirrors the provider stack in App.tsx, minus the analytics + keyboard-shortcut
// effects which only matter at runtime. Kept in this file so the SSR entry
// stays self-contained and doesn't pull `import.meta.env` (Vite-only) into a
// Node-run script through useAnalytics.
function SsrProviders({ location, children }: { location: string; children: ReactNode }) {
  return (
    <StaticRouter location={location}>
      <AudienceProvider>
        <PreferencesProvider>
          <SearchOpenerContext.Provider value={noopSearch}>
            <FileViewerContext.Provider value={noopFile}>
              <ViOpenerContext.Provider value={noopFile}>
                <main className="relative min-h-screen w-full overflow-hidden">{children}</main>
              </ViOpenerContext.Provider>
            </FileViewerContext.Provider>
          </SearchOpenerContext.Provider>
        </PreferencesProvider>
      </AudienceProvider>
    </StaticRouter>
  );
}

function NotFoundBody() {
  return (
    <FallbackShell>
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-fg-bright">Page not found</h1>
        <p className="text-dim">
          The page you're looking for doesn't exist. Head back to the homepage to browse posts.
        </p>
        <a href="/" className="text-fg underline decoration-dotted hover:text-accent">
          Back to all posts
        </a>
      </div>
    </FallbackShell>
  );
}

// Mirrors the route table in App.tsx so useParams() resolves correctly during
// SSR. Without going through <Routes>/<Route>, useParams() returns {} and
// FallbackPost can't find the post for its :slug — the prerendered HTML
// silently degrades to "Post not found", which is exactly what Search Console
// was indexing before we noticed.
function renderTree(location: string, posts: Post[], notFound?: ReactNode): string {
  return renderToStaticMarkup(
    <SsrProviders location={location}>
      <Routes>
        <Route path="/" element={<FallbackBlog posts={posts} />} />
        <Route path="/posts/:slug" element={<FallbackPost posts={posts} />} />
        <Route path="/tags" element={<TagsIndex posts={posts} />} />
        <Route path="/tags/:tag" element={<TagRoute posts={posts} />} />
        {notFound !== undefined && <Route path="*" element={notFound} />}
      </Routes>
    </SsrProviders>,
  );
}

export function renderHomeBody(posts: Post[]): string {
  return renderTree("/", posts);
}

export function renderPostBody(posts: Post[], slug: string): string {
  return renderTree(`/posts/${slug}`, posts);
}

export function renderTagBody(posts: Post[], tag: string): string {
  return renderTree(`/tags/${encodeURIComponent(tag)}`, posts);
}

export function renderTagsIndexBody(posts: Post[]): string {
  return renderTree("/tags", posts);
}

export function renderNotFoundBody(): string {
  return renderTree("/__not_found__", [], <NotFoundBody />);
}
