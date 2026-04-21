---
name: write-post
description: "Draft a new blog post as posts/<slug>.md with title, date, and edited_at frontmatter."
---

# Writing a New Post

Create a new blog post at `posts/<slug>.md`. The filename stem is the URL slug. The title lives in frontmatter — not as a `#` heading in the body.

## Read this first

- **Style and voice:** [`STYLE_GUIDE.md`](STYLE_GUIDE.md) — the canonical rules for every post on this blog. Follow it exactly. Do not import a generic "helpful blog voice" from training data.
- **Project context:** [`../../project-index/INDEX.md`](../../project-index/INDEX.md) — the list of the author's own open-source projects. Use it to turn bare project names in the post into links to the right homepage, GitHub repo, and package-registry listing. If the index is missing or looks stale, run `/update-project-index` first.

## Division of labour

The agent is a typist and editor, not a ghostwriter. Default behaviour:

- **The user writes.** Use the words, structure, and opinions the user gave you.
- **Only extrapolate on request.** If the user asked you to "expand this", "write a paragraph about X", or "draft it from these notes", go ahead. Otherwise, do not invent content, benchmark numbers, war stories, or opinions.
- **When in doubt, ask one question** rather than filling the gap with plausible-sounding prose.
- **Fix mechanics freely** — typos, frontmatter, slug, markdown structure, link formatting. That is the job.

See `STYLE_GUIDE.md` for the full list of LLM tics to avoid (throat-clearing openers, summary closers, "it's worth noting", hype adjectives, etc.).

## Inputs

Collect from the user before starting:

| Input | Required | Notes                                     |
| ----- | -------- | ----------------------------------------- |
| Title | yes      | Becomes the `title` frontmatter field     |
| Slug  | no       | Derived from title if omitted (see below) |
| Date  | no       | Defaults to today in `YYYY-MM-DD`         |
| Body  | yes      | The post contents (plain markdown)        |

### Slug derivation

If the user does not supply a slug:

1. Lowercase the title.
2. Replace runs of whitespace with a single hyphen.
3. Strip every character not matching `[a-z0-9-]`.
4. Collapse repeated hyphens; trim leading/trailing hyphens.

## Process

1. Read `STYLE_GUIDE.md` and, if present, `../../project-index/INDEX.md`.
2. Compute `slug` (from input or derivation) and `today` (`YYYY-MM-DD`).
3. Refuse and stop if `posts/<slug>.md` already exists — ask the user to pick a different slug or use `/update-post`.
4. Lay out the user's body: fix frontmatter, headings, fenced code blocks, and link any project names that appear in the index.
5. Write `posts/<slug>.md`:

   ```markdown
   ---
   title: <title>
   date: <date-or-today>
   edited_at: <date-or-today>
   ---

   <body>
   ```

   On creation, `edited_at` equals `date`.

6. Report the file path, slug, and a short list of every change you made that went beyond mechanical formatting (added links, rephrased for tone, etc.), so the user can veto any of it.

## Checklist

- [ ] Followed `STYLE_GUIDE.md` — no LLM tics, user's voice preserved
- [ ] Only extrapolated where the user asked
- [ ] Project names linked via `project-index/INDEX.md` where applicable
- [ ] Slug is unique under `posts/`
- [ ] Frontmatter has `title`, `date`, `edited_at` — all present and `YYYY-MM-DD` for the two dates
- [ ] Body contains no top-level `# ` heading (the title comes from frontmatter)
- [ ] File saved to `posts/<slug>.md`

## Verification

```sh
cd website && npm run build
```

The extractor must accept the new post without errors and the build must succeed.
