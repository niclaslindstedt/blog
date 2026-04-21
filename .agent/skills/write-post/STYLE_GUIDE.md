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
