# Getting started with blog

> A retro pixel-art React blog where posts are git-tracked markdown files authored and managed via Claude skills.

## Install

Requires Node.js ≥ 24 and npm ≥ 10.

```sh
git clone https://github.com/niclaslindstedt/blog.git
cd blog
npm install
cd website && npm install && cd ..
```

## First run

**1. Write your first post.**

The easiest path is the `/write-post` Claude skill — it asks for a title and a body, derives a slug from the title, and writes the file for you. The skill produces `posts/hello-world.md`:

```markdown
---
title: Hello World
date: 2026-04-21
edited_at: 2026-04-21
---

This is my first post. Welcome to the blog.
```

The filename stem (`hello-world`) becomes the URL path — keep it lowercase and hyphen-separated. The title stays in frontmatter; do not repeat it as a `#` heading.

**2. Build the site.**

```sh
cd website
npm run build
```

This runs the extractor (which validates every file under `posts/`) and then builds the React frontend under `website/dist/`.

**3. Preview locally.**

```sh
npx serve website/dist
```

Open `http://localhost:3000` and you should see your post listed on the home page.

**4. Commit and deploy.**

```sh
git add posts/hello-world.md
git commit -m "docs: add hello-world post"
git push
```

The `pages.yml` workflow builds and publishes the site to GitHub Pages automatically.

## Editing and removing posts

- `/update-post` revises an existing post in-place and bumps `edited_at` to today.
- `/delete-post` removes a post after confirmation and cleans up any cross-links in `posts/` and `docs/`.

## Next steps

- [Configuration reference](configuration.md) — frontmatter schema, build options
- [Architecture overview](architecture.md) — how the extractor and frontend fit together
- [Troubleshooting](troubleshooting.md) — common failure modes
