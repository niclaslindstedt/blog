import fs from "node:fs";
import path from "node:path";
import { AUDIENCES, type Audience, type Post, type PostVersion } from "../src/types.ts";

const POSTS_DIR = path.resolve("..", "posts");
const OUT_DIR = path.join("src", "generated");
const OUT_FILE = path.join(OUT_DIR, "posts.json");
// ISO 8601 datetime, UTC-only. Example: 2026-04-21T14:30:00Z or 2026-04-21T14:30:00.123Z.
// Date-only values are rejected — authoring skills must emit a full UTC timestamp.
const ISO_DATETIME_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

function die(msg: string): never {
  process.stderr.write(`extract-posts: ${msg}\n`);
  process.exit(1);
}

function parseFrontmatter(
  raw: string,
  file: string,
): { fields: Record<string, string>; body: string } {
  if (!raw.startsWith("---\n")) die(`${file}: missing YAML frontmatter opening '---'`);
  const end = raw.indexOf("\n---\n", 4);
  if (end === -1) die(`${file}: missing YAML frontmatter closing '---'`);
  const block = raw.slice(4, end);
  const body = raw.slice(end + 5).replace(/^\n+/, "");
  const fields: Record<string, string> = {};
  for (const line of block.split("\n")) {
    if (!line.trim()) continue;
    const colon = line.indexOf(":");
    if (colon === -1) die(`${file}: malformed frontmatter line: ${line}`);
    const key = line.slice(0, colon).trim();
    const value = line
      .slice(colon + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    fields[key] = value;
  }
  return { fields, body };
}

function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function loadVersion(file: string): PostVersion {
  const raw = fs.readFileSync(file, "utf8");
  const { fields, body } = parseFrontmatter(raw, file);
  const { title, date, summary } = fields;
  const edited_at = fields.edited_at ?? date;
  const tags = parseTags(fields.tags);
  if (!title) die(`${file}: frontmatter missing required 'title'`);
  if (!date) die(`${file}: frontmatter missing required 'date'`);
  if (!summary) die(`${file}: frontmatter missing required 'summary'`);
  if (!ISO_DATETIME_UTC.test(date))
    die(`${file}: 'date' must be ISO 8601 UTC datetime (YYYY-MM-DDTHH:MM:SSZ), got '${date}'`);
  if (!ISO_DATETIME_UTC.test(edited_at))
    die(
      `${file}: 'edited_at' must be ISO 8601 UTC datetime (YYYY-MM-DDTHH:MM:SSZ), got '${edited_at}'`,
    );
  return { title, date, edited_at, summary, tags, body };
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
