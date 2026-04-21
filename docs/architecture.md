# Architecture of blog

## Module layout

```
posts/                          markdown source files (one per post, slug-as-filename)
src/                            placeholder top-level TypeScript module (unused)
website/                        Vite + React + TypeScript + Tailwind v4 frontend
  scripts/
    extract-posts.ts            reads posts/ → writes src/generated/posts.json
  src/
    types.ts                    Post interface (single source of truth for the JSON shape)
    terminalTypes.ts            terminal line/step union types
    App.tsx                     page layout (centres the terminal window)
    TerminalBlog.tsx            blog-specific transcript controller (ls / cat / head / tail)
    Terminal.tsx                window chrome + drag-to-resize handle
    TerminalLine.tsx            renders one transcript line by kind
    CommandHighlighter.tsx      shell-syntax colouring for commands
    useTerminalAnimation.ts     sequence-driven typing animation hook
    styles.css                  Tailwind entry + theme variables + blink-cursor keyframes
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

The React app is statically exported via Vite — no server runtime. The landing page is a single interactive terminal window: on mount it auto-runs `$ ls posts/`, each filename is clickable, clicking runs `cat … | head -n 10` (instant raw output), and a `[ show more ]` action runs `cat … | tail -n +11` with a character-by-character typing animation. The tail output is rendered through `react-markdown` + `remark-gfm` with terminal-styled overrides: every element keeps the body's monospace font and base size; `h1` is bold + uppercase + wide-tracked, `h2`-`h6` are bold, inline code is accent-coloured, code blocks use the titlebar background, and blockquotes/tables/hr use the dim border colour. The terminal chrome has a titlebar you can drag to move the window and a bottom-right corner for resizing.

## Routing

`react-router-dom`'s `BrowserRouter` (basename = Vite's `BASE_URL`) exposes two routes:

- `/` — landing terminal (no post opened).
- `/posts/<slug>` — terminal that runs `ls` first, then auto-opens that post with `cat … | head -n 10`. An unknown slug prints `cat: posts/<slug>.md: No such file or directory` in red.

Clicking a filename updates the URL via `navigate`, keeping deep-links and the address bar in sync. The transcript is append-only — back/forward navigation doesn't wipe previously-printed output (terminal scrollback semantics). The `build` script runs `cp dist/index.html dist/404.html` so GitHub Pages's 404 fallback serves the SPA shell for unknown paths.

## Cross-cutting concerns

- **Slugs** are derived from filenames and never stored separately; renaming a file changes the URL.
- **Errors** in the extractor are fatal — a malformed post blocks the whole build so nothing silently disappears from the live site.
- **Generated data** (`website/src/generated/posts.json`) is gitignored; the extractor runs on every `dev`/`build` via `npm run extract`.
