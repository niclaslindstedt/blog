---
name: update-post
description: "Revise an existing post in-place across its audience versions, preserving title/date/slug and bumping edited_at to the current UTC timestamp."
---

# Updating an Existing Post

Revise a post in-place. Posts have up to two audience-specific versions
(under `posts/technical/<slug>.md` and `posts/non-technical/<slug>.md`); a
slug may have one or both versions on disk. Keep the slug (filename),
`title`, and original `date` unchanged in the file(s) you edit unless the
user explicitly asks otherwise. Always bump `edited_at` to the current UTC
timestamp on every file you actually touch — this is the signal that the
post changed.

## Read this first

- **Style and voice:** [`../write-post/STYLE_GUIDE.md`](../write-post/STYLE_GUIDE.md) is the canonical style guide for every post. Match the existing tone of the post you are editing, and if you touch new prose, write it the way the style guide says.
- **Project context:** [`../../project-index/INDEX.md`](../../project-index/INDEX.md) — if the edit touches a passage that mentions one of the author's projects, make sure the reference is linked the way the index says. If the index is missing or looks stale, run `/update-project-index` first.

## Audiences

Audience layout:

- `posts/technical/<slug>.md` — technical readers
- `posts/non-technical/<slug>.md` — non-technical readers

A post's two versions share the same slug and `date`. They may diverge on
`title`, `edited_at`, and body. The frontend lets readers switch between
them via a tab.

When deciding which version(s) to edit, use this table:

| User asks for…                                            | Edit                                                                                                |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| "update the post"                                         | Ask which audience(s) — or update both when the change is equally relevant to both                  |
| "update the technical version" / "update for developers"  | `posts/technical/<slug>.md` only                                                                    |
| "update the non-technical version" / "simplify for Mom"   | `posts/non-technical/<slug>.md` only                                                                |
| "add a non-technical version" (no file yet)               | Create `posts/non-technical/<slug>.md`, adapting the technical version (see `/write-post` guidance) |
| Edit that changes a shared fact (URL, date, project name) | Apply to every version that exists                                                                  |

When you edit one version, do **not** silently re-style the other. If an
edit to the technical version creates a factual drift from the
non-technical version (e.g. a stat changes, a project gets renamed), flag
it and ask whether to update the other version too.

## Division of labour

Same rule as `/write-post`: the user writes, the agent lays out.

- Apply the user's requested changes literally. Do not "improve" surrounding prose they did not ask you to touch.
- **Only extrapolate on request.** "Expand the intro", "add a paragraph about X", "rewrite this section more informally" — yes. Silently padding, moralising, or adding summary paragraphs — no. Adapting a change for the other audience counts as extrapolation and requires confirmation.
- Fix mechanical issues (typos, broken markdown, stale project links) freely; call them out in the summary so the user can veto.

## Inputs

| Input             | Required | Notes                                                         |
| ----------------- | -------- | ------------------------------------------------------------- |
| Slug or title     | yes      | Identifies the post to edit                                   |
| Audience          | no       | Which version(s) to edit; ask if not obvious from the request |
| Requested changes | yes      | What to add, rewrite, or remove                               |

## Process

1. Read `STYLE_GUIDE.md` (and the project index if the post mentions any project).
2. Locate the target file(s).
   - If the user gave a slug: check `posts/technical/<slug>.md` and `posts/non-technical/<slug>.md`.
   - If the user gave a title: grep frontmatter `title:` lines under `posts/technical/*.md` and `posts/non-technical/*.md` and match.
   - If both audience versions exist and the user didn't specify which to edit, ask (or apply to both if the change is clearly cross-cutting, flagging which files you touched).
3. Read the existing version(s) in full. Absorb their voice before editing.
4. Apply the requested changes to the body of each targeted version. Keep the rest of the prose untouched.
5. Relink any project references that are now out of sync with `project-index/INDEX.md`.
6. Update frontmatter **in every file you edit**:
   - Preserve `title`, `date`, and `summary` unless the user explicitly requested a change. If the edit materially changes what the post is about, update `summary` to match — keep it on a single line.
   - Set `edited_at` to the current UTC timestamp in ISO 8601 (`YYYY-MM-DDTHH:MM:SSZ`, `Z` required). Get it with `date -u +%Y-%m-%dT%H:%M:%SZ` or equivalent; never use a local-timezone value.
   - Do not touch `edited_at` in files you didn't edit.
7. Write each updated file back to the same path (no rename, no audience swap).
8. Report a brief summary of what changed, per audience — separating "what the user asked for" from "mechanical fixes I also made", and calling out any drift between audiences the user may want to reconcile.

## Checklist

- [ ] Followed `STYLE_GUIDE.md`; preserved each version's existing voice
- [ ] Only extrapolated where the user asked (including audience adaptation)
- [ ] Project references reconciled against `project-index/INDEX.md`
- [ ] Correct file(s) identified for the requested audience
- [ ] Slug (filename) unchanged; no audience-folder swaps
- [ ] `title`, `date`, and `summary` preserved unless explicitly changed (and if the edit changes what the post is about, `summary` updated to match, still on a single line)
- [ ] `edited_at` set to the current UTC timestamp (`YYYY-MM-DDTHH:MM:SSZ`, `Z` required) in every file actually edited; untouched in files you did not edit
- [ ] `tags:` preserved verbatim unless the user asked to change them; if the post is about a known project but has no tags, add the project slug as the first tag
- [ ] Cross-audience drift flagged when an edit to one version creates inconsistency with the other

## Verification

```sh
cd website && npm run build
```

The extractor must still accept the post and the build must succeed.
