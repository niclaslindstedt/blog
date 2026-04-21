# Architecture of blog

## Module layout

```
posts/               markdown source files (one per post, slug-as-filename)
src/                 Node.js content pipeline
  index.js           entry point — discovers posts, orchestrates the build
  output.js          serialises processed posts to website/src/generated/
website/             React frontend (static-exportable)
  src/
    generated/       pipeline output — never edit by hand
  scripts/
    extract-source-data.mjs   consumed by the website build
prompts/             versioned Claude prompt templates (write/update/delete)
```

## Data flow

```
posts/*.md  ──► src/ (parse frontmatter + body)
                     │
                     ▼
            website/src/generated/*.json
                     │
                     ▼
            website/src/ (React components)
                     │
                     ▼
            website/dist/ (static output → GitHub Pages)
```

`src/` owns the boundary between raw markdown and the frontend. It parses frontmatter, validates required fields (title, date, draft), derives the slug from the filename, and writes one JSON file per post plus an index manifest. Nothing in `website/` reads markdown directly.

## Frontend

The React app is statically exported — no server runtime. On build, it reads the generated JSON and pre-renders every post and list page. The pixel-art theme is pure CSS; no runtime style library is needed.

## Prompt templates

`prompts/<skill>/<version>.md` are the Claude prompt templates referenced by the `write-post`, `update-post`, and `delete-post` skills. Each template encodes the expected frontmatter schema, tone guidelines, and formatting rules. Versioning by filename lets the skills pin to a known prompt while newer iterations are developed alongside.

## Cross-cutting concerns

- **Slugs** are derived from filenames and never stored separately; renaming a file changes the URL.
- **Drafts** (`draft: true` in frontmatter) are excluded from the pipeline output and never appear in the built site.
- **Errors** in the pipeline are fatal by default — a malformed post blocks the whole build so nothing silently disappears from the live site.