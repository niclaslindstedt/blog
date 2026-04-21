# Architecture of blog

## Module layout

```
posts/                          markdown source files (one per post, slug-as-filename)
src/                            placeholder top-level TypeScript module (unused)
website/                        Vite + React + TypeScript frontend
  scripts/
    extract-posts.ts            reads posts/ → writes src/generated/posts.json
  src/
    types.ts                    Post interface (single source of truth for the JSON shape)
    App.tsx                     list view
    main.tsx                    React entry point
    generated/                  extractor output — never edit by hand
prompts/                        reserved for versioned Claude prompt templates (none active yet)
```

## Data flow

```
posts/*.md
    │
    ▼
website/scripts/extract-posts.ts   (parses frontmatter, validates, emits JSON)
    │
    ▼
website/src/generated/posts.json   (Post[] sorted by date desc)
    │
    ▼
website/src/App.tsx                (renders list view)
    │
    ▼
website/dist/                      (static output → GitHub Pages)
```

The extractor owns the boundary between raw markdown and the frontend. It validates frontmatter (`title`, `date` required; `edited_at` defaults to `date`), derives the slug from the filename, and writes one `Post[]` JSON file. Nothing in `website/src/` reads markdown directly.

## Frontend

The React app is statically exported via Vite — no server runtime. On build, it imports `posts.json` and renders a list of `<date> — <title>` rows. Per-post pages and markdown-to-HTML rendering are deferred.

## Cross-cutting concerns

- **Slugs** are derived from filenames and never stored separately; renaming a file changes the URL.
- **Errors** in the extractor are fatal — a malformed post blocks the whole build so nothing silently disappears from the live site.
- **Generated data** (`website/src/generated/posts.json`) is gitignored; the extractor runs on every `dev`/`build` via `npm run extract`.
