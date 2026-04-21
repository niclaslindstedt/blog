# Configuration

## Post frontmatter

Every file under `posts/` must have YAML frontmatter with exactly these fields:

| Field       | Type     | Required | Description                                       |
| ----------- | -------- | -------- | ------------------------------------------------- |
| `title`     | string   | yes      | Display title shown in the list                   |
| `date`      | ISO 8601 | yes      | Publication date (`YYYY-MM-DD`)                   |
| `edited_at` | ISO 8601 | no       | Last-edit date (`YYYY-MM-DD`); defaults to `date` |

The title lives in frontmatter — not as a `#` heading at the top of the body.

## Build environment variables

| Variable   | Default | Description                                                              |
| ---------- | ------- | ------------------------------------------------------------------------ |
| `BASE_URL` | `/`     | URL prefix for all generated links. Set to `/blog/` for subpath deploys. |

## Website build

The React site is configured via `website/package.json` scripts. The `extract` script runs first (`tsx scripts/extract-posts.ts`) and produces `website/src/generated/posts.json`. Both `dev` and `build` chain through `extract`, so the generated file is never stale.
