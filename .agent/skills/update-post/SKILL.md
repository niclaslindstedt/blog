---
name: update-post
description: "Revise an existing blog post in-place. Loads the latest update-post prompt template, applies the requested changes while preserving frontmatter and slug."
---

# Updating an Existing Post

Revise `posts/<slug>.md` in-place, preserving the slug, date, and any frontmatter fields not explicitly changed.

## Inputs

| Input | Required | Notes |
|-------|----------|-------|
| Slug or title | yes | Identifies the post to edit |
| Requested changes | yes | What to add, rewrite, or remove |

## Process

1. Find the target file. If the user gave a title rather than a slug, list `posts/` and match by title frontmatter field.

2. Load the latest prompt template:

   ```sh
   ls -1 prompts/update-post/ | sort -V | tail -1
   ```

3. Read the existing post in full.

4. Apply the requested changes following the template guidelines. Preserve:
   - The `slug` (filename — do not rename)
   - The original `date` (unless the user explicitly asks to change it)
   - Any frontmatter fields not mentioned in the request

5. Write the updated file back to the same path.

6. Report a brief summary of what changed.

## Checklist

- [ ] Correct file identified
- [ ] Prompt template loaded
- [ ] Slug and date preserved (unless changed intentionally)
- [ ] Changes applied per template tone guidelines
- [ ] File written back to original path

## Verification

Run `make build` to confirm the pipeline still accepts the post without errors.
