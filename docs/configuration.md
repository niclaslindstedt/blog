# Configuration

## Post layout

Every post has up to **two versions** — one for each reader audience. The
filename stem is the slug (shared between versions); the folder is the
audience:

```
posts/
  technical/<slug>.md      # version aimed at technical readers
  non-technical/<slug>.md  # version aimed at non-technical readers
```

Either file may exist on its own; a post is published as long as it has at
least one version. When both exist they share the same slug and are linked
together in the UI via the audience tab bar. Files directly under `posts/`
(outside a subfolder) are rejected by the extractor.

## Post frontmatter

Each version file (in either audience folder) must have YAML frontmatter with
exactly these fields:

| Field       | Type                        | Required | Description                                                                                                                                                                                                                                                                                                              |
| ----------- | --------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `title`     | string                      | yes      | Display title shown in the list                                                                                                                                                                                                                                                                                          |
| `date`      | ISO 8601 UTC dt             | yes      | Publication timestamp (`YYYY-MM-DDTHH:MM:SSZ`, `Z` required)                                                                                                                                                                                                                                                             |
| `edited_at` | ISO 8601 UTC dt             | no       | Last-edit timestamp (`YYYY-MM-DDTHH:MM:SSZ`, `Z` required); defaults to `date`                                                                                                                                                                                                                                           |
| `tags`      | comma-separated single line | no       | Subject tags, lowercase and hyphenated (e.g. `tags: juris, python, release-notes`). First tag is the project slug from `.agent/project-index/INDEX.md` when the post is about one specific project. Used by the authoring skills to locate the most recent post about a subject and summarise commit history since then. |

Timestamps must be ISO 8601 datetimes in UTC — i.e. end with `Z`. Local
timezones and date-only values (`YYYY-MM-DD`) are rejected by the extractor.
Example: `2026-04-21T14:30:00Z`. Fractional seconds are allowed but not
required.

The title lives in frontmatter — not as a `#` heading at the top of the body.
The two versions of the same slug may diverge on `title`, `date`, and
`edited_at`; the list view prefers the `technical` version's title when both
exist.

## Reader audience

The frontend remembers the reader's choice in `localStorage` under the key
`blog:audience` (values: `technical` or `non-technical`). The initial default
is `technical`. Switching tabs animates `cd ../<audience>` and re-runs `ls -l`
in the new folder so the terminal illusion stays consistent.

## Build environment variables

| Variable   | Default | Description                                                              |
| ---------- | ------- | ------------------------------------------------------------------------ |
| `BASE_URL` | `/`     | URL prefix for all generated links. Set to `/blog/` for subpath deploys. |

## Website build

The React site is configured via `website/package.json` scripts. The `extract`
script runs first (`tsx scripts/extract-posts.ts`) and produces
`website/src/generated/posts.json`. Both `dev` and `build` chain through
`extract`, so the generated file is never stale.
