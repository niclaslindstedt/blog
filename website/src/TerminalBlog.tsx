import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Post } from "./types.ts";
import type { Step } from "./terminalTypes.ts";
import { Terminal } from "./Terminal.tsx";
import { useTerminalAnimation } from "./useTerminalAnimation.ts";

const HEAD_LINES = 10;
const HOME_PROMPT = "~ $";
const CODE_PROMPT = "~/code $";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function rawFile(p: Post): string {
  const fm = `---\ntitle: ${p.title}\ndate: ${p.date}\nedited_at: ${p.edited_at}\n---`;
  return `${fm}\n\n${p.body.replace(/\s+$/, "")}`;
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

function fmtLsDate(iso: string): string {
  const [, m, d] = iso.split("-");
  const month = MONTHS[parseInt(m, 10) - 1] ?? "---";
  const day = String(parseInt(d, 10)).padStart(2, " ");
  return `${month} ${day}`;
}

function lsPrefix(p: Post, bytes: number): string {
  const size = String(bytes).padStart(6, " ");
  return `-rw-r--r-- 1 niclas staff ${size} ${fmtLsDate(p.date)} `;
}

export function TerminalBlog({ posts }: { posts: Post[] }) {
  const { lines, enqueue, idle } = useTerminalAnimation();
  const { slug: slugParam } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const startedRef = useRef(false);
  const openedRef = useRef(new Set<string>());
  const expandedRef = useRef(new Set<string>());
  const notFoundRef = useRef(new Set<string>());

  const enqueueOpen = (slug: string) => {
    if (openedRef.current.has(slug) || notFoundRef.current.has(slug)) return;
    const post = posts.find((p) => p.slug === slug);
    if (!post) {
      notFoundRef.current.add(slug);
      enqueue([
        {
          kind: "type-command",
          text: `cat ${slug}.md | head -n ${HEAD_LINES}`,
          prompt: CODE_PROMPT,
        },
        {
          kind: "print",
          text: `cat: ${slug}.md: No such file or directory`,
          color: "error",
        },
        { kind: "blank" },
      ]);
      return;
    }
    openedRef.current.add(slug);
    const raw = rawFile(post);
    const totalLines = raw.split("\n").length;
    const head = headBlock(raw, HEAD_LINES);
    const steps: Step[] = [
      {
        kind: "type-command",
        text: `cat ${slug}.md | head -n ${HEAD_LINES}`,
        prompt: CODE_PROMPT,
      },
      { kind: "print", text: head },
      { kind: "blank" },
    ];
    if (totalLines > HEAD_LINES) {
      steps.push({ kind: "action", label: "[ show more ]", onClick: () => showMore(slug) });
      steps.push({ kind: "blank" });
    }
    enqueue(steps);
  };

  const openPostFromClick = (slug: string) => {
    if (slugParam !== slug) navigate(`/posts/${slug}`);
    enqueueOpen(slug);
  };

  const showMore = (slug: string) => {
    if (expandedRef.current.has(slug)) return;
    expandedRef.current.add(slug);
    const post = posts.find((p) => p.slug === slug);
    if (!post) return;
    const raw = rawFile(post);
    const tail = tailBlock(raw, HEAD_LINES + 1);
    enqueue([
      {
        kind: "type-command",
        text: `cat ${slug}.md | tail -n +${HEAD_LINES + 1}`,
        prompt: CODE_PROMPT,
      },
      { kind: "type", text: tail, markdown: true },
      { kind: "blank" },
    ]);
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const steps: Step[] = [
      { kind: "type-command", text: "cd code", prompt: HOME_PROMPT },
      { kind: "type-command", text: "ls -l", prompt: CODE_PROMPT },
    ];

    if (posts.length === 0) {
      steps.push({
        kind: "print",
        text: "total 0",
        color: "dim",
      });
      steps.push({
        kind: "print",
        text: "(no posts yet — write one with the /write-post skill)",
        color: "dim",
      });
      steps.push({ kind: "blank" });
    } else {
      steps.push({ kind: "print", text: `total ${posts.length}`, color: "dim" });
      for (const p of posts) {
        const bytes = rawFile(p).length;
        steps.push({
          kind: "clickable",
          prefix: lsPrefix(p, bytes),
          label: `${p.slug}.md`,
          color: "accent",
          onClick: () => openPostFromClick(p.slug),
        });
      }
      steps.push({ kind: "blank" });

      if (slugParam) {
        // deep-link: skip the latest-auto-cat and open the requested post
        // (enqueued below via the slug-effect)
      } else {
        // default: fast-cat the latest post so the page isn't empty
        const latest = posts[0];
        openedRef.current.add(latest.slug);
        steps.push({
          kind: "type-command",
          text: `cat ${latest.slug}.md`,
          prompt: CODE_PROMPT,
          fast: true,
        });
        steps.push({ kind: "type", text: rawFile(latest), markdown: true, fast: true });
        steps.push({ kind: "blank" });
      }
    }

    enqueue(steps);
    if (slugParam) enqueueOpen(slugParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!startedRef.current) return;
    if (slugParam) enqueueOpen(slugParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugParam]);

  return <Terminal lines={lines} idle={idle} idlePrompt={CODE_PROMPT} />;
}
