#!/usr/bin/env bash
# Print the default branch name for a cached project clone (e.g. "main").
#
# Usage:
#   default-branch.sh <project-slug>
#
# Cache location: $BLOG_REPO_CACHE (default: /tmp/blog-skill-cache). If the
# slug is not yet cached, this script invokes clone-repos.sh to fetch it.
#
# Output: a single line containing the branch name. Last-resort fallback is
# "main" if the remote HEAD cannot be resolved.

set -euo pipefail

if [ $# -ne 1 ] || [ -z "$1" ]; then
  echo "usage: default-branch.sh <project-slug>" >&2
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
  echo "default-branch: no cached repo at $target" >&2
  exit 1
fi

# Fast path: symbolic-ref on refs/remotes/origin/HEAD. Works when the clone
# was made via `git clone` (which sets origin/HEAD automatically).
if ref="$(git -C "$target" symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null)"; then
  printf '%s\n' "${ref#origin/}"
  exit 0
fi

# Fallback: ask the remote. Slower but works on mirrors / older clones.
if branch="$(git -C "$target" remote show origin 2>/dev/null | awk '/HEAD branch/ {print $NF; exit}')" && [ -n "$branch" ] && [ "$branch" != "(unknown)" ]; then
  printf '%s\n' "$branch"
  exit 0
fi

printf 'main\n'
