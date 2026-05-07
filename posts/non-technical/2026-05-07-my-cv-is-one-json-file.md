---
title: I write my CV in one file
date: 2026-05-07T13:06:01Z
edited_at: 2026-05-07T13:06:01Z
summary: One file holds the whole thing; a website, a PDF in two languages, and a version AI assistants can read all come out the other end.
tags: cv, resume, agent-editable
---

[My CV](https://niclaslindstedt.se) is one file. It's structured — every field has a name, every entry has a shape — which means I can write it once and a website, a downloadable PDF in English and Swedish, and a machine-readable version aimed at AI assistants all come out the other end.

## The thing I actually got out of it

Updating Word PDFs has always been a pain. Working with Word files through an AI assistant is not great either — it never looks as good as I want it to. The CV project has been iterated on until it just feels right.

Because the data is structured, and because every change is checked against a fixed shape before anything ships, an AI assistant can edit it without breaking it. To get started, I pasted in an old version of my CV and let the assistant turn it into the structured form — from there it's just normal editing. Ask for a change, review what came back, push back if it isn't right.

## What you can actually use

There are a few different ways to read it:

- The website itself, which is interactive — click on any project, job, or degree to drill into the details.
- A printable PDF, in English or Swedish, that I can hand to anyone who wants a regular résumé.
- A timeline page that lays my jobs and side projects out in time — overlaps, parallels, clusters and gaps — the kind of thing a flat CV can't show.
- A version aimed at AI assistants. There's a structured file at `/resume.json` with the whole CV in machine-readable form, and a small text file at `/llms.txt` that points agents at it. The idea: an assistant shouldn't have to scrape my website to find out what jobs I've had.

## Click for more

The website shows the basics up front and hides the deep stuff one click away. A summary, the focus areas, the projects, the jobs, the skills, the degrees, the languages — each as a card you can scan. If you want the full project description, the courses inside a degree, the modules inside a program, you click. Don't click programs if you don't want course lists. The front page stays clean; the depth is there for the people who actually want it.

## The timeline

The timeline page shows the same content, just laid out in time. Overlapping jobs, parallel side projects, gaps and clusters — all of it visible at a glance. It's the part a normal CV can't show without becoming a wall of text.
