---
name: update-post
description: "Revise an existing posts/<slug>.md in-place, preserving title/date/slug and bumping edited_at to today."
---

# Updating an Existing Post

Revise a post in-place. Keep the slug (filename), `title`, and original `date` unchanged unless the user explicitly asks otherwise. Always bump `edited_at` to today — this is the signal that the post changed.

## Inputs

| Input             | Required | Notes                           |
| ----------------- | -------- | ------------------------------- |
| Slug or title     | yes      | Identifies the post to edit     |
| Requested changes | yes      | What to add, rewrite, or remove |

## Process

1. Locate the target file.
   - If the user gave a slug: open `posts/<slug>.md`.
   - If the user gave a title: grep frontmatter `title:` lines under `posts/*.md` and match.
2. Read the existing post in full.
3. Apply the requested changes to the body.
4. Update frontmatter:
   - Preserve `title` and `date` unless the user explicitly requested a change.
   - Set `edited_at` to today (`YYYY-MM-DD`).
5. Write the updated file back to the same path (no rename).
6. Report a brief summary of what changed.

## Checklist

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
