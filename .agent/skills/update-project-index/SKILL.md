---
name: update-project-index
description: "Use when the project index (.agent/project-index/INDEX.md) may be stale. Clones every public repo owned by niclaslindstedt, reads each README, and rewrites the index plus any project mentions in existing posts so names link to the right homepage, GitHub repo, and package-registry listing."
---

# Updating the Project Index

**Governing spec sections:** §11.1 (`docs/`-like reference material), §21.5 (this skill is mandated because the project index is a drift-prone artifact that the `write-post` / `update-post` skills both depend on).

The project index is a curated list of the author's public open-source work. It is the single source of truth for how project names appear in blog posts: which link they get, which package-registry listing is worth mentioning, and what the project actually is. `write-post` and `update-post` both read it before laying out a post.

This skill rebuilds the index from scratch by cloning every public repo owned by `niclaslindstedt` on GitHub, reading its README and manifest files, and emitting `.agent/project-index/INDEX.md`. It then scans `posts/*.md` and fixes any bare project-name mentions so they match the index.

## Tracking mechanism

`.agent/skills/update-project-index/.last-updated` contains the git commit hash of this repo from the last successful run. The skill also writes a `fetched_at: YYYY-MM-DD` header into `INDEX.md` so readers can tell how fresh the data is.

## Inputs

| Input             | Required | Notes                                                                                                   |
| ----------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| GitHub user       | no       | Defaults to `niclaslindstedt`. The repo is hard-pinned to this author; override only for a test run.    |
| Archived repos    | no       | Skipped by default. Pass `--include-archived` if the user wants archived projects in the index.         |
| Forks             | no       | Skipped by default. Forks are not the author's own work.                                                |
| Scratch directory | no       | Defaults to `.cache/project-index/` (gitignored). Delete and re-clone each run to avoid stale mirrors.  |

## Discovery process

1. Read the baseline:

   ```sh
   BASELINE=$(cat .agent/skills/update-project-index/.last-updated)
   ```

   Empty means "never run". A staleness check is worth running whenever it has been more than a month since `fetched_at` in `INDEX.md`, or whenever a new post mentions a project that is not in the index.

2. List the user's public repos. Prefer the GitHub API directly (unauthenticated works up to the rate limit):

   ```sh
   curl -fsSL 'https://api.github.com/users/niclaslindstedt/repos?per_page=100&type=owner&sort=updated' \
     | jq -r '.[] | select(.archived==false and .fork==false) | .name + "\t" + .clone_url + "\t" + (.homepage // "") + "\t" + (.description // "")'
   ```

   Or, if the `mcp__github__*` tools are available and permitted, use them in place of `curl` — the shape of the data is the same.

3. Check out each repo by cloning. **Always clone — do not rely solely on the API's README endpoint — the skill needs to inspect manifest files (`Cargo.toml`, `package.json`, `pyproject.toml`, `*.csproj`, `go.mod`, etc.) to decide which registry links to include.** A shallow clone is enough:

   ```sh
   mkdir -p .cache/project-index
   rm -rf .cache/project-index/*
   while IFS=$'\t' read -r name clone_url homepage description; do
     git clone --depth=1 "$clone_url" ".cache/project-index/$name"
   done < repos.tsv
   ```

4. For each cloned repo, extract:

   - **Summary** — the top of `README.md` (first paragraph after the title, stripped of badges). Keep it to one sentence, under ~200 characters. Rewrite in the blog's voice if the README's phrasing is too marketing-heavy; see `../write-post/STYLE_GUIDE.md` for tone rules.
   - **Homepage** — the repo's `homepage` field from the GitHub API; fall back to any `homepage` link in the README if the API field is empty.
   - **GitHub URL** — `https://github.com/niclaslindstedt/<name>`.
   - **Package-registry links** — detect by manifest file (see mapping table below).
   - **Aliases** — any other names the project is known by (CLI binary name, old name, short name). Add these manually the first time you notice them, then keep them in the index.

5. Emit `.agent/project-index/INDEX.md`. See the template below.

6. Scan every file under `posts/*.md`. For each project in the index:

   - If a post mentions the project name (or a known alias) as bare text, rewrite it to a markdown link pointing at the preferred target (homepage if present, GitHub otherwise).
   - Leave existing links alone unless they point at something different from the index's preferred target — in that case, update to match and flag the change in the run summary.
   - Never touch code blocks or frontmatter.

7. Re-read every rewritten post against `STYLE_GUIDE.md` so the surrounding sentence still reads naturally. If a rewrite looks forced, skip it and note the skipped mention in the run summary for the user to review.

## Manifest-to-registry mapping

| Manifest file                         | Language  | Registry link (if the manifest is publishable) |
| ------------------------------------- | --------- | ---------------------------------------------- |
| `Cargo.toml`                          | Rust      | `https://crates.io/crates/<name>`              |
| `package.json` (public, not private)  | JS / TS   | `https://www.npmjs.com/package/<name>`         |
| `pyproject.toml` / `setup.py`         | Python    | `https://pypi.org/project/<name>/`             |
| `*.csproj` / `*.nuspec`               | .NET      | `https://www.nuget.org/packages/<name>`        |
| `go.mod`                              | Go        | `https://pkg.go.dev/<module-path>`             |
| `Gemfile` + `*.gemspec`               | Ruby      | `https://rubygems.org/gems/<name>`             |
| `build.gradle` / `pom.xml` (library)  | JVM       | Maven Central: `https://central.sonatype.com/artifact/<group>/<name>` |

Rules:

- **Package name ≠ repo name.** Always read the actual package name out of the manifest (`Cargo.toml [package] name`, `package.json .name`, `pyproject.toml [project] name`, `<PackageId>` in `.csproj`).
- **Verify the listing exists** before adding the link. A `Cargo.toml` with `publish = false` or a `package.json` with `"private": true` is not published — do not add a registry link.
- **One registry per project by default.** If a project publishes to several (rare), list all of them.
- **Private / application repos** (no manifest, or not publishable) get only homepage + GitHub links.

Extend this table the first time you encounter a new ecosystem.

## `INDEX.md` template

```markdown
---
fetched_at: <YYYY-MM-DD>
source: github.com/niclaslindstedt
---

# Project index

Canonical list of Niclas Lindstedt's public open-source projects. Consumed by the `write-post`
and `update-post` skills to turn bare project names in blog posts into links.

Regenerate with `/update-project-index`.

## <project-name>

> <one-sentence summary in the blog's voice>

- GitHub: <https://github.com/niclaslindstedt/...>
- Homepage: <https://...>  _(optional; omit the line if there isn't one)_
- Package: <https://crates.io/crates/...>  _(optional; repeat per registry)_
- Aliases: `alt-name`, `cli-name`  _(optional; omit if none)_
- Language: Rust
- Status: active | archived | wip

...
```

Order projects alphabetically by primary name. Keep entries terse — the index is for lookup, not
reading.

## Update checklist

- [ ] Read `.last-updated` and decide whether a full refresh is warranted
- [ ] Fetch the list of public, non-fork, non-archived repos for `niclaslindstedt`
- [ ] Clone each repo into `.cache/project-index/<name>` with `git clone --depth=1`
- [ ] For each repo, extract summary, homepage, GitHub URL, registry links, aliases
- [ ] Rewrite `.agent/project-index/INDEX.md` from scratch, alphabetised, with fresh `fetched_at`
- [ ] Walk `posts/*.md` and update project mentions to match the index (prose outside code blocks and frontmatter only)
- [ ] Re-read every touched post against `STYLE_GUIDE.md`; skip forced rewrites and note them
- [ ] Run `cd website && npm run build` to confirm the posts still parse
- [ ] Write the new baseline:

      git rev-parse HEAD > .agent/skills/update-project-index/.last-updated

- [ ] Report: list of projects added / removed / changed in the index, list of posts touched, list of mentions skipped

## Verification

1. `.agent/project-index/INDEX.md` exists, has today's `fetched_at`, and lists every non-archived non-fork public repo.
2. Every entry has at least a GitHub link; entries with a detected publishable manifest have a registry link.
3. No entry contains a link that 404s (spot-check a few).
4. `cd website && npm run build` succeeds.
5. `.last-updated` was rewritten with the new `HEAD`.

## Skill self-improvement

After each run, update this file:

1. **Extend the manifest-to-registry mapping** whenever you hit a new ecosystem.
2. **Record recurring aliases** that were not obvious from the README — next run the skill will know them up front.
3. **Note projects that consistently resist auto-summarisation** (e.g. the README is a wall of badges) so a future run can pull the summary from a different source.
4. **Commit the skill edit** alongside the index refresh so the knowledge compounds.
