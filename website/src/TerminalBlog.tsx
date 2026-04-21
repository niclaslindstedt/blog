import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Post } from "./types.ts";
import type { Step } from "./terminalTypes.ts";
import { Terminal } from "./Terminal.tsx";
import { useTerminalAnimation } from "./useTerminalAnimation.ts";

const HEAD_LINES = 10;

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
        { kind: "type-command", text: `cat posts/${slug}.md | head -n ${HEAD_LINES}` },
        {
          kind: "print",
          text: `cat: posts/${slug}.md: No such file or directory`,
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
      { kind: "type-command", text: `cat posts/${slug}.md | head -n ${HEAD_LINES}` },
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
      { kind: "type-command", text: `cat posts/${slug}.md | tail -n +${HEAD_LINES + 1}` },
      { kind: "type", text: tail, markdown: true },
      { kind: "blank" },
    ]);
  };

  // First mount: run ls and, if a slug is in the URL, open it afterward.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const steps: Step[] = [{ kind: "type-command", text: "ls posts/" }];
    if (posts.length === 0) {
      steps.push({
        kind: "print",
        text: "(no posts yet — write one with the /write-post skill)",
        color: "dim",
      });
    } else {
      for (const p of posts) {
        steps.push({
          kind: "clickable",
          label: `${p.slug}.md`,
          color: "accent",
          onClick: () => openPostFromClick(p.slug),
        });
      }
    }
    steps.push({ kind: "blank" });
    enqueue(steps);
    if (slugParam) enqueueOpen(slugParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subsequent navigation (e.g., Back/Forward) to a new slug.
  useEffect(() => {
    if (!startedRef.current) return;
    if (slugParam) enqueueOpen(slugParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugParam]);

  return <Terminal lines={lines} idle={idle} />;
}
