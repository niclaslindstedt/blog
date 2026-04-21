export interface GithubFile {
  owner: string;
  repo: string;
  ref: string;
  path: string;
  href: string;
  rawUrl: string;
  fragment?: string;
}

const GITHUB_FILE_RE =
  /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/([^?#]+)(?:\?[^#]*)?(?:#(.*))?$/;

export function parseGithubFileUrl(href: string | undefined): GithubFile | null {
  if (!href) return null;
  const m = GITHUB_FILE_RE.exec(href);
  if (!m) return null;
  const [, owner, repo, ref, path, fragment] = m;
  return {
    owner,
    repo,
    ref,
    path,
    href,
    rawUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`,
    fragment: fragment || undefined,
  };
}

// Parse GitHub's own line-range fragment syntax: `L10` or `L10-L20`.
// Case-insensitive on the `L`. Returns null for anything else (including
// empty / unrelated fragments).
const LINE_RANGE_RE = /^L(\d+)(?:-L(\d+))?$/i;

export function parseLineRange(
  fragment: string | undefined,
): { start: number; end: number } | null {
  if (!fragment) return null;
  const m = LINE_RANGE_RE.exec(fragment);
  if (!m) return null;
  const start = Number.parseInt(m[1], 10);
  const end = m[2] === undefined ? start : Number.parseInt(m[2], 10);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 1 || end < 1) return null;
  return start <= end ? { start, end } : { start: end, end: start };
}

const EXT_LANG: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  md: "markdown",
  markdown: "markdown",
  css: "css",
  scss: "scss",
  html: "markup",
  htm: "markup",
  xml: "markup",
  svg: "markup",
  py: "python",
  rs: "rust",
  go: "go",
  rb: "ruby",
  java: "java",
  kt: "kotlin",
  swift: "swift",
  c: "c",
  h: "c",
  cc: "cpp",
  cpp: "cpp",
  hpp: "cpp",
  cs: "csharp",
  php: "php",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  fish: "bash",
  yml: "yaml",
  yaml: "yaml",
  toml: "toml",
  sql: "sql",
  dockerfile: "docker",
  makefile: "makefile",
};

export function guessLanguage(path: string): string {
  const lower = path.toLowerCase();
  const base = lower.slice(lower.lastIndexOf("/") + 1);
  if (base === "dockerfile") return "docker";
  if (base === "makefile") return "makefile";
  const m = /\.([a-z0-9]+)$/.exec(base);
  if (!m) return "plaintext";
  return EXT_LANG[m[1]] ?? "plaintext";
}
