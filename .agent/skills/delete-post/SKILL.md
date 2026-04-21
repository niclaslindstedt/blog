---
name: delete-post
description: "Remove posts/<slug>.md and clean up any internal cross-links that referenced it."
---

# Deleting a Post

Remove `posts/<slug>.md` and resolve any cross-links pointing at the slug in other posts or in `docs/`.

## Read this first

- **Style and voice:** [`../write-post/STYLE_GUIDE.md`](../write-post/STYLE_GUIDE.md) — if cleaning up cross-links requires rewriting a sentence in another post, match the tone rules there. Don't pad the surrounding prose.

## Division of labour

Same rule as the other post skills: the user decides; the agent executes.

- Do not delete a post without explicit confirmation from the user.
- When rewriting a sentence that used to link to the deleted slug, change as little as possible — ideally just strip the link or point it at a surviving related post. Don't rewrite paragraphs for style while you're in there.

## Inputs

| Input         | Required | Notes                                                               |
| ------------- | -------- | ------------------------------------------------------------------- |
| Slug or title | yes      | Identifies the post to delete                                       |
| Confirmation  | yes      | Always confirm before deleting — this is irreversible without `git` |

## Process

1. Locate the target file (same as `/update-post`: match by slug filename, or grep frontmatter `title:` if the user gave a title).
2. Show the user the post's slug and title; ask for explicit confirmation before proceeding.
3. Search for cross-links to the slug:

   ```sh
   grep -r "<slug>" posts/ docs/
   ```

4. For each hit, either remove the link or rewrite it — do not leave broken references. Report every change to the user.
5. Delete the post file:

   ```sh
   rm posts/<slug>.md
   ```

6. Report the deleted path plus the list of any files that were edited during cross-link cleanup.

## Checklist

- [ ] Target file identified
- [ ] User confirmed deletion explicitly
- [ ] Cross-links searched in `posts/` and `docs/`
- [ ] Broken references resolved (minimal rewrites, per `STYLE_GUIDE.md`)
- [ ] Post file removed

## Verification

```sh
cd website && npm run build
```

The build must succeed without the removed post.
