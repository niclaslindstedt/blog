#!/usr/bin/env bash
# Print the current HEAD commit SHA on the default branch of a cached project
# clone. Citation URLs pin this SHA so line ranges stay accurate even if the
# file later changes, moves, or is deleted.
#
# Usage:
#   latest-commit.sh <project-slug>
#
# Cache location: $BLOG_REPO_CACHE (default: /tmp/blog-skill-cache). If the
# slug is not yet cached, this script invokes clone-repos.sh to fetch it.
#
# Output: a single line containing the full 40-character commit SHA.

set -euo pipefail

if [ $# -ne 1 ] || [ -z "$1" ]; then
  echo "usage: latest-commit.sh <project-slug>" >&2
  exit 2
fi

slug="$1"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CACHE="${BLOG_REPO_CACHE:-/tmp/blog-skill-cache}"
target="$CACHE/$slug"

if [ ! -d "$target/.git" ]; then
  "$SCRIPT_DIR/clone-repos.sh" --only "$slug" >/dev/null
fi

if [ ! -d "$target/.git" ]; then
  echo "latest-commit: no cached repo at $target" >&2
  exit 1
fi

# Resolve default branch so we can look up its tip. Fast path:
# symbolic-ref on refs/remotes/origin/HEAD (set by `git clone`).
branch=""
if ref="$(git -C "$target" symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null)"; then
  branch="${ref#origin/}"
fi

# Fallback: ask the remote. Slower but works on mirrors / older clones.
if [ -z "$branch" ]; then
  if resolved="$(git -C "$target" remote show origin 2>/dev/null | awk '/HEAD branch/ {print $NF; exit}')" && [ -n "$resolved" ] && [ "$resolved" != "(unknown)" ]; then
    branch="$resolved"
  fi
fi

# Last-resort fallback.
if [ -z "$branch" ]; then
  branch="main"
fi

if sha="$(git -C "$target" rev-parse "refs/remotes/origin/$branch" 2>/dev/null)" && [ -n "$sha" ]; then
  printf '%s\n' "$sha"
  exit 0
fi

echo "latest-commit: could not resolve SHA for origin/$branch in $target" >&2
exit 1
