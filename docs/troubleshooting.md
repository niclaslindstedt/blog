# Troubleshooting

Common failure modes and how to fix them.

## `extract-posts: <file>: missing YAML frontmatter opening '---'`

- **Symptom** — `npm run build` (or `npm run extract`) aborts on a specific post file.
- **Cause** — The file does not start with `---\n`. Every post version must open with a YAML frontmatter block.
- **Fix** — Add the frontmatter block at the very top of the file:

  ```markdown
  ---
  title: My Post
  date: 2026-04-21T14:30:00Z
  ---
  ```

- **Prevention** — Author posts via the `/write-post` skill; it always emits correct frontmatter.

## `extract-posts: <file>: 'date' must be ISO 8601 UTC datetime`

- **Symptom** — Extractor rejects a post because its `date` or `edited_at` field is not a UTC datetime.
- **Cause** — The field is a date-only value (`YYYY-MM-DD`), uses a local timezone offset, or is missing the trailing `Z`. The extractor enforces full UTC datetimes so list-view sort order is unambiguous.
- **Fix** — Rewrite the timestamp as `YYYY-MM-DDTHH:MM:SSZ` (e.g. `2026-04-21T14:30:00Z`). Fractional seconds are allowed but not required.
- **Prevention** — Use the `/update-post` skill, which rewrites `edited_at` with the current UTC timestamp.

## `extract-posts: posts under posts/ must live in posts/technical/ or posts/non-technical/`

- **Symptom** — Extractor fatally errors listing one or more stray `.md` files at the top of `posts/`.
- **Cause** — A post was created directly under `posts/` instead of under `posts/technical/` or `posts/non-technical/`.
- **Fix** — Move the file into the matching audience folder, keeping the filename (slug) unchanged.
- **Prevention** — Always author with the `/write-post` skill, which writes to the audience folders.

## `extract-posts: <file>: frontmatter missing required 'title'` / `'date'`

- **Symptom** — Extractor rejects a post for missing a required frontmatter field.
- **Cause** — The frontmatter block is present but `title` or `date` is missing. These are the only two required fields; `edited_at` defaults to `date`.
- **Fix** — Add the missing field. `title` is a plain string, `date` is an ISO 8601 UTC datetime.
- **Prevention** — Use `/write-post` for new posts.

## Blank page on GitHub Pages, assets return 404

- **Symptom** — The deployed site loads `index.html` but JS/CSS assets 404.
- **Cause** — `BASE_URL` was not set at build time, so asset URLs resolve to `/` instead of `/blog/`.
- **Fix** — Build with `BASE_URL=/blog/ npm run build` (the `pages.yml` workflow already does this). For other subpath deploys, set `BASE_URL` to the matching prefix.
- **Prevention** — Leave the `pages.yml` workflow in charge of GitHub Pages deploys.
