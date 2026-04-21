---
name: write-post
description: "Draft a new blog post as posts/<slug>.md with title, date, and edited_at frontmatter."
---

# Writing a New Post

Create a new blog post at `posts/<slug>.md`. The filename stem is the URL slug. The title lives in frontmatter — not as a `#` heading in the body. Markdown rendering is not wired up yet; keep the body plain.

## Inputs

Collect from the user before starting:

| Input | Required | Notes |
|-------|----------|-------|
| Title | yes | Becomes the `title` frontmatter field |
| Slug  | no  | Derived from title if omitted (see below) |
| Date  | no  | Defaults to today in `YYYY-MM-DD` |
| Body  | yes | The post contents (plain markdown) |

### Slug derivation

If the user does not supply a slug:

1. Lowercase the title.
2. Replace runs of whitespace with a single hyphen.
3. Strip every character not matching `[a-z0-9-]`.
4. Collapse repeated hyphens; trim leading/trailing hyphens.

## Process

1. Compute `slug` (from input or derivation) and `today` (`YYYY-MM-DD`).
2. Refuse and stop if `posts/<slug>.md` already exists — ask the user to pick a different slug or use `/update-post`.
3. Write `posts/<slug>.md`:

   ```markdown
   ---
   title: <title>
   date: <date-or-today>
   edited_at: <date-or-today>
   ---

   <body>
   ```

   On creation, `edited_at` equals `date`.
4. Report the file path and slug back to the user.

## Checklist

- [ ] Slug is unique under `posts/`
- [ ] Frontmatter has `title`, `date`, `edited_at` — all present and `YYYY-MM-DD` for the two dates
- [ ] Body contains no top-level `# ` heading (the title comes from frontmatter)
- [ ] File saved to `posts/<slug>.md`

## Verification

```sh
cd website && npm run build
```

The extractor must accept the new post without errors and the build must succeed.
