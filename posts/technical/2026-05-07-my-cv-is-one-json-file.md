---
title: My CV is one JSON file
date: 2026-05-07T13:06:01Z
edited_at: 2026-05-07T13:06:01Z
summary: One schema-validated JSON object reprojected into a React site, two PDFs, an OG image, a sitemap, a search index, and an /llms.txt for agents.
tags: cv, typescript, react, vite, resume
---

[cv](https://github.com/niclaslindstedt/cv) is my personal site and résumé, live at [niclaslindstedt.se](https://niclaslindstedt.se). The interesting bit isn't the React app — it's that the CV is a single JSON object, schema-validated at build time, and re-projected into every visible artifact: the rendered site, a bilingual PDF, an OG share image, a sitemap, an in-page search index, and a couple of agent-facing files at `/resume.json` and `/llms.txt`.

## The data, and why an agent can edit it

The CV data is spread across several JSON files in `src/data/cv/` — `projects.json`, `experience.json`, `companies.json`, `skills.json`, and so on — deep-merged at build time into a single assembled object. Every consumer — the Vite plugin, the print pipeline, the validator, the `/resume.json` generator — works from that same assembled object, so the shape is identical in every context.

`validate-cv.mjs`<sup>[1](https://github.com/niclaslindstedt/cv/blob/7e1f94a4a53fa0c1c37aeb21024fc16bf8a570b3/scripts/validate-cv.mjs)</sup> runs the assembled object through AJV against `schemas/cv.schema.json`. Anything that breaks the schema fails the build before TypeScript ever sees it.

That's why a coding agent can update it. The schema is the contract; the validator tells the agent whether an edit is well-formed before anything ships. To bootstrap the data I pasted in an old CV and let the agent turn it into the structured shape — from there it's just normal editing. Updating Word PDFs has always been a pain and working with Word files through an agent is not optimal — it never looks as good as I want it to. The CV project has been iterated on until it just feels right.

## Local overrides

One layer doesn't ship publicly. `cv.local.json` is gitignored and deep-merged on top of the assembled CV when `CV_LOCAL=1` is set — full contact details, longer descriptions, anything I don't want indexed on the open web. `make local` runs the build with the override active and produces a separate set of PDFs under a different filename. That's the version I actually send when I apply for a job; the public site stays scrubbed.

## The surfaces

The React site is the obvious one. Less obvious: the same assembled CV drives every other artifact.

- **Bilingual PDF (EN/SV).** `generate-print-html.mjs` server-side renders a separate `<PrintView />` to `dist/print-en.html` and `dist/print-sv.html`. `generate-pdf.mjs`<sup>[2](https://github.com/niclaslindstedt/cv/blob/7e1f94a4a53fa0c1c37aeb21024fc16bf8a570b3/scripts/generate-pdf.mjs)</sup> serves `dist/` over a tiny localhost HTTP server, opens each print HTML in headless Chromium with Puppeteer, and exports `cv-en.pdf` / `cv-sv.pdf`. The PDF generator never boots the SPA — no hydration, no `<details>` to expand, no font race conditions. Output is byte-stable run to run, and `pdf-lib` stamps Title, Author, Subject, and Keywords on the way out.
- **OG share image.** `generate-og-image.mjs` renders a 1200×630 PNG via [satori](https://github.com/vercel/satori) into `public/og-image.png` during prebuild.
- **`/resume.json` (with `/cv.json` alias).** `generate-resume-json.mjs` writes the fully assembled CV to `dist/resume.json` so agents can fetch the structured source instead of scraping HTML. `dist/cv.json` is a byte-identical alias for the path LLMs commonly guess. Discoverable via `robots.txt`, `sitemap.xml`, and a `<link rel="alternate" type="application/json">` in `<head>`.
- **`/llms.txt`.** `generate-llms-txt.mjs`<sup>[3](https://github.com/niclaslindstedt/cv/blob/7e1f94a4a53fa0c1c37aeb21024fc16bf8a570b3/scripts/generate-llms-txt.mjs)</sup> writes a small markdown index following the [llmstxt.org](https://llmstxt.org/) convention, with the experience and side-project sections baked inline so an agent that only fetches this one file can still answer "which jobs are listed there".
- **Sitemap.** `generate-sitemap.mjs` emits `dist/sitemap.xml` listing `/`, `/timeline`, `/resume.json`, `/cv.json`, and `/llms.txt`.
- **Standalone `/timeline`.** `generate-timeline-html.mjs` copies `dist/index.html` to `dist/timeline.html` with the `<head>` retargeted (canonical URL, title, description, OG/Twitter) so direct hits to `/timeline` resolve to a 200 response on GitHub Pages instead of falling through to `404.html`. The SPA still owns rendering.
- **Search index.** `generate-search-index.mjs` builds `src/data/search-index.json` from the CV plus hidden `aliases` on individual records, ranked by a hand-written scorer in `src/utils/search.ts`.

Two small Vite plugins in `vite.config.ts` hold the pipeline together. `cv-assembly` resolves the JSON placeholders during dev and build, so the React app imports a single fully-resolved object via `src/data/cv.ts`. `cvMetaHtmlPlugin` injects the SEO `<head>` block at build time — Open Graph and Twitter card meta, the canonical URL, and JSON-LD for `Person` and `WebSite` derived from `cv.meta`, `cv.links`, `cv.skills`, and `cv.education`.

The build chain is `tsc -b → vite build → generate:print-html → generate:pdf → generate:resume-json → generate:llms-txt → generate:timeline-html → generate:sitemap`, with prebuild hooks for the timeline data, GitHub activity, per-project commit stats, print JSON, search index, and OG image. The data fetchers degrade gracefully when their tokens are missing — the GitHub commit track and per-project stats simply drop out instead of failing the build.

## Progressive disclosure

The web CV exposes a lot, but it doesn't shove it at you. Top level: the summary, the focus areas, the projects, the jobs, the skills, the degrees, the languages — each as a card. Click a project and you get the full description, the stack, the commit history. Click an education entry and you get the program structure, the courses, the credit transfers. The course lists for an entire degree are right there if you want them, but they're behind a click — don't click programs if you don't want course lists. The front page stays scannable; the depth is there for the readers who actually want it. The PDF respects the same idea by collapsing the deep stuff entirely.

## The timeline

The timeline page does something a flat CV can't: it shows how things relate to each other in time. Overlapping engagements, parallel side projects, gaps and clusters — all visible at a glance. It's a separate page (`/timeline`), but it reads from the same `experience.json` and `projects.json` that everything else does.
