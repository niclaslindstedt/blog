---
title: How this blog works
date: 2026-04-22T05:51:05Z
edited_at: 2026-04-22T05:51:05Z
tags: blog, meta, claude-code, spec-driven-development
---

I've created this blog to experiment with how I can use AI to make blogging more interesting. Using AI agents to code makes ideas more interesting than the underlying lines of code, and that also makes the ideas worth storing someplace. So I thought I would store them here.

This blog is just a GitHub repository using GitHub Pages. It's built on React and the blog posts are simple markdown files<sup>[1](https://github.com/niclaslindstedt/blog/blob/7bc6163c5dd2b48d49a7e4b9285ff40f414ce82f/website/scripts/extract-posts.ts)</sup>. Writing a blog post involves invoking a Claude skill<sup>[2](https://github.com/niclaslindstedt/blog/blob/7bc6163c5dd2b48d49a7e4b9285ff40f414ce82f/.agent/skills/write-post/SKILL.md)</sup>. This skill will pull my public repositories that are relevant to what I want to write about<sup>[3](https://github.com/niclaslindstedt/blog/blob/7bc6163c5dd2b48d49a7e4b9285ff40f414ce82f/.agent/skills/write-post/scripts/clone-repos.sh)</sup>, check commit history<sup>[4](https://github.com/niclaslindstedt/blog/blob/7bc6163c5dd2b48d49a7e4b9285ff40f414ce82f/.agent/skills/write-post/scripts/commits-since.sh)</sup>, read relevant files, and add grounding to my post by turning project names into links and adding superscript links to relevant source code<sup>[5](https://github.com/niclaslindstedt/blog/blob/7bc6163c5dd2b48d49a7e4b9285ff40f414ce82f/.agent/skills/write-post/STYLE_GUIDE.md)</sup>.

I'm the one writing the blog posts, and Claude helps me structure the text into markdown, add links, put it where it belongs in the project structure, and deploy the updated blog to GitHub Pages<sup>[6](https://github.com/niclaslindstedt/blog/blob/7bc6163c5dd2b48d49a7e4b9285ff40f414ce82f/.github/workflows/pages.yml)</sup>. Claude also translates the post into a more non-technical version, allowing people who aren't programmers to understand the concepts brought up in the blog.

The past year, I've been experimenting with spec-driven development and creating CLIs that lift logic from prompts into the CLI itself. This prevents context rot and instruction drift. I'll write about these tools on this blog as I develop them further. They're all open source on [my GitHub](https://github.com/niclaslindstedt).

I don't usually blog, but when I do, it's mostly a tech demo.
