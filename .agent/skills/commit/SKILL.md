---
name: commit
description: "Commit staged changes and push directly to main with a conventional-commit-formatted message."
---

# Commit & Push

This skill handles the full workflow: verify quality gates → commit → push directly to `main`.

## Step 1: Quality Gates

Run all checks before committing. All must pass:

```sh
make build     # must compile cleanly
make test      # all tests must pass
make lint      # zero warnings
make fmt-check # code formatted
```

Stop if any check fails. Fix the issue, then re-run.

## Step 2: Review Changes

```sh
git status && git diff --staged && git diff
```

Understand what changed so you can write an accurate commit message.

## Step 3: Stage & Commit

Stage relevant files (prefer specific paths over `git add -A` to avoid accidentally including secrets or build artifacts):

```sh
git add <files...>
```

Write a conventional commit message:

```
type(scope): summary in imperative mood
```

**Changelog-eligible types** (pick the right one — it determines what appears in the changelog):

| Type                                        | Changelog section | Version bump |
| ------------------------------------------- | ----------------- | ------------ |
| `feat`                                      | Added             | minor        |
| `fix`                                       | Fixed             | patch        |
| `perf`                                      | Performance       | patch        |
| `docs`                                      | Documentation     | none         |
| `test`                                      | Tests             | none         |
| `refactor`, `chore`, `ci`, `build`, `style` | _(not included)_  | none         |

For breaking changes use `feat!:` or `fix!:`, or add a `BREAKING CHANGE:` footer → triggers a major version bump.

Scopes are lowercase, comma-separated if multiple: `feat(api,auth): ...`

```sh
git commit -m "type(scope): summary"
```

## Step 4: Push

```sh
git push -u origin HEAD
```

## Key Reminders

- Commit directly to `main` — no feature branches needed.
- Never skip hooks (`--no-verify`) — fix the underlying issue instead.
- If the change touches multiple scopes, use comma-separated scopes: `feat(api,auth): ...`
