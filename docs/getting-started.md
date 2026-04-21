# Getting started with blog

> A retro pixel-art React blog where posts are git-tracked markdown files authored and managed via Claude skills.

## Install

Requires Node.js ≥ 20 and npm ≥ 10.

```sh
git clone https://github.com/niclaslindstedt/blog.git
cd blog
npm install
cd website && npm install && cd ..
```

## First run

**1. Write your first post.**

Create `posts/hello-world.md`:

```markdown
---
title: Hello World
date: 2026-04-21
tags: [meta]
draft: false
---

This is my first post. Welcome to the blog.
```

The filename stem (`hello-world`) becomes the URL path — keep it lowercase and hyphen-separated.

**2. Build the site.**

```sh
make build
```

This runs the content pipeline (`src/`) which processes every file under `posts/`, then builds the React frontend under `website/dist/`.

**3. Preview locally.**

```sh
npx serve website/dist
```

Open `http://localhost:3000` and you should see your post listed on the home page. Click through to read it.

**4. Commit and deploy.**

```sh
git add posts/hello-world.md
git commit -m "docs: add hello-world post"
git push
```

The `pages.yml` workflow builds and publishes the site to GitHub Pages automatically.

## Next steps

- [Configuration reference](configuration.md) — build options, frontmatter schema
- [Architecture overview](architecture.md) — how the pipeline and frontend fit together
- [Troubleshooting](troubleshooting.md) — common failure modes