import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: process.env.BASE_URL ?? "/",
  plugins: [tailwindcss(), react()],
  build: {
    // Vite's default modulepreload emits `<link rel="modulepreload">` for
    // every transitive dependency of the entry chunk — including chunks
    // that are only reached through a `React.lazy()` boundary. For us that
    // meant `vendor-prism` (~86 KB) was being eagerly fetched on first paint
    // even though it's only used by the lazy `FileViewer` modal, putting
    // it right back on the LCP critical path. Filtering it out here keeps
    // the lazy split honest: the chunk only loads when a reader actually
    // opens a vi-citation.
    modulePreload: {
      resolveDependencies(_filename, deps) {
        return deps.filter((d) => !d.includes("vendor-prism"));
      },
    },
    rollupOptions: {
      output: {
        // Split the heaviest vendor trees into their own long-lived chunks so
        // the app code can be cached independently from libraries that almost
        // never change. The markdown unified/remark/rehype graph alone is
        // ~150 KB minified and pulling it into the app chunk meant any
        // one-line app change invalidated all of it for returning readers.
        // Prism is reached only through the lazy FileViewer, so isolating it
        // keeps it out of the main chunk entirely.
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("prism-react-renderer")) return "vendor-prism";
            if (
              id.includes("react-markdown") ||
              /\b(remark|rehype|micromark|mdast|hast|unist|unified|vfile|bail|ccount|character-entities|decode-named-character-reference|devlop|escape-string-regexp|estree|html-url-attributes|is-plain-obj|longest-streak|markdown-table|property-information|space-separated-tokens|comma-separated-tokens|stringify-entities|trim-lines|trough|web-namespaces|zwitch)\b/.test(
                id,
              )
            ) {
              return "vendor-markdown";
            }
            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("/react-router") ||
              id.includes("/@remix-run/")
            ) {
              return "vendor-react";
            }
          }
        },
      },
    },
  },
});
