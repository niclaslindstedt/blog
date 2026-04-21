import fs from "node:fs";
import path from "node:path";
import type { Post } from "../src/types.ts";

const POSTS_DIR = path.resolve("..", "posts");
const OUT_DIR = path.join("src", "generated");
const OUT_FILE = path.join(OUT_DIR, "posts.json");
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

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

function loadPost(file: string): Post {
  const slug = path.basename(file, ".md");
  const raw = fs.readFileSync(file, "utf8");
  const { fields, body } = parseFrontmatter(raw, file);
  const { title, date } = fields;
  const edited_at = fields.edited_at ?? date;
  if (!title) die(`${file}: frontmatter missing required 'title'`);
  if (!date) die(`${file}: frontmatter missing required 'date'`);
  if (!ISO_DATE.test(date)) die(`${file}: 'date' must be YYYY-MM-DD, got '${date}'`);
  if (!ISO_DATE.test(edited_at)) die(`${file}: 'edited_at' must be YYYY-MM-DD, got '${edited_at}'`);
  return { slug, title, date, edited_at, body };
}

function main(): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const posts: Post[] = [];
  const seen = new Set<string>();
  if (fs.existsSync(POSTS_DIR)) {
    const files = fs
      .readdirSync(POSTS_DIR)
      .filter((f) => f.endsWith(".md"))
      .map((f) => path.join(POSTS_DIR, f));
    for (const file of files) {
      const post = loadPost(file);
      if (seen.has(post.slug))
        die(`duplicate slug '${post.slug}' (two files would produce the same URL)`);
      seen.add(post.slug);
      posts.push(post);
    }
  }
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  fs.writeFileSync(OUT_FILE, JSON.stringify(posts, null, 2) + "\n");
  process.stderr.write(
    `extract-posts: wrote ${OUT_FILE} (${posts.length} post${posts.length === 1 ? "" : "s"})\n`,
  );
}

main();
