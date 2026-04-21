#!/usr/bin/env bash
# Find every post whose frontmatter `tags:` line contains the given tag.
#
# Usage:
#   find-posts-by-tag.sh <tag>
#
# Output: one line per match, "<iso-date>\t<path>", sorted by date descending
# (most recent first). Exits 0 with empty stdout when there are no matches.

set -euo pipefail

if [ $# -ne 1 ] || [ -z "$1" ]; then
  echo "usage: find-posts-by-tag.sh <tag>" >&2
  exit 2
fi

tag="$1"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

trim() {
  local s="$1"
  s="${s#"${s%%[![:space:]]*}"}"
  s="${s%"${s##*[![:space:]]}"}"
  printf '%s' "$s"
}

for file in "$REPO_ROOT"/posts/technical/*.md "$REPO_ROOT"/posts/non-technical/*.md; do
  [ -e "$file" ] || continue
  # Read only the frontmatter block (between the first two '---' lines).
  tags_line=""
  date_line=""
  in_fm=0
  while IFS= read -r line; do
    if [ "$line" = "---" ]; then
      if [ "$in_fm" -eq 0 ]; then
        in_fm=1
        continue
      else
        break
      fi
    fi
    [ "$in_fm" -eq 1 ] || continue
    case "$line" in
      "tags:"*) tags_line="${line#tags:}";;
      "date:"*) date_line="${line#date:}";;
    esac
  done < "$file"
  [ -n "$tags_line" ] || continue
  found=0
  IFS=',' read -r -a parts <<< "$tags_line"
  for part in "${parts[@]}"; do
    if [ "$(trim "$part")" = "$tag" ]; then
      found=1
      break
    fi
  done
  [ "$found" -eq 1 ] || continue
  printf '%s\t%s\n' "$(trim "$date_line")" "$file"
done | sort -r
