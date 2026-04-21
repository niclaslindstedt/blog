# blog

A retro pixel-art React blog where posts are git-tracked markdown files authored and managed via Claude skills.

[![CI](https://github.com/niclaslindstedt/blog/actions/workflows/ci.yml/badge.svg)](https://github.com/niclaslindstedt/blog/actions/workflows/ci.yml)
[![License: All Rights Reserved](https://img.shields.io/badge/license-All%20Rights%20Reserved-red.svg)](LICENSE)

## Why?

- Posts are plain markdown files in-repo — no CMS, no database, full git history and diff-friendly content.
- Claude skills for write/update/delete drive an iterative draft workflow with consistent conventions baked into every prompt.
- Retro pixel aesthetic sets a distinctive visual identity that pairs with the linked CV site.
- Slug-as-filename convention makes URLs predictable and refactoring trivial.
- Static-exportable React + TypeScript architecture keeps hosting free and deployment a single git push.

## Prerequisites

- Node.js ≥ 24
- npm ≥ 10

## Install

```sh
git clone https://github.com/niclaslindstedt/blog.git
cd blog
npm install
cd website && npm install && cd ..
```

## Quick start

```sh
cd website
npm run dev              # preview locally at http://localhost:5173
npm run build            # produce website/dist/
npx serve website/dist   # serve the built output
```

## Usage

### Writing posts

Posts live as markdown files under `posts/`. The filename is the slug — `posts/hello-world.md` becomes `/hello-world` in the browser.

Frontmatter carries only three fields:

```yaml
---
title: Hello World
date: 2026-04-21
edited_at: 2026-04-21
---
Your content here.
```

- `title` and `date` are required; `edited_at` defaults to `date` on creation.
- On every edit, `edited_at` is bumped to today — the `update-post` skill handles this automatically.
- The title comes from frontmatter. Do not repeat it as a `#` heading at the top of the body.

Use Claude skills to author and maintain posts without leaving your editor:

| Skill         | What it does                                         |
| ------------- | ---------------------------------------------------- |
| `write-post`  | Draft a new post at `posts/<slug>.md`                |
| `update-post` | Revise an existing post in-place (bumps `edited_at`) |
| `delete-post` | Remove a post and clean up cross-links               |

### Deploying

```sh
git push   # CI builds and publishes to GitHub Pages automatically
```

## Configuration

See [docs/configuration.md](docs/configuration.md) for frontmatter schema and build options.

## Examples

See [`examples/`](examples/) for sample files.

## Documentation

- [Getting started](docs/getting-started.md)
- [Configuration](docs/configuration.md)
- [Architecture](docs/architecture.md)
- [Troubleshooting](docs/troubleshooting.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

All rights reserved. See [LICENSE](LICENSE). Copying, modification, or
redistribution of source code or post content requires prior written
permission.
