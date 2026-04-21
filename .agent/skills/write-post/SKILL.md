---
name: write-post
description: "Draft a new blog post from a topic description. Loads the latest write-post prompt template, applies tone and frontmatter conventions, and creates posts/<slug>.md."
---

# Writing a New Post

Draft a new post from a topic description and save it as `posts/<slug>.md`.

## Inputs

Collect from the user before starting:

| Input | Required | Notes |
|-------|----------|-------|
| Topic / title idea | yes | One sentence is enough |
| Slug | no | Derived from title if omitted (lowercase, hyphens, no special chars) |
| Tags | no | Comma-separated list |
| Publish immediately | no | Default: `draft: true` |

## Process

1. Load the latest prompt template:

   ```sh
   ls -1 prompts/write-post/ | sort -V | tail -1
   ```

   Read that file and use its instructions to shape the draft.

2. Derive the slug from the title: lowercase, replace spaces with hyphens, strip non-alphanumeric characters except hyphens.

3. Check that `posts/<slug>.md` does not already exist. If it does, stop and ask the user to choose a different slug.

4. Write `posts/<slug>.md` with valid frontmatter:

   ```yaml
   ---
   title: <title>
   date: <today YYYY-MM-DD>
   tags: [<tags>]
   draft: true
   ---
   ```

   Follow the post body guidelines in the prompt template.

5. Report the file path and slug to the user.

## Checklist

- [ ] Prompt template loaded
- [ ] Slug does not collide with an existing post
- [ ] Frontmatter has all required fields (title, date)
- [ ] Body follows the tone and length guidelines in the template
- [ ] File saved to `posts/<slug>.md`

## Verification

Run `make build` to confirm the pipeline accepts the new post without errors.
