# Configuration

## Post layout

Every post has up to **two versions** — one for each reader audience. The
filename stem is the slug (shared between versions); the folder is the
audience. Filenames are date-prefixed (`YYYY-MM-DD-<slug>.md`) so the date
shows up directly in the terminal listing:

```
posts/
  technical/YYYY-MM-DD-<slug>.md      # version aimed at technical readers
  non-technical/YYYY-MM-DD-<slug>.md  # version aimed at non-technical readers
```

The date prefix matches the frontmatter `date` (the `YYYY-MM-DD` part) and is
part of the URL path. Both audience versions of a post use the same filename.

Either file may exist on its own; a post is published as long as it has at
least one version. When both exist they share the same slug and are linked
together in the UI via the audience tab bar. Files directly under `posts/`
(outside a subfolder) are rejected by the extractor.

## Post frontmatter

Each version file (in either audience folder) must have YAML frontmatter with
exactly these fields:

| Field       | Type                        | Required | Description                                                                                                                                                                                                                                                                                                                                        |
| ----------- | --------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`     | string                      | yes      | Display title shown in the list                                                                                                                                                                                                                                                                                                                    |
| `date`      | ISO 8601 UTC dt             | yes      | Publication timestamp (`YYYY-MM-DDTHH:MM:SSZ`, `Z` required)                                                                                                                                                                                                                                                                                       |
| `edited_at` | ISO 8601 UTC dt             | no       | Last-edit timestamp (`YYYY-MM-DDTHH:MM:SSZ`, `Z` required); defaults to `date`                                                                                                                                                                                                                                                                     |
| `summary`   | single line                 | yes      | One-sentence lede shown in the list view as the clickable preview — the terminal renders it via `grep -oP '(?<=^summary: ).*' *.md` after `ls -1`, and the prose fallback renders it under the title. Keep it on a single line, no line breaks.                                                                                                    |
| `tags`      | comma-separated single line | no       | Subject tags, lowercase and hyphenated (e.g. `tags: juris, python, release-notes`). First tag is the project slug from `.agent/project-index/INDEX.md` when the post is about one specific project. Used by the authoring skills to locate the most recent post about a subject and summarise commit history since then.                           |
| `keywords`  | comma-separated single line | no       | Search-only synonyms and alternative phrasings the reader might type — concepts, abbreviations, plain-language equivalents. Never rendered on the page; fed only into the build-time search index emitted at `website/src/generated/search-index.json`. Per-audience. See `.agent/skills/write-post/SKILL.md` § "Authoring keywords" for guidance. |

Timestamps must be ISO 8601 datetimes in UTC — i.e. end with `Z`. Local
timezones and date-only values (`YYYY-MM-DD`) are rejected by the extractor.
Example: `2026-04-21T14:30:00Z`. Fractional seconds are allowed but not
required.

The title lives in frontmatter — not as a `#` heading at the top of the body.
The two versions of the same slug may diverge on `title`, `date`, and
`edited_at`; the list view prefers the `technical` version's title when both
exist.

## Post body

The body is GitHub-flavored Markdown. Two non-standard conveniences are
applied at render time:

- **Images.** Standard `![alt text](https://example.com/image.png)` works.
  Images render as block-level, full column-width, with `loading="lazy"` and
  the alt text becoming the accessible label. SVGs, PNGs, JPGs, and WebPs
  all work.
- **YouTube videos.** A paragraph that contains nothing but a YouTube URL
  (either bare or as a markdown link) is replaced with a 16:9 responsive
  iframe pointing at `youtube-nocookie.com`. All of the canonical URL
  shapes are recognised:

  ```
  https://www.youtube.com/watch?v=dQw4w9WgXcQ
  https://youtu.be/dQw4w9WgXcQ
  https://www.youtube.com/embed/dQw4w9WgXcQ
  https://www.youtube.com/shorts/dQw4w9WgXcQ
  ```

  Inline YouTube links (mid-sentence) keep their normal hyperlink
  behaviour — only standalone-paragraph URLs become embeds.

## Reader audience

The frontend remembers the reader's choice in `localStorage` under the key
`blog:audience` (values: `technical` or `non-technical`). The initial default
is `technical`. Switching tabs animates `cd ../<audience>` and re-runs `ls -1`
in the new folder so the terminal illusion stays consistent.

## Build environment variables

| Variable                    | Default | Description                                                                                                                                                                                    |
| --------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BASE_URL`                  | `/`     | URL prefix for all generated links. Set to `/blog/` for subpath deploys.                                                                                                                       |
| `VITE_GOATCOUNTER_ENDPOINT` | unset   | Full GoatCounter count URL (e.g. `https://<code>.goatcounter.com/count`). When unset, the `useAnalytics` hook no-ops, so local dev and previews record no traffic. See `website/.env.example`. |

## Website build

The React site is configured via `website/package.json` scripts. The `extract`
script runs first (`tsx scripts/extract-posts.ts`) and produces
`website/src/generated/posts.json`. Both `dev` and `build` chain through
`extract`, so the generated file is never stale.
