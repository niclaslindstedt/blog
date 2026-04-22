---
name: write-post
description: "Drafts a new blog post as up to two audience-specific files under posts/technical/ and posts/non-technical/. Use whenever the user wants to write, draft, or start a new blog post."
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

## Default mode: brainstorm

**The user writes the post. The agent types, edits, and researches.** Before writing any file, check whether the user has actually supplied prose to turn into a post.

A **topic** is not a body. Requests like "write a post about X", "let's do something on Y", "draft a post covering Z" describe a subject — they do not supply the content. Treat them as an invitation to brainstorm, not a drafting order.

When the user has not supplied body text, enter brainstorm mode:

1. **Read the code.** If the post is about a project, read enough of it to brainstorm honestly:
   - For this repo (`blog`), read files directly.
   - For a project in `../../project-index/INDEX.md`, use the cloned checkout under `${BLOG_REPO_CACHE:-/tmp/blog-skill-cache}` (`scripts/clone-repos.sh` refreshes all of them; `scripts/commits-since.sh <slug> <cutoff>` shows recent commits — see "Commit history" below).
   - For a topic that isn't a specific project, skip this step.
2. **Surface candidate angles.** Offer 3–5 specific directions the post could take, each one grounded in something you actually read (a commit, a file, a design choice). Quote short snippets the user could riff on. Do not rank them — let the user pick.
3. **Offer structure, not prose.** A proposed outline (section headings, bullet sketches) is fine. A full draft is not. If the user supplied a thin paragraph, suggest where it could be expanded and let the user expand it.
4. **Stop.** Do not write any file. Wait for the user to supply body text or to explicitly say "just draft it from these notes".

**Exit brainstorm mode only when:**

- The user supplies body text for at least one audience, or
- The user supplies detailed enough notes and explicitly asks you to draft from them ("just write it up"), or
- The user has already written one audience version and asks you to adapt it for the other.

Adapting the user's prose across audiences, fixing grammar, tightening phrasing the user wrote, restructuring sections the user ordered badly, adding links via the project index — all allowed. Producing original paragraphs the user did not write is not.

When in doubt, ask one question instead of filling the gap.

## Commit history for project posts

When the post is about a project in `../../project-index/INDEX.md`, commit history is the strongest brainstorming seed — it shows what actually shipped, not what you remember:

1. Identify the project slug from the index (the `##` header).
2. `scripts/find-posts-by-tag.sh <slug>` — prints posts tagged with this project, most recent first. The top line (if any) is the last post about this project; its `date` is the cutoff.
3. `scripts/commits-since.sh <slug> <cutoff>` — prints commits since that date, one per line (`<hash> <iso-date> <subject>`). If there is no prior post, pass `initial` instead of a date; the script prints the last 50 commits as a brainstorming seed.
4. Skim the commit list. Surface candidate angles (new features, breaking changes, refactors worth explaining) as part of step 2 of brainstorm mode. Do not invent topics the commits don't support.

The scripts clone repos on demand into `${BLOG_REPO_CACHE:-/tmp/blog-skill-cache}`. `scripts/clone-repos.sh` (no args) refreshes every project in the index at once.

## Citing source code

Once brainstorm mode is over and the user's body prose makes concrete code claims about an indexed project — "the extractor filters by suffix", "the default cache is `/tmp/...`", "the flag short-circuits when X" — verify each claim against the checked-out source in `${BLOG_REPO_CACHE:-/tmp/blog-skill-cache}/<slug>/` and add an inline superscript citation to the file you read. The vi simulator on the site opens the cited file in prism-highlighted view when the reader clicks the footnote. If a claim doesn't survive a read, flag it back to the user; don't soften it into something vague.

1. `scripts/clone-repos.sh --only <slug>` — idempotent; fast-forwards if the clone already exists. Read files from the cache with Read / Grep.
2. `scripts/latest-commit.sh <slug>` — prints the HEAD commit SHA on the default branch. Use it as the `<ref>` segment of the citation URL so the link pins a specific snapshot. Line ranges stay accurate even if the file is later rewritten, moved, or deleted.
3. Owner and repo come from the `- GitHub: <https://github.com/<owner>/<repo>>` line in `INDEX.md`. Do not hard-code `niclaslindstedt`.

Format is defined in [`STYLE_GUIDE.md`](STYLE_GUIDE.md) under "Source-code references": inline `<sup>[n](https://github.com/<owner>/<repo>/blob/<sha>/<path>)</sup>`, optional `#L<start>-L<end>` fragment.

**Required when** the post is about a project in `INDEX.md` and the user's prose names a specific feature, file, function, or behavior. Optional for announcement / high-level posts.

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

The agent is a typist, editor, and researcher — not a ghostwriter. See "Default mode: brainstorm" above for the gate that decides whether you are writing or brainstorming. Once the gate has been passed, this is the split:

- **The user writes.** Use the words, structure, and opinions the user gave you.
- **Only extrapolate on explicit request.** "Expand this", "write a paragraph about X", "draft it from these notes" are explicit. A topic description ("a post about Y") is not. If in doubt, go back to brainstorm mode.
- **Adapting for the other audience counts as extrapolation.** If the user supplied only one version and asked for the other ("and write it for non-technical readers too"), you may rewrite for that audience. Preserve the user's opinions and conclusions; only change the framing and vocabulary. If the user supplied only one version and did not ask for the other, confirm before producing it.
- **When in doubt, ask one question** rather than filling the gap with plausible-sounding prose.
- **Fix mechanics freely** — typos, grammar, frontmatter, slug, markdown structure, link formatting, section order, redundant sentences. That is the job.

See `STYLE_GUIDE.md` for the full list of LLM tics to avoid (throat-clearing openers, summary closers, "it's worth noting", hype adjectives, etc.).

## Inputs

Collect from the user before starting. If the required fields are missing, the answer is brainstorm mode, not to fill in plausible-sounding defaults.

| Input                  | Required | Notes                                                                                                                                                                                                                                |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Title                  | yes      | Becomes the `title` frontmatter field                                                                                                                                                                                                |
| Date                   | no       | Defaults to the current UTC timestamp in ISO 8601 (`YYYY-MM-DDTHH:MM:SSZ`)                                                                                                                                                           |
| Tags                   | no       | Subject tags. Include the project slug from `project-index/INDEX.md` when the post is about one specific project, plus a few topic tags (language, theme). Optional but strongly encouraged — this is how future runs find the post. |
| Technical body         | one of   | Actual prose for technical readers. A topic description does not count.                                                                                                                                                              |
| Non-technical body     | one of   | Actual prose for non-technical readers. A topic description does not count.                                                                                                                                                          |
| Adapt across audiences | no       | If only one body is supplied, whether to generate the other one                                                                                                                                                                      |

**Never ask the user for a slug.** The slug is always derived from the
title and today's UTC date — asking about it is wasted friction.

At least one of the two bodies must be supplied as prose — not as a topic,
subject line, or request to "cover X". If both are supplied, use each
verbatim (minus mechanical fixes). If one is supplied, ask whether to adapt
it for the other audience (unless the user already said so). If neither is
supplied, do not draft — brainstorm.

### Slug derivation

A post filename is `YYYY-MM-DD-<stem>.md`. The date prefix matches the
frontmatter `date` (UTC, `YYYY-MM-DD` portion) so the terminal listing
(`ls -1`) shows the date directly in the filename. The slug is **always**
derived — never asked for.

Derive the `<stem>` from the title:

1. Lowercase the title.
2. Replace runs of whitespace with a single hyphen.
3. Strip every character not matching `[a-z0-9-]`.
4. Collapse repeated hyphens; trim leading/trailing hyphens.

The final `slug` (used as the filename and URL path) is
`<YYYY-MM-DD>-<stem>`. If that slug already exists on disk, append `-2`,
`-3`, … to the stem until it is unique — do not ask the user to name it.

## Process

1. Read `STYLE_GUIDE.md` and, if present, `../../project-index/INDEX.md`.
2. **Gate: is there a body?** Check what the user actually supplied. If there is no prose for either audience — only a topic, a subject, a "write about X" — enter brainstorm mode (see "Default mode: brainstorm" above), present candidate angles, and **stop**. Do not proceed past this step until the user either supplies body text or explicitly authorises drafting from notes.
3. Compute `now` — the current UTC timestamp in ISO 8601 with a `Z` suffix. Get it with `date -u +%Y-%m-%dT%H:%M:%SZ` or equivalent; never use a local-timezone value. Derive `slug` as `<YYYY-MM-DD>-<stem>` per "Slug derivation" above; never ask the user for it.
4. If a file already exists at either `posts/technical/<slug>.md` or `posts/non-technical/<slug>.md`, append `-2`, `-3`, … to the stem until the slug is unique. If the post is actually an edit of an existing one, use `/update-post` instead.
5. Determine which audiences are being written (both, or just one the user asked for / adapted to).
6. For each audience being produced, lay out the body: fix frontmatter, headings, fenced code blocks, and link any project names that appear in the index. For the non-technical adaptation, apply the guidance in "Writing the non-technical version" above.
7. Write each produced file as:

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

8. Report each file path, the slug, which audiences were produced (and which were skipped and why), and a short list of every change that went beyond mechanical formatting (added links, adapted for audience, rephrased for tone, etc.), so the user can veto any of it.

## Checklist

- [ ] The user supplied body prose (or explicitly authorised drafting from notes). If not, brainstormed instead of writing files.
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
- [ ] For indexed projects with specific-feature prose: ran `scripts/clone-repos.sh --only <slug>` and read every cited file directly from `${BLOG_REPO_CACHE}/<slug>/`
- [ ] Every `<sup>[n](...)</sup>` points at a file actually read, uses the commit SHA returned by `scripts/latest-commit.sh`, and follows `STYLE_GUIDE.md` § "Source-code references"

## Verification

```sh
cd website && npm run build
```

The extractor must accept the new post(s) without errors and the build must succeed.
