---
title: What zag is, and why it exists
date: 2026-04-22T14:52:36Z
edited_at: 2026-04-22T14:52:36Z
summary: A meta-agent CLI that unifies Claude, Codex, Gemini, and Copilot so swapping providers is a flag change.
tags: zag, meta-agent, cli, rust
---

[zag](https://github.com/niclaslindstedt/zag) is a meta-agent CLI with multiple language bindings that let devs code against a unified CLI, so switching between Codex and Claude is as simple as switching a flag.

## Why is this even needed?

First, new models are released every now and then, and most often the newest model is the best one. Unless it is a major jump, it doesn't make sense to adapt all your processes to a different agent CLI, so mostly you are stuck with the worse model until your agent provider releases a new model. zag solves this by unifying the CLI interface for Claude, Codex, Gemini, and Copilot. All parameters are mapped internally to the correct one for each agent flavor. zag takes it another step and unifies the output as well. It tails the agent session logs and turns them into a zag session log.

Second, zag has language bindings, helping users programmatically make calls to the agent CLI of their choice. These bindings skip the zag binary and go straight for the provider's agent CLI.

Third, zag uses the actual CLIs and not SDKs. zag is meant to be used by developers on their own computers, not in the cloud. That means you can use your subscription without spending 10x on API calls.

Fourth, zag has a bunch of orchestration-enabling commands that make orchestration code a lot easier. The follow-up project [zig](https://github.com/niclaslindstedt/zig) uses these to provide natural-language orchestration. You tell it what kind of workflow you need, and zig helps you set that up, using zag to avoid getting stuck with a specific provider.

I will write more about zig in later blog posts.
