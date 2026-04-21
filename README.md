# blog

A retro pixel-art React blog where posts are git-tracked markdown files authored and managed via Claude skills.

[![CI](https://github.com/niclaslindstedt/blog/actions/workflows/ci.yml/badge.svg)](https://github.com/niclaslindstedt/blog/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Why?

- Posts are plain markdown files in-repo — no CMS, no database, full git history and diff-friendly content.
- Claude skills for write/update/delete drive an iterative draft workflow with consistent tone baked into every prompt.
- Retro pixel aesthetic sets a distinctive visual identity that pairs with the linked CV site.
- Slug-as-filename convention makes URLs predictable and refactoring trivial.
- Static-exportable React architecture keeps hosting free and deployment a single git push.


## Prerequisites

- Node.js ≥ 20
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
make build              # process posts and build the static React site
npx serve website/dist  # preview locally at http://localhost:3000
```

## Usage

### Writing posts

Posts live as markdown files under `posts/`. The filename is the slug — `posts/hello-world.md` becomes `/hello-world` in the browser.

Frontmatter controls metadata:

```yaml
---
title: Hello World
date: 2024-01-15
tags: [meta, welcome]
draft: false
---

Your content here.
```

Use Claude skills to author and maintain posts without leaving your editor:

| Skill | What it does |
|---|---|
| `write-post` | Draft a new post from a topic description |
| `update-post` | Revise an existing post in-place |
| `delete-post` | Remove a post and clean up references |

### Deploying

```sh
git push   # CI builds and publishes to GitHub Pages automatically
```

## Configuration

See [docs/configuration.md](docs/configuration.md) for build options and environment variables.

## Examples

See [`examples/`](examples/) for sample post files.

## Troubleshooting

_Common failure modes and fixes._

## Documentation

- [Getting started](docs/getting-started.md)
- [Configuration](docs/configuration.md)
- [Architecture](docs/architecture.md)
- [Troubleshooting](docs/troubleshooting.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Licensed under [MIT](LICENSE).