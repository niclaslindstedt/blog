#!/usr/bin/env bash
# Clone (or fetch) every project listed in .agent/project-index/INDEX.md into
# a local cache so other skill scripts can read their commit history offline.
#
# Usage:
#   clone-repos.sh              # clone/fetch all projects
#   clone-repos.sh --only <slug>
#
# Cache location: $BLOG_REPO_CACHE (default: /tmp/blog-skill-cache).
# Output: one line per project in the form "<status> <slug>" where <status> is
# one of clone, fetch, skip.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
INDEX="$REPO_ROOT/.agent/project-index/INDEX.md"
CACHE="${BLOG_REPO_CACHE:-/tmp/blog-skill-cache}"

only=""
while [ $# -gt 0 ]; do
  case "$1" in
    --only)
      only="${2:-}"
      if [ -z "$only" ]; then
        echo "clone-repos: --only requires a slug" >&2
        exit 2
      fi
      shift 2
      ;;
    -h|--help)
      while IFS= read -r help_line; do
        case "$help_line" in
          "#!"*) continue ;;
          "# "*) printf '%s\n' "${help_line#\# }" ;;
          "#") printf '\n' ;;
          *) break ;;
        esac
      done < "$0"
      exit 0
      ;;
    *)
      echo "clone-repos: unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

if [ ! -f "$INDEX" ]; then
  echo "clone-repos: project index not found at $INDEX" >&2
  exit 1
fi

mkdir -p "$CACHE"

# Walk the index file: each project starts with "## <slug>" and its GitHub URL
# is on a line matching "- GitHub: <https://github.com/...>".
current_slug=""
while IFS= read -r line; do
  case "$line" in
    "## "*)
      current_slug="${line#\#\# }"
      continue
      ;;
    "- GitHub: <"*">")
      [ -n "$current_slug" ] || continue
      if [ -n "$only" ] && [ "$only" != "$current_slug" ]; then
        current_slug=""
        continue
      fi
      url="${line#- GitHub: <}"
      url="${url%>}"
      target="$CACHE/$current_slug"
      if [ -d "$target/.git" ]; then
        if git -C "$target" fetch --all --prune --quiet 2>/dev/null; then
          echo "fetch $current_slug"
        else
          echo "skip $current_slug (fetch failed)"
        fi
      else
        if git clone --quiet "$url" "$target" 2>/dev/null; then
          echo "clone $current_slug"
        else
          echo "skip $current_slug (clone failed: $url)"
        fi
      fi
      current_slug=""
      ;;
  esac
done < "$INDEX"

if [ -n "$only" ]; then
  if [ ! -d "$CACHE/$only/.git" ]; then
    echo "clone-repos: no project named '$only' in $INDEX" >&2
    exit 1
  fi
fi
