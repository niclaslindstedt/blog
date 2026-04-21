---
name: delete-post
description: "Remove a blog post and clean up any internal cross-links that referenced it."
---

# Deleting a Post

Remove `posts/<slug>.md` and clean up any references in other posts or docs.

## Inputs

| Input | Required | Notes |
|-------|----------|-------|
| Slug or title | yes | Identifies the post to delete |
| Confirm | yes | Always confirm before deleting — this is irreversible without git |

## Process

1. Find the target file. If the user gave a title, match by frontmatter `title` field in `posts/`.

2. Show the post title and slug to the user and ask for explicit confirmation before proceeding.

3. Search for cross-links to this slug in other posts and in `docs/`:

   ```sh
   grep -r "<slug>" posts/ docs/
   ```

4. For any cross-link found, either remove the link or update it — do not leave broken references. Report each change to the user.

5. Delete the post file:

   ```sh
   rm posts/<slug>.md
   ```

6. Report the deleted path and a list of any files that were updated.

## Checklist

- [ ] Target file identified
- [ ] User confirmed deletion
- [ ] Cross-links searched across `posts/` and `docs/`
- [ ] Broken links resolved
- [ ] Post file deleted

## Verification

Run `make build` to confirm the site builds cleanly without the removed post.
