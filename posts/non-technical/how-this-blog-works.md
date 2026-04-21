---
title: How this blog works
date: 2026-04-21T18:39:04Z
edited_at: 2026-04-21T18:39:04Z
tags: blog, meta
---

Every post on this blog ships in up to two versions: one written for developers, one written for everyone else.

## Two versions of every post

Each post can exist as a technical version and a non-technical version. They share a title and a conclusion, but the framing and vocabulary differ. Readers pick which one they want from a toggle at the top, and the site remembers the choice.

Either version can exist on its own. Some posts only need a technical version. Some only need a non-technical one. The two are linked by filename so they stay in sync, and they get the same publication date.

## No dashboard, no database

Posts are plain markdown files in a Git repository. There is no admin login, no content-management system, no database. Writing a post means committing a file; editing one means editing a file. Every revision is a commit with a diff.

When I push to the main branch, a build step reads all the markdown files, checks the formatting, bundles them into a static site, and publishes the whole thing to GitHub Pages. If any file is malformed — wrong date format, missing title — the build refuses to run. That way nothing broken ever goes live.

## An AI does the typing

The default is that I provide the words and the tool lays them out. There is a set of Claude "skills" (small playbooks the assistant follows) that handle the mechanical parts:

- Drafting the file with the right metadata at the top.
- Adapting the same content for the other audience on request.
- Keeping the README, the docs, and the project index up to date when something changes.
- Linking project names in a post to their GitHub pages.

The division of labour is deliberate. The assistant is a typist and editor, not a ghostwriter. It won't invent opinions, benchmark numbers, or anecdotes that aren't mine.

## Why the terminal look

The front page looks like a terminal window. That isn't purely decorative. It matches how I actually read posts on other people's blogs: in a text editor, in a terminal, in a feed reader that strips styles. A post titled `hello-world.md` behaves like a file. Click to preview it with `cat`. Click again to scroll the rest. Switch audience and the shell prompt shows you've changed directories. Links to source code open in a vi-style overlay rather than sending you away.

None of that changes what the blog is (a pile of markdown files and a build step), but it makes the reading experience consistent with the authoring one.
