# Getting started with blog

> Writing about AI, agents, and open source — hands-on notes from building tools like zag, zad, ztf, zig, and oss-spec.

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

The easiest path is the `/write-post` Claude skill — it asks for a title and a body, derives a slug from the title, and writes one file per audience. Each post has up to two versions: one for technical readers and one for non-technical readers. The skill produces `posts/technical/2026-04-21-hello-world.md` and `posts/non-technical/2026-04-21-hello-world.md`:

```markdown
---
title: Hello World
date: 2026-04-21T14:30:00Z
edited_at: 2026-04-21T14:30:00Z
---

This is my first post. Welcome to the blog.
```

Timestamps are ISO 8601 in UTC — they must end with `Z`.

The filename stem (`2026-04-21-hello-world`) becomes the URL path — it starts with a `YYYY-MM-DD-` date prefix (matching the frontmatter `date`) followed by a lowercase, hyphen-separated slug. Keep the filename identical across both audience folders so the versions stay linked. The title stays in frontmatter; do not repeat it as a `#` heading.

Only one version is strictly required — a post is published as long as it has at least one of the two files. Readers pick an audience via a tab in the terminal UI.

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
git add posts/technical/2026-04-21-hello-world.md posts/non-technical/2026-04-21-hello-world.md
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
