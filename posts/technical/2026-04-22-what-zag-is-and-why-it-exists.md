---
title: What zag is, and why it exists
date: 2026-04-22T14:52:36Z
edited_at: 2026-04-22T17:30:34Z
summary: A meta-agent CLI that unifies Claude, Codex, Gemini, Copilot, and Ollama so swapping providers is a flag change.
tags: zag, meta-agent, cli, rust
---

[zag](https://github.com/niclaslindstedt/zag) is a meta-agent CLI with multiple language bindings that let devs code against a unified CLI, so switching between Codex and Claude is as simple as switching a flag. It's written in Rust and published as [`zag-cli`](https://crates.io/crates/zag-cli) on crates.io.

## One CLI, every provider

New models are released every now and then, and most often the newest model is the best one. Unless it is a major jump, it doesn't make sense to adapt all your processes to a different agent CLI, so mostly you are stuck with the worse model until your agent provider releases a new model. [zag](https://github.com/niclaslindstedt/zag) solves this by unifying the CLI interface for Claude, Codex, Gemini, Copilot, and Ollama. All parameters are mapped internally to the correct one for each agent flavor. [zag](https://github.com/niclaslindstedt/zag) goes further with size aliases: `-m small`, `-m medium`, `-m large` resolve to the right model per provider, so you can pick a class of model without memorising each vendor's name for it. `-p auto -m auto` takes it another step — an LLM picks both the provider and the model for you. [zag](https://github.com/niclaslindstedt/zag) also unifies the output: it tails the agent session logs and turns them into a [zag](https://github.com/niclaslindstedt/zag) session log.

## Language bindings

[zag](https://github.com/niclaslindstedt/zag) has language bindings for TypeScript, Python, C#, Swift, Java, and Kotlin, helping users programmatically call the agent CLI of their choice. These bindings wrap the [zag](https://github.com/niclaslindstedt/zag) CLI under the hood, except for the native Rust binding, which re-exports the workspace crates directly with zero subprocess overhead.

Each binding exposes a fluent builder with typed output and a live event stream, so you get the agent's responses, tool calls, and thinking as structured events in your language of choice instead of parsing stdout yourself. The [examples/](https://github.com/niclaslindstedt/zag/tree/main/examples) directory shows a few things this unlocks:

- **ZagChat** — a native macOS SwiftUI chat app on the Swift bindings, rendering streaming tool calls and sub-agent nesting live in the UI.
- **react-claude-interface** — a React web app with a Claude Code-style chat interface, driven by `zag exec` and `zag input` and piping NDJSON events over Server-Sent Events.
- **cv-review** — a Rust program that fans out parallel agent invocations to review CVs against job descriptions.

The obvious one is an agent chat interface tailored to your own workflow, but anything that wants to run an agent from inside a larger program — a queue worker, a dashboard, an IDE plugin — fits.

## Local, not cloud

[zag](https://github.com/niclaslindstedt/zag) uses the actual CLIs and not SDKs. It's meant to run on your own computer, not as a cloud service. That means you can use your subscription without spending 10x on API calls.

## Orchestration primitives

[zag](https://github.com/niclaslindstedt/zag) has a bunch of orchestration-enabling commands that make orchestration code a lot easier. The follow-up project [zig](https://github.com/niclaslindstedt/zig) — also a Rust CLI, published as [`zig-cli`](https://crates.io/crates/zig-cli) — uses these to provide natural-language orchestration. You tell it what kind of workflow you need, and [zig](https://github.com/niclaslindstedt/zig) helps you set that up, using [zag](https://github.com/niclaslindstedt/zag) to avoid getting stuck with a specific provider.

## Isolation per session

[zag](https://github.com/niclaslindstedt/zag) ships isolation primitives that work the same across every provider. `-w / --worktree` runs the agent inside a dedicated git worktree so it can't stomp on your checkout; `--sandbox` runs it inside a Docker microVM. Both are tracked per-session, so resuming restores the right workspace.

## Remote access

[zag](https://github.com/niclaslindstedt/zag) has a built-in client/server mode. `zag serve` starts an HTTPS/WebSocket server on one machine; `zag connect` on another makes all subsequent commands transparently proxy through. Leave the heavy lifting on your home machine and drive it from your work laptop. If the remote becomes unreachable, [zag](https://github.com/niclaslindstedt/zag) falls back to local execution automatically.

## There's a lot more

This post is the high-level pitch; most of what [zag](https://github.com/niclaslindstedt/zag) actually ships is features I haven't touched yet. Some of the bigger ones I'll come back to:

- **Structured output** — `--json`, `--json-schema` with automatic retry, and NDJSON event streams.
- **Session management** — named and tagged sessions, resume/continue, parent-child trees, per-project config.
- **Skills and MCP sync** — write a skill or an MCP server definition once in `~/.zag/`, and [zag](https://github.com/niclaslindstedt/zag) syncs it into each provider's native config format.
- **Observability** — `zag listen`, `zag events`, `zag subscribe`, `zag watch`, `zag search` to tail, query, and react to a session's event stream.
- **Provider downgrade** — a tier-list fallback (`claude → codex → gemini → copilot → ollama`) that keeps scripts working when a CLI is missing or unauthed.
- **Review, plan, discover** — first-class `zag review` and `zag plan`, plus `zag discover` to enumerate what each installed provider can actually do on this machine.

I will write more about [zig](https://github.com/niclaslindstedt/zig) in later blog posts.
