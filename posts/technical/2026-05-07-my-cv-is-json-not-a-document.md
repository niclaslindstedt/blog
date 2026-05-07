---
title: My CV is JSON, not a document
date: 2026-05-07T13:06:01Z
edited_at: 2026-05-07T13:50:39Z
summary: One schema-validated JSON object reprojected into a React site, two PDFs, an OG image, a sitemap, a search index, and an /llms.txt for agents.
tags: cv, typescript, react, vite, resume
---

[cv](https://github.com/niclaslindstedt/cv) is my personal site and résumé, live at [niclaslindstedt.se](https://niclaslindstedt.se). The interesting bit isn't the React app — it's that the CV is a single JSON object, schema-validated at build time, and re-projected into every visible artifact: the rendered site, a bilingual PDF, an OG share image, a sitemap, an in-page search index, and a couple of agent-facing files at `/resume.json` and `/llms.txt`.

## The data, and why an agent can edit it

The CV data lives across a handful of JSON files — one per category, like `projects.json`, `experience.json`, `companies.json`, `skills.json`. They get merged at build time into one assembled object, and everything else reads from that: the React app, the PDF pipeline, the validator, the `/resume.json` generator. One shape, one source.

A small validator<sup>[1](https://github.com/niclaslindstedt/cv/blob/7e1f94a4a53fa0c1c37aeb21024fc16bf8a570b3/scripts/validate-cv.mjs)</sup> runs the assembled object through the JSON Schema in `schemas/cv.schema.json` before anything ships. Anything that breaks the schema fails the build.

That's why a coding agent can update it. The schema is the contract; the validator tells the agent whether an edit is well-formed before it lands. To bootstrap the data I pasted in an old CV and let the agent turn it into the structured shape — from there it's just normal editing. Updating Word PDFs has always been a pain and working with Word files through an agent is not optimal — it never looks as good as I want it to. The CV project has been iterated on until it just feels right.

An `update-cv` skill in the repo<sup>[2](https://github.com/niclaslindstedt/cv/blob/7e1f94a4a53fa0c1c37aeb21024fc16bf8a570b3/.agent/skills/update-cv/SKILL.md)</sup> codifies the editing rules so the agent doesn't have to guess. It picks the right file, runs the validator before declaring done, and — because most user-facing strings are `{ "en": ..., "sv": ... }` pairs — writes the Swedish version alongside the English whenever I add or revise a description. Both end up at the same level of polish; the Swedish copy isn't a translation pass tacked on after the fact.

## Local overrides

One layer doesn't ship publicly. `cv.local.json` is gitignored and deep-merged on top of the assembled CV when `CV_LOCAL=1` is set — full contact details, longer descriptions, anything I don't want indexed on the open web. `make local` runs the build with the override active and produces a separate set of PDFs under a different filename. That's the version I actually send when I apply for a job; the public site stays scrubbed.

## Side-project commit stats

Not all the CV data is hand-written. Per-project commit stats — total commits, first and last commit dates, year-by-year activity — get pulled from the GitHub GraphQL API at build time<sup>[3](https://github.com/niclaslindstedt/cv/blob/7e1f94a4a53fa0c1c37aeb21024fc16bf8a570b3/scripts/generate-project-stats.mjs)</sup>. For open-source projects, only my own commits count toward the totals, not those of every contributor. The numbers show up on each project card and are inlined into `/resume.json` so an agent fetching the JSON gets the activity data without an extra API roundtrip.

Token-less builds (a fresh clone, an external contributor's PR, an ad-hoc local PDF) fall back to a cached copy on a separate `data-cache` git branch that a scheduled workflow refreshes. The CV doesn't blow up because GitHub returned a 401.

## The surfaces

The React site is the obvious one. Less obvious: the same assembled CV drives every other artifact.

- **A bilingual PDF, English and Swedish.** A simpler print-only layout gets rendered to static HTML, then opened in a headless browser and saved as a PDF<sup>[4](https://github.com/niclaslindstedt/cv/blob/7e1f94a4a53fa0c1c37aeb21024fc16bf8a570b3/scripts/generate-pdf.mjs)</sup>. The PDF doesn't go through the React app at all, so what comes out is identical every time. PDF metadata (Title, Author, Subject, Keywords) gets stamped on the way out so the file shows up correctly in document readers and search results.

- **A social share image** — the 1200×630 banner that appears as the preview when someone pastes the URL into Slack, LinkedIn, Twitter, or iMessage. Generated from the same CV via [satori](https://github.com/vercel/satori). Without one, social previews either fall back to a tiny favicon or skip the preview entirely. With one, the link looks like a polished card with my name, title, and tagline.

- **SEO scaffolding.** A page nobody can find is a page that doesn't exist. The site's `<head>` carries Open Graph and Twitter card meta tags, a canonical URL, a meta description, and JSON-LD structured data describing me as a `Person` and the site as a `WebSite` — all derived from the same CV data, all injected at build time. That's what Google reads when it decides what to show in search results, and what LinkedIn or Slack reads when generating a link preview. The homepage is also pre-rendered to static HTML so crawlers and JS-disabled clients see the actual résumé instead of an empty page.

- **A machine-readable `/resume.json`.** The whole CV as a single JSON file, served straight from the site root. Agents can fetch the structured source instead of scraping HTML. `/cv.json` is a byte-identical alias for the path LLMs commonly guess. Both are discoverable via `robots.txt`, `sitemap.xml`, and `<link rel="alternate">` tags in the `<head>`.

- **An `/llms.txt` index**<sup>[5](https://github.com/niclaslindstedt/cv/blob/7e1f94a4a53fa0c1c37aeb21024fc16bf8a570b3/scripts/generate-llms-txt.mjs)</sup> following the [llmstxt.org](https://llmstxt.org/) convention. A small markdown file pointing agents at `/resume.json`, with the experience and side-project sections baked inline so an agent that only fetches this one file can still answer "which jobs are listed there".

Two small build-time helpers tie the pipeline together. One merges the JSON parts into the single assembled object the rest of the build reads from. The other injects the SEO `<head>` block into the HTML at build time, derived from the same CV data.

The build then runs the generators in sequence — type-check, bundle, then the PDF, `/resume.json`, `/llms.txt`, the timeline page, the sitemap — with a few pre-build steps for the timeline data, GitHub activity, and per-project commit stats. The data fetchers degrade gracefully: if a GitHub token isn't configured, the per-project commit stats simply drop out instead of failing the build.

## Progressive disclosure

The web CV exposes a lot, but it doesn't shove it at you. Top level: the summary, the focus areas, the projects, the jobs, the skills, the degrees, the languages — each as a card. Click a project and you get the full description, the stack, the skills used, and external links. Click an education entry and you get the program structure, the courses, the credit transfers. The course lists for an entire degree are right there if you want them, but they're behind a click — don't click programs if you don't want course lists. The front page stays scannable; the depth is there for the readers who actually want it. The PDF respects the same idea by collapsing the deep stuff entirely.

## The timeline

The timeline page does something a flat CV can't: it shows how things relate to each other in time. Overlapping engagements, parallel side projects, gaps and clusters — all visible at a glance. It's a separate page (`/timeline`), but it reads from the same `experience.json` and `projects.json` that everything else does.

## Search

A search modal sits one keystroke away on the main résumé page. Type a few letters and matches show up grouped by category — projects, jobs, skills, degrees. The index itself is generated at build time from the assembled CV<sup>[6](https://github.com/niclaslindstedt/cv/blob/7e1f94a4a53fa0c1c37aeb21024fc16bf8a570b3/scripts/generate-search-index.mjs)</sup> and committed as static JSON, so what's searchable is exactly what's on the page — no separate authoring surface to drift. The ranker is hand-written; no third-party search library. Each searchable record carries a few hidden aliases so common abbreviations like `k8s`, `TS`, and `react` resolve to the right entry without cluttering the visible copy.
