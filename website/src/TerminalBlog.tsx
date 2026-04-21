import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Audience, Post, PostVersion } from "./types.ts";
import type { Step } from "./terminalTypes.ts";
import { Terminal } from "./Terminal.tsx";
import { AudienceTabs } from "./AudienceTabs.tsx";
import { useAudience } from "./AudienceContext.tsx";
import { useTerminalAnimation } from "./useTerminalAnimation.ts";
import { BLOG_WPM } from "./typing.ts";

const HEAD_LINES = 10;
const HOME_PROMPT = "~ $";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function codePrompt(audience: Audience): string {
  return `~/code/blog/${audience} $`;
}

function rawFile(v: PostVersion): string {
  const fm = `---\ntitle: ${v.title}\ndate: ${v.date}\nedited_at: ${v.edited_at}\n---`;
  return `${fm}\n\n${v.body.replace(/\s+$/, "")}`;
}

function headBlock(raw: string, n: number): string {
  return raw.split("\n").slice(0, n).join("\n");
}

function tailBlock(raw: string, startLine: number): string {
  return raw
    .split("\n")
    .slice(startLine - 1)
    .join("\n");
}

// Real `ls -l` renders the mtime as `MMM DD HH:MM` when the file was modified
// in the last ~6 months and `MMM DD  YYYY` otherwise. We mirror that exactly
// so the transcript looks like a real terminal — the frontmatter `date` plays
// the role of mtime.
const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 30 * 6;

function fmtLsDate(iso: string, now: number = Date.now()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--- --";
  const month = MONTHS[d.getUTCMonth()] ?? "---";
  const day = String(d.getUTCDate()).padStart(2, " ");
  if (now - d.getTime() > SIX_MONTHS_MS) {
    return `${month} ${day}  ${d.getUTCFullYear()}`;
  }
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${month} ${day} ${hh}:${mm}`;
}

function lsPrefix(v: PostVersion, bytes: number): string {
  const size = String(bytes).padStart(6, " ");
  return `-rw-r--r-- 1 niclas staff ${size} ${fmtLsDate(v.date)} `;
}

function postsForAudience(posts: Post[], audience: Audience): Post[] {
  return posts.filter((p) => p.versions[audience]);
}

export function TerminalBlog({ posts }: { posts: Post[] }) {
  const { lines, enqueue, idle } = useTerminalAnimation();
  const { slug: slugParam } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { audience, setAudience } = useAudience();
  const startedRef = useRef(false);
  // Keyed by `${audience}:${slug}` — a post is "opened" independently in each audience.
  const openedRef = useRef(new Set<string>());
  const expandedRef = useRef(new Set<string>());
  const notFoundRef = useRef(new Set<string>());
  const audienceRef = useRef<Audience>(audience);

  const openKey = (a: Audience, slug: string) => `${a}:${slug}`;

  const enqueueOpen = (slug: string, a: Audience) => {
    const key = openKey(a, slug);
    if (openedRef.current.has(key) || notFoundRef.current.has(key)) return;
    const prompt = codePrompt(a);
    const post = posts.find((p) => p.slug === slug);
    const version = post?.versions[a];
    if (!version) {
      notFoundRef.current.add(key);
      enqueue([
        {
          kind: "type-command",
          text: `cat ${slug}.md | head -n ${HEAD_LINES}`,
          prompt,
          wpm: BLOG_WPM,
        },
        {
          kind: "print",
          text: `cat: ${slug}.md: No such file or directory`,
          color: "error",
        },
        { kind: "blank" },
      ]);
      const other: Audience = a === "technical" ? "non-technical" : "technical";
      if (post?.versions[other]) {
        enqueue([
          {
            kind: "action",
            label: `[ switch to ${other} version ]`,
            onClick: () => setAudience(other),
          },
          { kind: "blank" },
        ]);
      }
      return;
    }
    openedRef.current.add(key);
    const raw = rawFile(version);
    const totalLines = raw.split("\n").length;
    const head = headBlock(raw, HEAD_LINES);
    const steps: Step[] = [
      {
        kind: "type-command",
        text: `cat ${slug}.md | head -n ${HEAD_LINES}`,
        prompt,
        wpm: BLOG_WPM,
      },
      { kind: "print", text: head },
      { kind: "blank" },
    ];
    if (totalLines > HEAD_LINES) {
      steps.push({ kind: "action", label: "[ show more ]", onClick: () => showMore(slug, a) });
      steps.push({ kind: "blank" });
    }
    enqueue(steps);
  };

  const openPostFromClick = (slug: string) => {
    if (slugParam !== slug) navigate(`/posts/${slug}`);
    enqueueOpen(slug, audienceRef.current);
  };

  const showMore = (slug: string, a: Audience) => {
    const key = openKey(a, slug);
    if (expandedRef.current.has(key)) return;
    expandedRef.current.add(key);
    const post = posts.find((p) => p.slug === slug);
    const version = post?.versions[a];
    if (!version) return;
    const raw = rawFile(version);
    const tail = tailBlock(raw, HEAD_LINES + 1);
    enqueue([
      {
        kind: "type-command",
        text: `cat ${slug}.md | tail -n +${HEAD_LINES + 1}`,
        prompt: codePrompt(a),
        wpm: BLOG_WPM,
      },
      { kind: "type", text: tail, markdown: true, wpm: BLOG_WPM },
      { kind: "blank" },
    ]);
  };

  const enqueueListing = (a: Audience, visible: Post[]): void => {
    const prompt = codePrompt(a);
    const steps: Step[] = [{ kind: "type-command", text: "ls -l", prompt, wpm: BLOG_WPM }];
    if (visible.length === 0) {
      steps.push({ kind: "print", text: "total 0", color: "dim" });
      steps.push({
        kind: "print",
        text: `(no ${a} posts yet — write one with the /write-post skill)`,
        color: "dim",
      });
      steps.push({ kind: "blank" });
      enqueue(steps);
      return;
    }
    steps.push({ kind: "print", text: `total ${visible.length}`, color: "dim" });
    for (const p of visible) {
      const version = p.versions[a];
      if (!version) continue;
      const bytes = rawFile(version).length;
      steps.push({
        kind: "clickable",
        prefix: lsPrefix(version, bytes),
        label: `${p.slug}.md`,
        color: "accent",
        onClick: () => openPostFromClick(p.slug),
      });
    }
    steps.push({ kind: "blank" });
    enqueue(steps);
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    audienceRef.current = audience;

    const visible = postsForAudience(posts, audience);
    enqueue([
      {
        kind: "type-command",
        text: `cd code/blog/${audience}`,
        prompt: HOME_PROMPT,
        wpm: BLOG_WPM,
      },
    ]);
    enqueueListing(audience, visible);

    if (!slugParam && visible.length > 0) {
      const latest = visible[0];
      const version = latest.versions[audience];
      if (version) {
        openedRef.current.add(openKey(audience, latest.slug));
        enqueue([
          {
            kind: "type-command",
            text: `cat ${latest.slug}.md`,
            prompt: codePrompt(audience),
            fast: true,
          },
          { kind: "type", text: rawFile(version), markdown: true, fast: true },
          { kind: "blank" },
        ]);
      }
    }

    if (slugParam) enqueueOpen(slugParam, audience);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Audience tab switch (after initial mount): animate the cd + re-ls,
  // and re-open the current post under the new audience if there is one.
  useEffect(() => {
    if (!startedRef.current) return;
    if (audience === audienceRef.current) return;
    audienceRef.current = audience;

    const visible = postsForAudience(posts, audience);
    enqueue([
      {
        kind: "type-command",
        text: `cd ../${audience}`,
        prompt: codePrompt(audience === "technical" ? "non-technical" : "technical"),
        wpm: BLOG_WPM,
      },
    ]);
    enqueueListing(audience, visible);
    if (slugParam) enqueueOpen(slugParam, audience);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audience]);

  useEffect(() => {
    if (!startedRef.current) return;
    if (slugParam) enqueueOpen(slugParam, audienceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugParam]);

  return (
    <Terminal
      lines={lines}
      idle={idle}
      idlePrompt={codePrompt(audience)}
      tabs={<AudienceTabs audience={audience} onSwitch={setAudience} />}
    />
  );
}
