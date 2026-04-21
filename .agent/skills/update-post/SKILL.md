---
name: update-post
description: "Revise an existing posts/<slug>.md in-place, preserving title/date/slug and bumping edited_at to today."
---

# Updating an Existing Post

Revise a post in-place. Keep the slug (filename), `title`, and original `date` unchanged unless the user explicitly asks otherwise. Always bump `edited_at` to today — this is the signal that the post changed.

## Read this first

- **Style and voice:** [`../write-post/STYLE_GUIDE.md`](../write-post/STYLE_GUIDE.md) is the canonical style guide for every post. Match the existing tone of the post you are editing, and if you touch new prose, write it the way the style guide says.
- **Project context:** [`../../project-index/INDEX.md`](../../project-index/INDEX.md) — if the edit touches a passage that mentions one of the author's projects, make sure the reference is linked the way the index says. If the index is missing or looks stale, run `/update-project-index` first.

## Division of labour

Same rule as `/write-post`: the user writes, the agent lays out.

- Apply the user's requested changes literally. Do not "improve" surrounding prose they did not ask you to touch.
- **Only extrapolate on request.** "Expand the intro", "add a paragraph about X", "rewrite this section more informally" — yes. Silently padding, moralising, or adding summary paragraphs — no.
- Fix mechanical issues (typos, broken markdown, stale project links) freely; call them out in the summary so the user can veto.

## Inputs

| Input             | Required | Notes                           |
| ----------------- | -------- | ------------------------------- |
| Slug or title     | yes      | Identifies the post to edit     |
| Requested changes | yes      | What to add, rewrite, or remove |

## Process

1. Read `STYLE_GUIDE.md` (and the project index if the post mentions any project).
2. Locate the target file.
   - If the user gave a slug: open `posts/<slug>.md`.
   - If the user gave a title: grep frontmatter `title:` lines under `posts/*.md` and match.
3. Read the existing post in full. Absorb its voice before editing.
4. Apply the requested changes to the body. Keep the rest of the prose untouched.
5. Relink any project references that are now out of sync with `project-index/INDEX.md`.
6. Update frontmatter:
   - Preserve `title` and `date` unless the user explicitly requested a change.
   - Set `edited_at` to today (`YYYY-MM-DD`).
7. Write the updated file back to the same path (no rename).
8. Report a brief summary of what changed — separating "what the user asked for" from "mechanical fixes I also made".

## Checklist

- [ ] Followed `STYLE_GUIDE.md`; preserved the post's existing voice
- [ ] Only extrapolated where the user asked
- [ ] Project references reconciled against `project-index/INDEX.md`
- [ ] Correct file identified
- [ ] Slug (filename) unchanged
- [ ] `title` and `date` preserved unless explicitly changed
- [ ] `edited_at` set to today
- [ ] Changes applied as requested

## Verification

```sh
cd website && npm run build
```

The extractor must still accept the post and the build must succeed.
