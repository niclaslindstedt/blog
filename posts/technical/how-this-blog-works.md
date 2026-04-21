---
title: How this blog works
date: 2026-04-21T18:39:04Z
edited_at: 2026-04-21T18:39:04Z
tags: blog, typescript, react, static-site, agents
---

This site is a static Vite + React build. Posts are markdown files in the repo, GitHub Pages deploys on every push to `main`, and the whole thing is kept in sync by Claude skills.

## Dual-audience posts

Every post can ship two versions: `posts/technical/<slug>.md` and `posts/non-technical/<slug>.md`. Either one may exist alone — a post is published as long as it has at least one version. The filename stem is the slug, and both versions share it so they stay linked.

The reader picks an audience from a two-tab strip in the terminal chrome. The choice lives in `localStorage` under `blog:audience` and is deliberately not in the URL. `/posts/<slug>` renders whichever version the reader has selected. If the slug exists only in the other audience, the terminal prints `cat: <slug>.md: No such file or directory` and offers a switch-audience action.

## The pipeline

There is no CMS and no runtime server. The whole data flow is:

```
posts/{technical,non-technical}/*.md
    → website/scripts/extract-posts.ts
    → website/src/generated/posts.json
    → website/src/App.tsx
    → website/dist/   (static output → GitHub Pages)
```

[`extract-posts.ts`](https://github.com/niclaslindstedt/blog/blob/main/website/scripts/extract-posts.ts) is the boundary between raw markdown and the frontend. It walks both audience folders, parses YAML frontmatter, validates that `title` and `date` are present and that both `date` and `edited_at` are ISO 8601 UTC datetimes (`YYYY-MM-DDTHH:MM:SSZ`, `Z` required), derives the slug from the filename, and merges the two versions by slug into one `Post`. Stray markdown files directly under `posts/` are a fatal error.

Errors are loud by design. A malformed frontmatter field blocks the whole build, so nothing quietly disappears from the live site.

## The terminal chrome

The landing page is an interactive terminal window. It auto-runs `cd code/blog/<audience>` then `ls -l`; each filename is clickable. A click runs `cat … | head -n 10` (instant), and a `[ show more ]` action runs `cat … | tail -n +11` with a character-by-character typing animation tuned to a realistic WPM. Markdown is rendered through `react-markdown` + `remark-gfm` with terminal-styled overrides: every element keeps the monospace font, `h1` is uppercase and wide-tracked, inline code is accent-coloured, code blocks use the titlebar background.

Switching the audience tab appends `cd ../<new-audience>` and `ls -l` to the transcript rather than clearing it — normal shell scrollback semantics. Links to GitHub blob URLs (`github.com/.../blob/...`) open a full-viewport vi-style overlay that fetches the raw file and renders it with syntax highlighting, a gutter of line numbers, `~` tildes past EOF, and a status line.

## Agent-driven maintenance

Content is authored and kept in sync by Claude skills in `.claude/skills/`. Three of them handle the post lifecycle:

- `/write-post` — draft a new post across audience versions, enforce frontmatter, link bare project names via the project index.
- `/update-post` — revise an existing post in place and bump `edited_at` to the current UTC timestamp.
- `/delete-post` — remove a post and clean up internal cross-links.

The rest are drift-sync skills, owned by `/maintenance`: `/update-readme`, `/update-docs`, `/update-prompts`, `/update-project-index`, `/update-website`, `/sync-oss-spec`. Each skill owns a `SKILL.md` playbook and a `.last-updated` baseline commit hash. When the skill runs it reads the commits since that baseline, figures out which source of truth changed, and rewrites the downstream artifact. The umbrella runs them all in the correct order and leaves a single combined PR.

The structural rules every skill checks against live in [`OSS_SPEC.md`](https://github.com/niclaslindstedt/blog/blob/main/OSS_SPEC.md), the same spec published as the [`oss-spec`](https://github.com/niclaslindstedt/oss-spec) Rust CLI on [crates.io](https://crates.io/crates/oss-spec). This repo records a short list of intentional deviations in `CLAUDE.md`: no release pipeline, no CHANGELOG (the blog is continuously deployed), no CLI binary.

## Why this shape

- Posts are git-tracked. Every revision has a commit and a diff.
- Two audiences per slug means the same opinion can land differently without forking a post.
- Static output means no runtime server, no admin dashboard, no database, no invalidation story.
- Agent authorship means frontmatter validation, slug rules, and project-index linking are enforced by the tool that writes the file, not by a human remembering to check.
