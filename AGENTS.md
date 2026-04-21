# Agent guidance for blog

This file is the canonical source of truth for AI coding agents working in this
repo. `CLAUDE.md`, `.cursorrules`, `.windsurfrules`, `GEMINI.md`,
`.aider.conf.md`, and `.github/copilot-instructions.md` are symlinks to this
file.

## OSS Spec conformance

This repository adheres to [`OSS_SPEC.md`](OSS_SPEC.md), a prescriptive
specification for open source project layout, documentation, automation, and
governance. A copy of the spec lives at the repository root so contributors and
AI agents can consult it without leaving the repo; its version is recorded in
the YAML front matter at the top of the file.

Run `oss-spec validate .` to verify conformance. When in doubt about a layout,
naming, or workflow decision, consult the relevant section of `OSS_SPEC.md` —
it is the source of truth for the conventions this repo follows.

## Build and test commands

```sh
make build         # developer build
make test          # full test suite
make lint          # zero-warning linter
make fmt           # format in place
make fmt-check     # verify formatting (CI)
```

## Commit and PR conventions

- All commits follow [Conventional Commits](https://www.conventionalcommits.org/).
- PRs are squash-merged; the **PR title** becomes the single commit on `main`,
  so it must follow conventional-commit format.
- Breaking changes use `<type>!:` or a `BREAKING CHANGE:` footer.

## Architecture summary

The repository has two distinct layers. `src/` is a Node.js content pipeline: it reads markdown files from `posts/`, parses frontmatter and body, and emits structured JSON consumed by the frontend. `website/` is the React application — a static-exportable site with a retro pixel-art theme that reads the generated JSON and renders the post list and individual post pages.

Posts live under `posts/<slug>.md` at the project root. The slug is the canonical identifier: it becomes the URL path, the filename, and the key in the generated data. `prompts/` holds the versioned Claude prompt templates that power the `write-post`, `update-post`, and `delete-post` skills, keeping authoring tone consistent across all posts.

Dependency direction: `posts/` → `src/` (pipeline) → `website/src/generated/` → `website/src/` (React components). Nothing in `website/` imports from `src/` directly; data crosses the boundary only through the generated JSON artifacts under `website/src/generated/`.

## Where new code goes

| Change type | Goes in |
|---|---|
| New feature (pipeline) | `src/...` |
| New feature (frontend) | `website/src/...` |
| New blog post          | `posts/<slug>.md` |
| Tests                  | `tests/...` |
| Docs update            | `docs/...` |
| Sample posts           | `examples/...` |
| LLM prompt             | `prompts/<name>/<major>_<minor>_<patch>.md` (see `prompts/README.md`) |

## Test conventions

- **All tests live in separate files** — never inline in source files (no `#[cfg(test)]` blocks, no `if __name__ == "__main__"` test harnesses). This keeps source files free of test scaffolding and lets agents, hooks, and linters treat source and test code differently.
- Test files are named with a `_test` or `_tests` suffix (e.g. `check_test.rs`, `utils_test.py`). The stem must match the pattern `_?[Tt]ests?$` per §20 of `OSS_SPEC.md`.
- Tests live in `tests/`. Use `tempfile` or equivalent for any test that writes to the filesystem.

## Source file size

- Non-test source files must stay under **1000 physical lines** (§20.5 of `OSS_SPEC.md`). When a file grows past the limit, prefer splitting by concern (extracting submodules, helpers, or sibling files) over relaxing the cap.
- A file may opt out by placing `oss-spec:allow-large-file: <reason>` in any comment within its first 20 lines. The reason must be non-empty and motivate why the file genuinely cannot be split (generated code, cohesive state machine, third-party snapshot, inherently dense rule catalogue).

## Documentation sync points

When you change… | Update…
--- | ---
post frontmatter schema | `docs/configuration.md`, README Usage section
build config keys | `docs/configuration.md`
pipeline output shape | `docs/architecture.md`, `website/src/` consumers
Claude prompt templates | `prompts/README.md`, the relevant skill `SKILL.md`

## Parity / cross-cutting rules

- **Slug consistency**: a post's filename stem, its `slug` frontmatter field (if present), and its URL path must all be identical. If you rename a post file, also update any internal cross-links.
- **Generated data**: `website/src/generated/` is never edited by hand — it is always the output of `make build`. Do not commit partial or out-of-date generated files.
- **Prompt versions**: when editing a prompt template, bump the patch version in the filename and update the `update-prompts` skill mapping table so the skill tracks the new file.

## Maintenance skills

Per §21 of `OSS_SPEC.md`, this repo ships agent skills for keeping drift-prone artifacts in sync with their sources of truth. Skills live under `.agent/skills/<name>/` and are also accessible via the `.claude/skills` symlink.

| Skill | When to run |
|---|---|
| `maintenance`    | When several artifacts have likely drifted at once — umbrella skill that runs every `update-*` skill in the correct order. |
| `update-docs`    | After any change to the post schema, pipeline, or configuration keys. |
| `update-readme`  | After any change that alters user-visible behavior, commands, or install instructions. |
| `update-prompts` | After any change to an LLM prompt's source of truth (tone guidelines, frontmatter schema). |
| `write-post`     | Draft a new blog post from a topic description. |
| `update-post`    | Revise an existing post in-place. |
| `delete-post`    | Remove a post and clean up cross-links. |

Each skill has a `SKILL.md` (the playbook) and a `.last-updated` file (the baseline commit hash). Run a skill by loading its `SKILL.md` and following the discovery process and update checklist. The skill rewrites `.last-updated` at the end of a successful run, and improves itself in place when it discovers new mapping entries. The `maintenance` skill owns a **Registry** table listing every `update-*` skill — add a row whenever you create a new sync skill.