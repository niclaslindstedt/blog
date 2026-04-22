---
title: What zag is, and why it exists
date: 2026-04-22T14:52:36Z
edited_at: 2026-04-22T17:30:34Z
summary: A single app that sits in front of every major AI coding assistant, so switching between them is a one-word change.
tags: zag, meta-agent, cli, rust
---

[zag](https://github.com/niclaslindstedt/zag) is a tool I wrote for anyone who uses more than one AI coding assistant. There are a handful of big ones — Claude, Codex, Gemini, Copilot — and a free one called Ollama you can run on your own machine. Each one comes with its own app, its own way of naming models, its own way of logging what it did. [zag](https://github.com/niclaslindstedt/zag) is a single app that sits in front of all of them and lets you talk to any of them the same way. Switching from one to another is a one-word change.

## Why bother?

The AI companies ship new models constantly, and the newest one is usually the best one. If I've built a workflow around one specific company's tool, I'm stuck waiting for them to catch up whenever a competitor ships something better. With [zag](https://github.com/niclaslindstedt/zag) I don't have to rewrite anything — I point it at the new one and the workflow keeps working.

## Building your own tools on top

[zag](https://github.com/niclaslindstedt/zag) ships with bindings for seven programming languages, so developers can wire it into whatever they're building without touching the command line themselves. A few things that already exist in the project's examples folder:

- A native Mac chat app, showing the AI's thinking live in the interface.
- A web-based chat interface in the style of Claude Code.
- A program that hands multiple CVs to multiple AIs in parallel and reviews them against a job description.

The point is: if you want your own AI chat interface that fits how you actually work — or anything else that wraps around an AI agent — you can build it.

## It runs on your computer, not in the cloud

[zag](https://github.com/niclaslindstedt/zag) talks to the actual apps the AI companies ship, which run locally on your machine using your existing subscription. It isn't a service you pay extra for, and nothing goes through my servers. Your subscription, your hardware.

## Coordinating multiple agents

[zag](https://github.com/niclaslindstedt/zag) has building blocks for running several AI assistants at once — in parallel, in sequence, reacting to each other's output. My follow-up project [zig](https://github.com/niclaslindstedt/zig) uses those building blocks to let you describe a workflow in plain English and run it. More on [zig](https://github.com/niclaslindstedt/zig) in a later post.

## Keeping the agent out of your hair

When an AI agent is editing your code, it can make a mess. [zag](https://github.com/niclaslindstedt/zag) can run the agent inside an isolated copy of your project, or inside a sandboxed container, so whatever it does can be thrown away if you don't like the result.

## Run it at home, use it from anywhere

[zag](https://github.com/niclaslindstedt/zag) can expose itself as a secure server on one machine and be controlled from another. The typical use case: leave your powerful home computer running agents, drive it from a laptop at work. If the connection drops, it falls back to running locally.

## There's more

This post is the pitch. [zag](https://github.com/niclaslindstedt/zag) actually does a lot more — handing the AI a strict template and making it stick to it, naming and tagging sessions so you can come back to them later, sharing skills and tool integrations across all the providers at once, watching events in real time, falling back to a different provider when one is misconfigured, built-in code review and planning commands. I'll write about those in later posts.

I will write more about [zig](https://github.com/niclaslindstedt/zig) in later blog posts.
