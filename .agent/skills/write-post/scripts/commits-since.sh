#!/usr/bin/env bash
# Print one line per commit in a cached project repo.
#
# Usage:
#   commits-since.sh <project-slug> <iso-datetime|initial>
#
# When the second argument is the literal string "initial", prints the last 50
# commits regardless of date — the "no prior post" case for brainstorming. Any
# other value is passed to `git log --since=<value>`.
#
# The cache is $BLOG_REPO_CACHE (default: /tmp/blog-skill-cache). If the slug
# is not yet cached, this script invokes clone-repos.sh to fetch it.
#
# Output: "<short-hash> <iso-date> <subject>" per commit.

set -euo pipefail

if [ $# -ne 2 ] || [ -z "$1" ] || [ -z "$2" ]; then
  echo "usage: commits-since.sh <project-slug> <iso-datetime|initial>" >&2
  exit 2
fi

slug="$1"
since="$2"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CACHE="${BLOG_REPO_CACHE:-/tmp/blog-skill-cache}"
target="$CACHE/$slug"

if [ ! -d "$target/.git" ]; then
  "$SCRIPT_DIR/clone-repos.sh" --only "$slug" >/dev/null
fi

if [ ! -d "$target/.git" ]; then
  echo "commits-since: no cached repo at $target" >&2
  exit 1
fi

if [ "$since" = "initial" ]; then
  git -C "$target" log --no-merges --max-count=50 --pretty=format:'%h %cI %s'
else
  git -C "$target" log --no-merges --since="$since" --max-count=200 --pretty=format:'%h %cI %s'
fi
echo
