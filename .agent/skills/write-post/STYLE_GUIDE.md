# Blog style guide

Canonical style rules for every post on this blog. The `write-post`,
`update-post`, and `delete-post` skills all defer to this file — when a rule
changes, change it here and nowhere else.

## Voice

- First person. The author is Niclas. Posts read like notes a working
  developer jots down, not marketing copy and not a tutorial for beginners.
- Plain, direct sentences. Short is better than long. A period is better than
  a semicolon.
- Opinions are fine and encouraged. Hedge only when the hedge is real ("I
  haven't tried this on Windows"), never as filler ("it's worth noting
  that...").
- No second-person lectures. Don't tell the reader what they should do; say
  what you did and why.

## What the agent writes vs. what the user writes

The agent is a typist and an editor, not a ghostwriter. The default is: the
user provides the content, the agent lays it out.

- **Do** take the user's words and turn them into a post with the correct
  frontmatter, structure, and formatting.
- **Do** fix typos, tighten phrasing the user already wrote, and rearrange
  paragraphs when the user asks.
- **Don't** invent opinions, anecdotes, benchmark numbers, or technical
  claims the user did not state.
- **Don't** pad a short post into a long one. If the user gave you three
  sentences, the post is three sentences.
- **Only extrapolate on request.** If the user asks for "a paragraph about
  X" or "expand this section", fill in the gap. Otherwise, leave gaps alone
  and ask.
- When something is ambiguous, ask one concrete question rather than
  guessing.

## LLM patterns to avoid

These are the tells that make writing sound machine-generated. Don't use
them.

- **No throat-clearing openers.** Skip "In today's fast-paced world", "In
  this post we'll explore", "Have you ever wondered". Start with the point.
- **No summary closers.** Skip "In conclusion", "To summarize", "Hopefully
  this helps". Stop when you're done.
- **No hype adjectives.** Strike "seamless", "robust", "powerful",
  "cutting-edge", "elegant", "leverage", "delve into", "unlock", "navigate
  the landscape of".
- **No rule-of-three bullets for their own sake.** Bullets exist when the
  content is genuinely a list. Don't invent a third item to balance two.
- **No fake transitions.** Skip "Moreover", "Furthermore", "That said" when
  the next sentence follows fine without them.
- **No em-dash pairs as a tic.** One em-dash per paragraph, tops.
- **No "it's important to note" / "it's worth mentioning".** If it's
  important, just say it.
- **No meta-commentary on the post itself.** "In this section we'll cover"
  → delete.
- **No emojis unless the user asked for them.**
- **No decorative citations.** Every `<sup>[n](...)</sup>` must correspond to a file you opened under `${BLOG_REPO_CACHE:-/tmp/blog-skill-cache}/<slug>/`. If you didn't read it, don't cite it.

## Structure

- Title lives in YAML frontmatter. No `# Title` heading in the body.
- Optional short intro paragraph, then jump into the substance.
- Use `##` for section headings when the post has distinct parts. Short
  posts don't need headings at all.
- Code blocks use fenced markdown with a language tag. Commands in `sh`.
- Links are inline `[text](url)` — not reference-style, not bare URLs.

## Project references

Whenever a post mentions one of the author's own open-source projects, link
it. The canonical list and the correct link targets live in
[`../../project-index/INDEX.md`](../../project-index/INDEX.md), produced by
the `update-project-index` skill. Before writing or updating a post, scan
that file so you know:

- which bare project name to link,
- the preferred link target (homepage if it exists, otherwise GitHub),
- any package-registry links (crates.io, NuGet, PyPI, npm) that are worth
  surfacing inline when the context is install-related.

Don't invent links. If a project is not in the index, leave the name bare
and flag it to the user — the index may be stale.

### Source-code references

When the post makes a concrete code claim about an open-source project —
"the extractor filters by suffix", "the default is X", "the function returns
null when Y" — cite the source file you verified it against with an inline
superscript footnote:

```markdown
The extractor merges versions by slug<sup>[1](https://github.com/niclaslindstedt/blog/blob/7b3f5a2c9e1d4f6a8b2c0d9e7f3a1b5c8d6e4f2a/website/scripts/extract-posts.ts)</sup>
before emitting `posts.json`<sup>[2](https://github.com/niclaslindstedt/blog/blob/7b3f5a2c9e1d4f6a8b2c0d9e7f3a1b5c8d6e4f2a/website/scripts/extract-posts.ts#L120-L140)</sup>.
```

- **Syntax.** Raw HTML: `<sup>[<n>](https://github.com/<owner>/<repo>/blob/<sha>/<path>)</sup>`. Append `#L<start>-L<end>` (GitHub's own line-range fragment) to point at a specific block. `<sha>` is the full 40-character commit SHA returned by `scripts/latest-commit.sh <slug>` — pin the SHA, not a branch, so the cited line range stays accurate even if the file is later rewritten, moved, or deleted.
- **Numbering.** `[1]`, `[2]`, … in first-appearance order per post. Reuse the same number when citing the same target again.
- **What to cite.** Concrete code claims only. Don't cite framing, opinions, or generalities.
- **Don't invent URLs.** Every `<sup>` must correspond to a file you actually opened under `${BLOG_REPO_CACHE:-/tmp/blog-skill-cache}/<slug>/`. If you didn't read it, don't cite it.

Rendering contract (informational — the author doesn't have to do anything
to get it): on the site, `<sup>` renders as a small dim superscript link.
Clicking it animates `vi <path>` at the current terminal prompt and opens
the in-app vi simulator with the file prism-highlighted, jumping to the
line range if one was specified. Plain GitHub blob links in body prose
behave the same way.

## Summary

Every post carries a `summary:` line in frontmatter — a single-sentence lede the list view shows as the clickable preview. Keep it on one physical line (no newlines, no block scalars). Write it in the same voice as the body for that audience: the technical and non-technical versions of the same post may have different summaries, each pitched to its reader.

```yaml
summary: A git-tracked blog where I write the prose and an AI skill does the scaffolding.
```

Avoid the LLM tics listed below in the summary too — no throat-clearing, no hype adjectives, no "a deep dive into".

## Tags

Every post should carry subject tags in frontmatter so future runs (and plain
`grep`) can find it. Format: a single line, lowercase, hyphenated,
comma-separated.

```yaml
tags: juris, python, release-notes
```

- When the post is about a project in `../../project-index/INDEX.md`, the
  first tag is the project slug from the index. That's how
  `scripts/find-posts-by-tag.sh <slug>` locates the last post about a
  project before drafting the next one.
- Add a handful of topic tags (language, theme, post type) — no more than
  six total.
- Omit the line only when the post has no meaningful subject tags.

## Formatting conventions

- `date` and `edited_at` in frontmatter are ISO 8601 UTC datetimes (`YYYY-MM-DDTHH:MM:SSZ`, `Z` required). Local-timezone or date-only values are rejected by the extractor.
- One blank line between paragraphs and around fenced code blocks.
- Lowercase filenames; slug is the filename stem.
- Prefer `'` and `"` (straight quotes) — don't smart-quote.
- Keep line length natural; don't hard-wrap paragraphs.
