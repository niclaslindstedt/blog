# Configuration

## Post frontmatter

Every file under `posts/` must have YAML frontmatter. Required fields:

| Field   | Type     | Description |
|---------|----------|-------------|
| `title` | string   | Display title shown in the post header and list |
| `date`  | ISO 8601 | Publication date (`YYYY-MM-DD`) |

Optional fields:

| Field    | Type     | Default  | Description |
|----------|----------|----------|-------------|
| `tags`   | string[] | `[]`     | Topic labels shown below the title |
| `draft`  | boolean  | `false`  | When `true`, excluded from the build output |
| `description` | string | — | Short summary used in `<meta>` tags |

## Build environment variables

Set these in your shell or in a `.env` file at the project root.

| Variable           | Default | Description |
|--------------------|---------|-------------|
| `POSTS_DIR`        | `posts` | Directory scanned for markdown files |
| `OUT_DIR`          | `website/src/generated` | Where pipeline output is written |
| `BASE_URL`         | `/`     | URL prefix for all generated links |
| `INCLUDE_DRAFTS`   | `false` | Set to `true` to include draft posts in the build |

## Website build

The React site is configured via `website/package.json` scripts. No additional configuration file is required for a basic GitHub Pages deploy.

To serve the site under a subpath (e.g. `https://user.github.io/blog`), set `BASE_URL=/blog/` before running `make build`.
