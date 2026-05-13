import fs from "node:fs";
import path from "node:path";
import {
  AUDIENCES,
  MENTION_TYPES,
  type Audience,
  type Mention,
  type MentionType,
  type Post,
  type PostVersion,
} from "../src/types.ts";
import { stripMarkdown } from "../src/search.ts";

const POSTS_DIR = path.resolve("..", "posts");
const OUT_DIR = path.join("src", "generated");
const OUT_FILE = path.join(OUT_DIR, "posts.json");
// ISO 8601 datetime, UTC-only. Example: 2026-04-21T14:30:00Z or 2026-04-21T14:30:00.123Z.
// Date-only values are rejected — authoring skills must emit a full UTC timestamp.
const ISO_DATETIME_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

// Keys whose values are block lists of mappings, e.g.
//
//   mentions:
//     - type: highlight
//       title: zag
//       description: ...
//       link: https://...
//
// rather than scalars. Listed here so the parser knows to consume the
// indented continuation lines instead of treating each one as a stray
// top-level field.
const BLOCK_LIST_KEYS = new Set(["mentions"]);

function die(msg: string): never {
  process.stderr.write(`extract-posts: ${msg}\n`);
  process.exit(1);
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' || first === "'") && first === last) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

interface ParsedFrontmatter {
  fields: Record<string, string>;
  lists: Record<string, Record<string, string>[]>;
  body: string;
}

// Parse a frontmatter block. Supports two value forms per key:
//
//   key: value                  (scalar, single line)
//   key:                        (block list — must be in BLOCK_LIST_KEYS)
//     - item_key: value
//       item_key: value
//     - item_key: value
//
// Block-list items are emitted into `lists[key]` as an ordered array of
// `{ item_key: value }` maps. Continuation lines (4-space indent) attach to
// the most recently opened item; a new `  - ` line starts a new item. The
// list ends at the next non-indented line or at the end of the block.
function parseFrontmatter(raw: string, file: string): ParsedFrontmatter {
  if (!raw.startsWith("---\n")) die(`${file}: missing YAML frontmatter opening '---'`);
  const end = raw.indexOf("\n---\n", 4);
  if (end === -1) die(`${file}: missing YAML frontmatter closing '---'`);
  const block = raw.slice(4, end);
  const body = raw.slice(end + 5).replace(/^\n+/, "");
  const fields: Record<string, string> = {};
  const lists: Record<string, Record<string, string>[]> = {};
  const rawLines = block.split("\n");

  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    // Top-level (un-indented) line — either `key: value` or `key:` opening
    // a block list.
    if (line.startsWith(" ") || line.startsWith("\t")) {
      die(`${file}: unexpected indented frontmatter line: ${line}`);
    }
    const colon = line.indexOf(":");
    if (colon === -1) die(`${file}: malformed frontmatter line: ${line}`);
    const key = line.slice(0, colon).trim();
    const rawValue = line.slice(colon + 1);
    const trimmedValue = rawValue.trim();

    if (BLOCK_LIST_KEYS.has(key)) {
      if (trimmedValue.length > 0) {
        die(
          `${file}: '${key}' must be a block list — drop the inline value and use '- key: value' items on indented lines`,
        );
      }
      const items: Record<string, string>[] = [];
      i++;
      let current: Record<string, string> | null = null;
      while (i < rawLines.length) {
        const sub = rawLines[i];
        if (!sub.trim()) {
          i++;
          continue;
        }
        // A non-indented line terminates the block list — back up so the
        // outer loop reads it as the next top-level field.
        if (!(sub.startsWith(" ") || sub.startsWith("\t"))) break;
        const dashMatch = /^\s{2}-\s+(.*)$/.exec(sub);
        if (dashMatch) {
          current = {};
          items.push(current);
          const itemLine = dashMatch[1];
          const itemColon = itemLine.indexOf(":");
          if (itemColon === -1) die(`${file}: malformed '${key}' item line: ${sub}`);
          const itemKey = itemLine.slice(0, itemColon).trim();
          const itemValue = stripQuotes(itemLine.slice(itemColon + 1));
          current[itemKey] = itemValue;
          i++;
          continue;
        }
        const contMatch = /^\s{4}(\S.*)$/.exec(sub);
        if (contMatch) {
          if (!current) die(`${file}: '${key}' continuation line before any '- ' item: ${sub}`);
          const itemLine = contMatch[1];
          const itemColon = itemLine.indexOf(":");
          if (itemColon === -1) die(`${file}: malformed '${key}' item line: ${sub}`);
          const itemKey = itemLine.slice(0, itemColon).trim();
          const itemValue = stripQuotes(itemLine.slice(itemColon + 1));
          current[itemKey] = itemValue;
          i++;
          continue;
        }
        die(`${file}: unrecognised '${key}' block-list line: ${sub}`);
      }
      lists[key] = items;
      continue;
    }

    fields[key] = stripQuotes(rawValue);
    i++;
  }
  return { fields, lists, body };
}

function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

// Count visible words in the markdown body for JSON-LD `wordCount` and a
// cheap reading-time estimate. The same `stripMarkdown` helper is reused by
// the search index builder so the indexed text matches the counted prose.
function countWords(body: string): number {
  const words = stripMarkdown(body).trim().split(/\s+/).filter(Boolean);
  return words.length;
}

function isMentionType(value: string): value is MentionType {
  return (MENTION_TYPES as readonly string[]).includes(value);
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/.test(value);
}

function parseMentions(items: Record<string, string>[] | undefined, file: string): Mention[] {
  if (!items || items.length === 0) return [];
  const mentions: Mention[] = [];
  let highlights = 0;
  for (const [i, item] of items.entries()) {
    const { type, title, description, link } = item;
    if (!type) die(`${file}: 'mentions[${i}]' missing required 'type'`);
    if (!isMentionType(type))
      die(
        `${file}: 'mentions[${i}].type' must be one of ${MENTION_TYPES.join(", ")}, got '${type}'`,
      );
    if (!title) die(`${file}: 'mentions[${i}]' missing required 'title'`);
    if (!description) die(`${file}: 'mentions[${i}]' missing required 'description'`);
    if (!link) die(`${file}: 'mentions[${i}]' missing required 'link'`);
    if (!isHttpUrl(link))
      die(`${file}: 'mentions[${i}].link' must be an http(s) URL, got '${link}'`);
    const allowed = new Set(["type", "title", "description", "link"]);
    for (const key of Object.keys(item)) {
      if (!allowed.has(key)) die(`${file}: 'mentions[${i}]' has unknown field '${key}'`);
    }
    if (type === "highlight") highlights++;
    mentions.push({ type, title, description, link });
  }
  if (highlights > 1)
    die(`${file}: at most one mention may have type 'highlight' (found ${highlights})`);
  return mentions;
}

function loadVersion(file: string): PostVersion {
  const raw = fs.readFileSync(file, "utf8");
  const { fields, lists, body } = parseFrontmatter(raw, file);
  const { title, date, summary } = fields;
  const edited_at = fields.edited_at ?? date;
  const tags = parseTags(fields.tags);
  const keywords = parseTags(fields.keywords);
  const mentions = parseMentions(lists.mentions, file);
  if (!title) die(`${file}: frontmatter missing required 'title'`);
  if (!date) die(`${file}: frontmatter missing required 'date'`);
  if (!summary) die(`${file}: frontmatter missing required 'summary'`);
  if (!ISO_DATETIME_UTC.test(date))
    die(`${file}: 'date' must be ISO 8601 UTC datetime (YYYY-MM-DDTHH:MM:SSZ), got '${date}'`);
  if (!ISO_DATETIME_UTC.test(edited_at))
    die(
      `${file}: 'edited_at' must be ISO 8601 UTC datetime (YYYY-MM-DDTHH:MM:SSZ), got '${edited_at}'`,
    );
  const wordCount = countWords(body);
  const readingTimeMinutes = Math.max(1, Math.round(wordCount / 225));
  return {
    title,
    date,
    edited_at,
    summary,
    tags,
    keywords,
    mentions,
    body,
    wordCount,
    readingTimeMinutes,
  };
}

function main(): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const bySlug = new Map<string, Post>();

  for (const audience of AUDIENCES) {
    const dir = path.join(POSTS_DIR, audience);
    if (!fs.existsSync(dir)) continue;
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => path.join(dir, f));
    for (const file of files) {
      const slug = path.basename(file, ".md");
      const version = loadVersion(file);
      const existing = bySlug.get(slug);
      if (existing) {
        existing.versions[audience] = version;
        if (version.date < existing.date) existing.date = version.date;
        if (audience === "technical") existing.title = version.title;
      } else {
        const post: Post = {
          slug,
          date: version.date,
          title: version.title,
          versions: { [audience]: version } as Partial<Record<Audience, PostVersion>>,
        };
        bySlug.set(slug, post);
      }
    }
  }

  // Stray files directly under posts/ are almost always a mistake — flag them
  // so contributors don't silently produce a post that never reaches the site.
  if (fs.existsSync(POSTS_DIR)) {
    const stray = fs
      .readdirSync(POSTS_DIR, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => e.name);
    if (stray.length > 0)
      die(
        `posts under posts/ must live in posts/technical/ or posts/non-technical/ — found stray file(s): ${stray.join(", ")}`,
      );
  }

  const posts = [...bySlug.values()].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
  );

  fs.writeFileSync(OUT_FILE, JSON.stringify(posts, null, 2) + "\n");
  process.stderr.write(
    `extract-posts: wrote ${OUT_FILE} (${posts.length} post${posts.length === 1 ? "" : "s"})\n`,
  );
}

main();
