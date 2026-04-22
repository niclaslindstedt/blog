---
title: How this blog works
date: 2026-04-22T05:51:05Z
edited_at: 2026-04-22T09:14:15Z
tags: blog, meta, claude-code, spec-driven-development
---

Since ideas are more interesting than the code, we need a place to store the ideas. The code is already stored by GitHub. This blog stores the ideas behind the code.

The blog itself is a GitHub repository served by GitHub Pages. It's built on React, and the posts are markdown files with YAML frontmatter for metadata<sup>[1](https://github.com/niclaslindstedt/blog/blob/7bc6163c5dd2b48d49a7e4b9285ff40f414ce82f/website/scripts/extract-posts.ts)</sup>. None of that is the interesting part — terminal UIs in the browser were possible ten years ago. What's new is that writing a post involves invoking a Claude skill<sup>[2](https://github.com/niclaslindstedt/blog/blob/7bc6163c5dd2b48d49a7e4b9285ff40f414ce82f/.agent/skills/write-post/SKILL.md)</sup>. The skill pulls down whichever of my public repositories are relevant to the post<sup>[3](https://github.com/niclaslindstedt/blog/blob/7bc6163c5dd2b48d49a7e4b9285ff40f414ce82f/.agent/skills/write-post/scripts/clone-repos.sh)</sup>, walks their commit history<sup>[4](https://github.com/niclaslindstedt/blog/blob/7bc6163c5dd2b48d49a7e4b9285ff40f414ce82f/.agent/skills/write-post/scripts/commits-since.sh)</sup>, reads the files the post actually touches, and turns bare project names into links and concrete claims about code into footnotes that open the source in place<sup>[5](https://github.com/niclaslindstedt/blog/blob/7bc6163c5dd2b48d49a7e4b9285ff40f414ce82f/.agent/skills/write-post/STYLE_GUIDE.md)</sup>. I don't want Claude inventing facts about my code. Citations force it to open the file first.

I write the posts. Claude structures them into markdown, adds the links, files them where they belong, and deploys to GitHub Pages<sup>[6](https://github.com/niclaslindstedt/blog/blob/7bc6163c5dd2b48d49a7e4b9285ff40f414ce82f/.github/workflows/pages.yml)</sup>. It also rewrites every post in a non-technical version, and either version can stand alone, because sometimes the tradeoff I care about is different for a dev than for my parents.

The past year I've been experimenting with spec-driven development and CLIs that lift logic out of prompts and into the tool itself. If the rules live in a prompt they drift. If they live in the binary they don't. [oss-spec](https://github.com/niclaslindstedt/oss-spec) is what this blog itself conforms to, and I'll be writing about that approach along with the other tools I've built around it. They're all open source on [my GitHub](https://github.com/niclaslindstedt).

I don't usually blog, but when I do, it's mostly a tech demo.
