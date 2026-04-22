# Architecture of blog

## Module layout

```
posts/                          markdown source files, split by audience
  technical/YYYY-MM-DD-<slug>.md        version for technical readers
  non-technical/YYYY-MM-DD-<slug>.md    version for non-technical readers
src/                            placeholder top-level TypeScript module (unused)
website/                        Vite + React + TypeScript + Tailwind v4 frontend
  scripts/
    extract-posts.ts            reads posts/{technical,non-technical}/ → writes src/generated/posts.json
  src/
    types.ts                    Post / PostVersion / Audience (single source of truth)
    terminalTypes.ts            terminal line/step union types
    App.tsx                     page layout (centres the terminal, wraps AudienceProvider + FileViewerProvider)
    AudienceContext.tsx         React context + localStorage-backed audience preference
    AudienceTabs.tsx            two-tab strip rendered in the terminal chrome
    TerminalBlog.tsx            audience-aware transcript controller (ls / grep summaries / sed)
    Terminal.tsx                window chrome + drag-to-resize + tabs slot + live-cwd titlebar
    TerminalLine.tsx            renders one transcript line by kind
    CommandHighlighter.tsx      shell-syntax colouring for commands
    MarkdownBody.tsx            shared react-markdown + remark-gfm renderer with terminal overrides
    FileViewer.tsx              full-viewport vi-style overlay for github.com/.../blob/ links
    FileViewerContext.tsx       React context exposing the file-viewer open() callback
    github.ts                   GitHub blob-URL parser and raw-content fetcher
    typing.ts                   WPM-aware keystroke timing model (finger-aware delays)
    useTerminalAnimation.ts     sequence-driven typing animation hook (consumes typing.ts)
    styles.css                  Tailwind entry + theme variables + blink-cursor keyframes
    main.tsx                    React entry point
    generated/                  extractor output — never edit by hand
prompts/                        reserved for versioned Claude prompt templates (none active yet)
```

## Data flow

```
posts/technical/*.md       posts/non-technical/*.md
        \                         /
         \                       /
          ▼                     ▼
     website/scripts/extract-posts.ts
          │    (merges by slug, validates each version)
          ▼
     website/src/generated/posts.json   (Post[] sorted by date desc)
          │
          ▼
     website/src/App.tsx                (AudienceProvider + list view)
          │
          ▼
     website/dist/                      (static output → GitHub Pages)
```

The extractor owns the boundary between raw markdown and the frontend. It
reads each audience folder, validates frontmatter (`title`, `date`, and
`summary` required; `edited_at` defaults to `date`), derives the slug from
the filename, and merges the versions under one `Post` object keyed by slug.
Stray markdown files directly under `posts/` are a fatal error. Nothing in
`website/src/` reads markdown directly.

A `Post` exposes `versions.technical?` and `versions.non-technical?`; the
frontend picks the version that matches the reader's current audience.

## Frontend

The React app is statically exported via Vite — no server runtime. The
landing page is a single interactive terminal window. Below the titlebar
there is a two-tab strip (`technical` / `non-technical`); the active tab
determines both the cwd shown in the prompt (`~/blog/posts/<audience> $`) and
which post versions are listed.

On mount at `/` the terminal auto-runs `cd blog/posts/<audience>`, then `ls -1`
(one-per-line, no mode/size/date column — the date is already in the
filename), then `grep -oP '(?<=^summary: ).*' *.md` — the summary line doubles as the
clickable preview for each post. When the URL targets a specific post
(`/posts/<slug>`) the preamble is skipped: the session opens with the prompt
already at `~/blog/posts/<audience> $` and renders the `sed` body straight
away, since the reader asked for that file and doesn't need the listing
first. Clicking a filename (from the `ls -1`
listing, the grep output, or a tag grep) runs `sed '1,/^---$/d' <slug>.md`,
which strips the YAML frontmatter so only the body renders; the output is
committed to the transcript in one shot, no character-by-character typing.
The rendered markdown goes through `react-markdown` + `remark-gfm` with
terminal-styled overrides: every element keeps the body's monospace font and
base size; `h1` is bold + uppercase + wide-tracked, `h2`-`h6` are bold, inline
code is accent-coloured, code blocks use the titlebar background, and
blockquotes/tables/hr use the dim border colour. What `sed` prints is the
body; the title is reintroduced as an `h1` by the renderer, and the tag row
appears below as clickable `#tag` buttons.

Each audience tab keeps its own scrollback; the first time a tab is focused
the terminal runs the intro in that session — `cd`, `ls -1`, and
`grep -oP '(?<=^summary: ).*' *.md` at `/`, or just the `sed` body when the
URL already targets a post — and subsequent visits resume the session where
it was left. If a post is open
and the new audience has a version of that slug, the terminal re-runs `sed`
on it; if the slug exists only in the other audience, the terminal prints
`sed: <slug>.md: No such file or directory` and offers a
`[ switch to <other> version ]` action.

The reader's audience choice persists in `localStorage` under the key
`blog:audience`; it is _not_ reflected in the URL — `/posts/<slug>` renders
whichever version the reader has selected.

On small viewports the terminal fills the screen via CSS; the drag-to-resize
state is preserved but ignored so the chrome stays full-bleed on mobile.

## GitHub file viewer

Markdown links whose `href` matches `https://github.com/<owner>/<repo>/blob/<ref>/<path>` are intercepted: clicking opens a full-viewport "vi session" overlay that fetches the file from `raw.githubusercontent.com` and renders it with syntax highlighting (`prism-react-renderer`). Line numbers in a gutter, vim-style `~` tildes past EOF, status line at the bottom, `[ :q ]` button in the top-right. Close with `Esc`, `q`, the button, or by clicking the backdrop. Non-file GitHub links (repo roots, tree paths) fall through to regular external links — extending the viewer to directory browsing would require GitHub's authenticated contents API and is out of scope for now.

## Routing

`react-router-dom`'s `BrowserRouter` (basename = Vite's `BASE_URL`) exposes
two routes:

- `/` — landing terminal (no post opened).
- `/posts/<slug>` — terminal that opens that post's version for the reader's
  current audience directly via `sed`, with no listing preamble (the prompt
  is already at `~/blog/posts/<audience> $`). If the slug has no version in
  the current audience the terminal prints
  `sed: <slug>.md: No such file or directory` in red.

Clicking a filename updates the URL via `navigate`, keeping deep-links and
the address bar in sync. The transcript is append-only — back/forward
navigation and audience-tab switches don't wipe previously-printed output.
The `build` script runs `cp dist/index.html dist/404.html` so GitHub Pages's
404 fallback serves the SPA shell for unknown paths.

## Cross-cutting concerns

- **Slugs** are derived from filenames and never stored separately; renaming
  a file changes the URL. Keep the two audience versions under the same
  filename so they stay linked.
- **Errors** in the extractor are fatal — a malformed post blocks the whole
  build so nothing silently disappears from the live site.
- **Generated data** (`website/src/generated/posts.json`) is gitignored; the
  extractor runs on every `dev`/`build` via `npm run extract`.
