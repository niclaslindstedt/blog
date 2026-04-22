# blog

[![ci](https://github.com/niclaslindstedt/blog/actions/workflows/ci.yml/badge.svg)](https://github.com/niclaslindstedt/blog/actions/workflows/ci.yml)
[![pages](https://github.com/niclaslindstedt/blog/actions/workflows/pages.yml/badge.svg)](https://github.com/niclaslindstedt/blog/actions/workflows/pages.yml)
[![license](https://img.shields.io/badge/license-All%20rights%20reserved-red)](LICENSE)

Source for Niclas Lindstedt's personal blog — markdown posts rendered through a terminal-themed React frontend, deployed to GitHub Pages on every push to `main`.

## Why?

- **Git-tracked content.** Posts live as markdown files in the repo, so every revision has a commit and a diff.
- **Dual audience per post.** Every post can ship a `technical/YYYY-MM-DD-<slug>.md` and a `non-technical/YYYY-MM-DD-<slug>.md` version; readers pick their audience in the UI.
- **Agent-authored.** Content is written, revised, and deleted via Claude skills (`/write-post`, `/update-post`, `/delete-post`) that enforce the frontmatter schema.
- **No CMS.** The whole site is a Vite + React build that emits static files — there is no runtime server, admin dashboard, or database.
- **Conforms to [`OSS_SPEC.md`](OSS_SPEC.md).** Repository layout, automation, and governance follow the same spec across every project in the author's portfolio.

## Prerequisites

- [Node.js](https://nodejs.org/) ≥ 24 (pinned via `.nvmrc`)
- npm ≥ 10

## Install

```sh
git clone https://github.com/niclaslindstedt/blog.git
cd blog
npm install
cd website && npm install && cd ..
```

## Quick start

Author a new post:

```sh
# From a Claude Code session:
/write-post
```

Or create the files by hand under `posts/technical/YYYY-MM-DD-<slug>.md` and/or `posts/non-technical/YYYY-MM-DD-<slug>.md` (the `YYYY-MM-DD-` date prefix matches the frontmatter `date` and shows up directly in the terminal's `ls -1` listing):

```markdown
---
title: Hello World
date: 2026-04-21T14:30:00Z
edited_at: 2026-04-21T14:30:00Z
---

This is my first post.
```

Build and preview:

```sh
cd website
npm run build
npx serve dist
```

Open `http://localhost:3000`.

## Usage

The root `Makefile` exposes the canonical commands:

| Target           | What it does                                                            |
| ---------------- | ----------------------------------------------------------------------- |
| `make build`     | Installs website deps (offline-preferred) and runs the production build |
| `make test`      | Runs the Node test runner over `tests/**/*_test.ts`                     |
| `make lint`      | Runs ESLint with `--max-warnings 0`                                     |
| `make fmt`       | Rewrites every tracked file through Prettier                            |
| `make fmt-check` | Verifies Prettier formatting without writing (used in CI)               |

Authoring skills (invoked inside a Claude Code session):

| Skill          | When to run                                                        |
| -------------- | ------------------------------------------------------------------ |
| `/write-post`  | Draft a new post across both audience versions                     |
| `/update-post` | Revise an existing post in-place; bumps `edited_at` to current UTC |
| `/delete-post` | Remove a post and clean up internal cross-links                    |
| `/maintenance` | Run every `update-*` sync skill in the correct order               |

## Configuration

- **Post frontmatter.** Exactly `title`, `date`, `edited_at`. `date` and `edited_at` are ISO 8601 UTC datetimes (`YYYY-MM-DDTHH:MM:SSZ`). See [`docs/configuration.md`](docs/configuration.md).
- **Build env vars.** `BASE_URL` (default `/`) sets the URL prefix for generated assets. GitHub Pages deploys set it to `/blog/`.

## Examples

The `posts/` directory is itself the example set — browse `posts/technical/` and `posts/non-technical/` for published posts. Any post added to either folder is picked up by the extractor on the next build.

## Troubleshooting

See [`docs/troubleshooting.md`](docs/troubleshooting.md) for common extractor errors, frontmatter schema violations, and deploy-time asset-path issues.

## Documentation

- [`docs/getting-started.md`](docs/getting-started.md) — install, first-post walkthrough, deploy
- [`docs/configuration.md`](docs/configuration.md) — frontmatter schema, build options
- [`docs/architecture.md`](docs/architecture.md) — module layout and data flow
- [`docs/troubleshooting.md`](docs/troubleshooting.md) — common failure modes
- [`OSS_SPEC.md`](OSS_SPEC.md) — the structural spec this repo conforms to
- [`AGENTS.md`](AGENTS.md) — authoritative guidance for AI coding agents

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Commits follow [Conventional Commits](https://www.conventionalcommits.org/); PRs are squash-merged with the PR title as the commit message.

## License

Copyright © 2026 Niclas Lindstedt. All rights reserved. See [LICENSE](LICENSE). The source code and post content are not licensed for redistribution, modification, or derivative works.
