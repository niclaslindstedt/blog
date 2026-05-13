---
title: How this blog works
date: 2026-04-22T05:51:05Z
edited_at: 2026-05-13T00:00:00Z
summary: A corner of the internet where I explain the software I build, with every post drafted alongside an AI that reads the actual code so it can't make things up.
tags: blog, meta, claude-code, spec-driven-development
keywords: blog, ai writing, ai-assisted writing, ai assistant, claude, claude code, github, github pages, free hosting, plain text posts, markdown, footnotes, two versions, technical and non-technical, no jargon version, programmer jargon, spec-driven, oss-spec, tools that don't drift, rules in the tool, my parents, tech demo
mentions:
  - type: highlight
    title: oss-spec
    description: The set of rules this blog itself follows — a checklist for how an open-source project ought to be laid out, documented, and automated.
    link: https://github.com/niclaslindstedt/oss-spec
---

Since the ideas are more interesting than the code, I need a place to store the ideas. The code is already stored on GitHub. This blog stores the ideas behind the code.

The blog lives in a folder on GitHub, served through GitHub's free hosting. Every post is a plain text file with a few lines of metadata at the top. The interesting part isn't the website — something like this was possible ten years ago. What's new is that I hand my draft to an AI assistant and it does the supporting work: looking up the projects I mention, reading the relevant code, turning project names into links, and attaching footnotes that open a specific piece of source code in place. I don't want the assistant making things up about my code. The footnotes force it to actually read the file before writing about it.

I write the actual words. The assistant lays them out, files the post in the right place, ships the updated blog, and also rewrites it in a version without the programmer jargon. This is that version. Either version can stand alone, because sometimes the tradeoff I care about is different for a programmer than for my parents.

For the past year I've been experimenting with a style of building software where the rules live inside the tool itself, instead of being repeated in instructions to an AI every time. If the rules live in an instruction they drift between runs. If they live inside the tool they don't. [oss-spec](https://github.com/niclaslindstedt/oss-spec) is the one this blog conforms to, and I'll be writing about that approach along with the other tools I've built around it. They're all free and open on [my GitHub](https://github.com/niclaslindstedt).

I don't usually blog, but when I do, it's mostly a tech demo.
