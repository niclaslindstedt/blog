---
title: My CV is data, not a document
date: 2026-05-07T13:06:01Z
edited_at: 2026-05-07T13:50:39Z
summary: Structured data, not a document; a website, a PDF in two languages, and a version AI assistants can read all come out the other end.
tags: cv, resume, agent-editable
---

[My CV](https://niclaslindstedt.se) is structured data, not a document. Every field has a name, every entry has a shape — which means I can write it once and a website, a downloadable PDF in English and Swedish, an image that shows up when someone shares the link on Slack or LinkedIn, and a version aimed at AI assistants all come out the other end.

## The data, and why an AI assistant can edit it

The CV is split across a handful of files — one for jobs, one for side projects, one for skills, one for education, and so on. They get assembled at build time into one CV. Every change is then checked against a fixed shape before it ships: a job has to have a start date, a title, an employer; a project has to have a name and a description. Anything that doesn't fit the shape stops the build before it goes live.

That's why an AI assistant can edit it. The shape acts like guardrails — the assistant can't accidentally put a job title where a date should go, or forget a required field. To get started I pasted in an old version of my CV and let the assistant turn it into the structured form. From there it's just normal editing: ask for a change, review what came back, push back if it isn't right. Updating Word PDFs has always been a pain. Working with Word files through an AI assistant is not great either — it never looks as good as I want. The CV project has been iterated on until it just feels right.

A small skill in the repo codifies the editing rules so the assistant doesn't have to guess. It picks the right file, runs the validator before declaring done, and — because most of the user-facing text is paired English and Swedish — writes the Swedish version alongside the English whenever I add or revise a description. Both languages stay at the same level of polish; the Swedish copy isn't a translation pass tacked on after the fact.

## Two versions, public and private

Some of what's on a CV doesn't belong on the open web — full contact details, longer descriptions, anything I'd rather not have indexed. There's a private layer that lives separately and gets merged in only when I run a "make local" build. That's the version I actually send when I apply for a job. The public site stays scrubbed.

## Side-project numbers from GitHub

Some of the CV data isn't hand-written. Each side project's commit count, first and last commit dates, and year-by-year activity get pulled from GitHub at build time. For open-source projects, only my own commits count. The numbers show up on each project card and in the machine-readable version too, so an AI assistant fetching the structured CV gets the activity data without an extra trip to GitHub.

## Click for more

The website shows the basics up front and hides the deep stuff one click away. A summary, the focus areas, the projects, the jobs, the skills, the degrees, the languages — each as a card you can scan. If you want the full project description, the courses inside a degree, the modules inside a program, you click. Don't click programs if you don't want course lists. The front page stays clean; the depth is there for the people who actually want it. The PDF respects the same idea by collapsing the deep stuff entirely.

## The timeline

There's also a timeline page that shows the same content laid out in time. Overlapping jobs, parallel side projects, gaps and clusters — all of it visible at a glance. It's the part a normal CV can't show without becoming a wall of text.

## Search

A search modal sits one keystroke away on the main page. Type a few letters and matches show up grouped by category — projects, jobs, skills, degrees. The search index is generated at build time from the same CV data, so what's searchable is exactly what's on the page. Each thing also has a few hidden aliases, so common abbreviations like "k8s" or "TS" find the right entry.

## The other ways to read it

That covers the website. The same CV data also turns into:

- A printable PDF in English or Swedish, the kind I can hand to anyone who wants a regular résumé.
- A 1200×630 banner that shows up when someone pastes the URL into Slack, LinkedIn, Twitter, or iMessage. Without one, the link preview either falls back to a tiny favicon or skips the preview entirely.
- Hidden meta tags Google reads when deciding how to show the site in search results, plus a structured data block describing me as a person and the site as a website. Same source, written into the page automatically.
- A pre-rendered version of the homepage. Sites built this way normally ship as a blank page that fills in once the JavaScript loads — which means search engines and tools without JavaScript see nothing. The build does that work upfront so anyone who visits, including Google, sees the actual résumé instead of an empty page.
- A structured file at `/resume.json` with the whole CV in machine-readable form, and a small text file at `/llms.txt` that points AI assistants at it. The idea: an assistant shouldn't have to scrape my website to find out what jobs I've had.
- A sitemap listing every URL on the site, so search engines and AI tools can find everything without guessing.

## What's actually new

Most of the parts here aren't new. What I haven't seen elsewhere: setting it up so an AI assistant can keep the CV current without breaking it, and treating AI assistants as a real audience for the site rather than an afterthought.
