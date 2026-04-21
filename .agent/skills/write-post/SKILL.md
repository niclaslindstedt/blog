---
name: write-post
description: "Draft a new blog post as up to two audience-specific files: posts/technical/<slug>.md and posts/non-technical/<slug>.md."
---

# Writing a New Post

Create a new blog post as **one or two files** keyed by a shared slug:

- `posts/technical/<slug>.md` — the version aimed at technical readers.
- `posts/non-technical/<slug>.md` — the version aimed at non-technical readers.

The filename stem is the URL slug and must match between the two audience
versions. The title lives in frontmatter — not as a `#` heading in the body.

## Read this first

- **Style and voice:** [`STYLE_GUIDE.md`](STYLE_GUIDE.md) — the canonical rules for every post on this blog. Follow it exactly. Do not import a generic "helpful blog voice" from training data.
- **Project context:** [`../../project-index/INDEX.md`](../../project-index/INDEX.md) — the list of the author's own open-source projects. Use it to turn bare project names in the post into links to the right homepage, GitHub repo, and package-registry listing. If the index is missing or looks stale, run `/update-project-index` first.

## Project context and commit summary

When the post is about a project in `../../project-index/INDEX.md`, gather recent commit history before drafting so the post reflects what actually shipped — not what you remember:

1. Identify the project slug from the index (the `##` header).
2. `scripts/find-posts-by-tag.sh <slug>` — prints posts tagged with this project, most recent first. The top line (if any) is the last post about this project; its `date` is the cutoff.
3. `scripts/commits-since.sh <slug> <cutoff>` — prints commits since that date, one per line (`<hash> <iso-date> <subject>`). If there is no prior post, pass `initial` instead of a date; the script prints the last 50 commits as a brainstorming seed.
4. Skim the commit list. Surface candidate angles to the user (new features, breaking changes, refactors worth explaining) and let them pick. Do not invent topics the commits don't support.

The scripts clone repos on demand into `${BLOG_REPO_CACHE:-/tmp/blog-skill-cache}`. `scripts/clone-repos.sh` (no args) refreshes every project in the index at once — useful before a long brainstorming session.

**Brainstorm mode.** If the user asked "what should I write about for `<project>`?" and supplied no body, stop after presenting the candidate angles. Do not write any file.

## Audiences

Every post targets one or two audiences. A post is published as long as it
has at least one version. The two versions share a slug and live under
separate folders:

| Audience        | Folder                 | Aimed at                                                          |
| --------------- | ---------------------- | ----------------------------------------------------------------- |
| `technical`     | `posts/technical/`     | Developers — assume familiarity with the tools, jargon, tradeoffs |
| `non-technical` | `posts/non-technical/` | General readers — minimise jargon, explain the why over the how   |

Default: write **both** versions unless the user says otherwise. If the user
explicitly asks for only one audience (or the topic is inherently one-sided,
e.g. a low-level debugging note for engineers only), produce only that file
and mention it in the summary.

The two versions share the same slug and the same `date`. They may diverge
on `title`, `edited_at`, and body. Keep the titles consistent in spirit even
when the wording differs slightly for the audience.

### Writing the non-technical version

When producing a non-technical version from a technical draft (or from a
topic description):

- Replace jargon with everyday analogies. Explain _why it matters_, not _how
  the bytes move_.
- Keep code blocks only when they illustrate the point without requiring
  setup knowledge. Strip terminal transcripts, config blobs, and stack
  traces.
- Assume no prior context about the author's stack, tooling, or past posts.
- Preserve the same opinion and conclusion as the technical version — the
  two should agree, just pitched differently.

STYLE_GUIDE.md's voice and anti-LLM-tic rules apply equally to both
versions.

## Division of labour

The agent is a typist and editor, not a ghostwriter. Default behaviour:

- **The user writes.** Use the words, structure, and opinions the user gave you.
- **Only extrapolate on request.** If the user asked you to "expand this", "write a paragraph about X", or "draft it from these notes", go ahead. Otherwise, do not invent content, benchmark numbers, war stories, or opinions.
- **Adapting for the other audience counts as extrapolation.** If the user supplied only one version and asked for the other ("and write it for non-technical readers too"), you may rewrite for that audience. Preserve the user's opinions and conclusions; only change the framing and vocabulary. If the user supplied only one version and did not ask for the other, confirm before producing it.
- **When in doubt, ask one question** rather than filling the gap with plausible-sounding prose.
- **Fix mechanics freely** — typos, frontmatter, slug, markdown structure, link formatting. That is the job.

See `STYLE_GUIDE.md` for the full list of LLM tics to avoid (throat-clearing openers, summary closers, "it's worth noting", hype adjectives, etc.).

## Inputs

Collect from the user before starting:

| Input                  | Required | Notes                                                                                                                                                                                                                                |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Title                  | yes      | Becomes the `title` frontmatter field                                                                                                                                                                                                |
| Slug                   | no       | Derived from title if omitted (see below)                                                                                                                                                                                            |
| Date                   | no       | Defaults to the current UTC timestamp in ISO 8601 (`YYYY-MM-DDTHH:MM:SSZ`)                                                                                                                                                           |
| Tags                   | no       | Subject tags. Include the project slug from `project-index/INDEX.md` when the post is about one specific project, plus a few topic tags (language, theme). Optional but strongly encouraged — this is how future runs find the post. |
| Technical body         | one of   | The post contents for technical readers                                                                                                                                                                                              |
| Non-technical body     | one of   | The post contents for non-technical readers                                                                                                                                                                                          |
| Adapt across audiences | no       | If only one body is supplied, whether to generate the other one                                                                                                                                                                      |

At least one of the two bodies must be supplied. If both are supplied, use
each verbatim. If one is supplied, ask whether to adapt it for the other
audience (unless the user already said so).

### Slug derivation

If the user does not supply a slug:

1. Lowercase the title.
2. Replace runs of whitespace with a single hyphen.
3. Strip every character not matching `[a-z0-9-]`.
4. Collapse repeated hyphens; trim leading/trailing hyphens.

## Process

1. Read `STYLE_GUIDE.md` and, if present, `../../project-index/INDEX.md`.
2. Compute `slug` (from input or derivation) and `now` — the current UTC timestamp in ISO 8601 with a `Z` suffix. Get it with `date -u +%Y-%m-%dT%H:%M:%SZ` or equivalent; never use a local-timezone value.
3. Refuse and stop if a file already exists at either `posts/technical/<slug>.md` or `posts/non-technical/<slug>.md` — ask the user to pick a different slug or use `/update-post`.
4. Determine which audiences are being written (both, or just one the user asked for / adapted to).
5. For each audience being produced, lay out the body: fix frontmatter, headings, fenced code blocks, and link any project names that appear in the index. For the non-technical adaptation, apply the guidance in "Writing the non-technical version" above.
6. Write each produced file as:

   ```markdown
   ---
   title: <title>
   date: <iso-utc-datetime>
   edited_at: <iso-utc-datetime>
   tags: <slug>, <topic>, <topic>
   ---

   <body>
   ```

   `date` and `edited_at` are ISO 8601 UTC datetimes ending in `Z` (e.g. `2026-04-21T14:30:00Z`). On creation, `edited_at` equals `date`. The two versions share `slug` and `date`; `title` may differ slightly between audiences.

   `tags` is a single line, comma-separated, lowercase, hyphenated — e.g. `tags: juris, python, release-notes`. Omit the line only when the post has no meaningful subject tags (rare). When the post is about a project in the index, the first tag is the project slug so `find-posts-by-tag.sh <slug>` locates the post on the next run. Keep the list short (≤ 6).

7. Report each file path, the slug, which audiences were produced (and which were skipped and why), and a short list of every change that went beyond mechanical formatting (added links, adapted for audience, rephrased for tone, etc.), so the user can veto any of it.

## Checklist

- [ ] Followed `STYLE_GUIDE.md` — no LLM tics, user's voice preserved
- [ ] Only extrapolated where the user asked (including audience adaptation)
- [ ] Project names linked via `project-index/INDEX.md` where applicable
- [ ] Ran `find-posts-by-tag.sh` and `commits-since.sh` when the post is about a project in the index; surfaced candidate topics before drafting
- [ ] Slug is unique under both `posts/technical/` and `posts/non-technical/`
- [ ] Each produced file has frontmatter with `title`, `date`, `edited_at` — all present; the two timestamps are ISO 8601 UTC (`YYYY-MM-DDTHH:MM:SSZ`, `Z` required)
- [ ] `tags:` present on one line, lowercase, comma-separated; first tag is the project slug when the post is about a project in the index
- [ ] `date` is identical across audience versions of the same slug
- [ ] Body contains no top-level `# ` heading (the title comes from frontmatter)
- [ ] Files saved under `posts/technical/` and/or `posts/non-technical/` — never directly under `posts/`

## Verification

```sh
cd website && npm run build
```

The extractor must accept the new post(s) without errors and the build must succeed.
