// Reads the extracted `posts.json` and emits a precomputed search index at
// `src/generated/search-index.json`. The modal lazy-loads this file on
// first open. The index is intentionally redundant with `posts.json` (same
// body text, just normalized) — it trades a few KB on disk for a clean
// boundary between display data and search data.

import fs from "node:fs";
import path from "node:path";
import type { Audience, Post, PostVersion } from "../src/types.ts";
import {
  buildTokenSet,
  normalize,
  stripMarkdown,
  type SearchEntry,
  type SearchIndex,
} from "../src/search.ts";

const POSTS_FILE = path.join("src", "generated", "posts.json");
const OUT_FILE = path.join("src", "generated", "search-index.json");
const INDEX_VERSION = 1;

function buildEntry(post: Post, audience: Audience, version: PostVersion): SearchEntry {
  const bodyText = normalize(stripMarkdown(version.body));
  const tokens = buildTokenSet({
    title: version.title,
    summary: version.summary,
    tags: version.tags,
    keywords: version.keywords ?? [],
    bodyText,
  });
  return {
    slug: post.slug,
    audience,
    title: version.title,
    summary: version.summary,
    tags: version.tags,
    keywords: version.keywords ?? [],
    bodyText,
    tokens,
  };
}

function main(): void {
  if (!fs.existsSync(POSTS_FILE)) {
    process.stderr.write(
      `build-search-index: ${POSTS_FILE} not found — run extract-posts first.\n`,
    );
    process.exit(1);
  }
  const posts = JSON.parse(fs.readFileSync(POSTS_FILE, "utf8")) as Post[];
  const entries: SearchEntry[] = [];
  for (const post of posts) {
    for (const audience of Object.keys(post.versions) as Audience[]) {
      const version = post.versions[audience];
      if (!version) continue;
      entries.push(buildEntry(post, audience, version));
    }
  }
  const index: SearchIndex = { version: INDEX_VERSION, entries };
  fs.writeFileSync(OUT_FILE, JSON.stringify(index) + "\n");
  process.stderr.write(
    `build-search-index: wrote ${OUT_FILE} (${entries.length} entr${entries.length === 1 ? "y" : "ies"})\n`,
  );
}

main();
