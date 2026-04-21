---
name: delete-post
description: "Remove a post's audience-version files (posts/technical/<slug>.md and/or posts/non-technical/<slug>.md) and clean up any internal cross-links."
---

# Deleting a Post

Remove the audience-version file(s) for `<slug>` — any of
`posts/technical/<slug>.md` or `posts/non-technical/<slug>.md` that exist —
and resolve any cross-links pointing at the slug in other posts or in
`docs/`.

## Read this first

- **Style and voice:** [`../write-post/STYLE_GUIDE.md`](../write-post/STYLE_GUIDE.md) — if cleaning up cross-links requires rewriting a sentence in another post, match the tone rules there. Don't pad the surrounding prose.

## Scope

By default a delete removes **both** audience versions of the slug. If the
user asks to delete only one version (e.g. "remove the non-technical
version of hello-world, keep the technical one"), delete only that file —
this downgrades the post from two versions to one, not a full delete.

## Division of labour

Same rule as the other post skills: the user decides; the agent executes.

- Do not delete a file without explicit confirmation from the user.
- When rewriting a sentence that used to link to the deleted slug, change as little as possible — ideally just strip the link or point it at a surviving related post. Don't rewrite paragraphs for style while you're in there.

## Inputs

| Input         | Required | Notes                                                                  |
| ------------- | -------- | ---------------------------------------------------------------------- |
| Slug or title | yes      | Identifies the post to delete                                          |
| Audience      | no       | Omit to delete all versions; specify to drop a single audience version |
| Confirmation  | yes      | Always confirm before deleting — this is irreversible without `git`    |

## Process

1. Locate the target file(s). Same matching as `/update-post`:
   - By slug: check `posts/technical/<slug>.md` and `posts/non-technical/<slug>.md`.
   - By title: grep frontmatter `title:` under both audience folders.
2. Show the user each matching file path and its title; ask for explicit confirmation before proceeding. If the user asked to drop only one audience, confirm that you will leave the other in place.
3. Search for cross-links to the slug:

   ```sh
   grep -r "<slug>" posts/ docs/
   ```

4. For each hit, either remove the link or rewrite it — do not leave broken references. If only one audience version is being deleted and the remaining version still covers the topic, prefer repointing rather than deleting the sentence. Report every change to the user.
5. Delete the file(s):

   ```sh
   # delete all versions
   rm -f posts/technical/<slug>.md posts/non-technical/<slug>.md

   # or: delete a single audience
   rm posts/<audience>/<slug>.md
   ```

6. Report the deleted path(s), which version(s) (if any) survive, and the list of any files that were edited during cross-link cleanup.

## Checklist

- [ ] Target file(s) identified across both audience folders
- [ ] User confirmed deletion explicitly (and audience scope if narrowing)
- [ ] Cross-links searched in `posts/` and `docs/`
- [ ] Broken references resolved (minimal rewrites, per `STYLE_GUIDE.md`)
- [ ] Only the confirmed file(s) removed — untouched versions remain on disk

## Verification

```sh
cd website && npm run build
```

The build must succeed without the removed post.
