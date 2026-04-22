import { useCallback, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Audience, Post, PostVersion } from "./types.ts";
import type { Step } from "./terminalTypes.ts";
import type { GithubFile } from "./github.ts";
import { Terminal } from "./Terminal.tsx";
import { AudienceTabs } from "./AudienceTabs.tsx";
import { useAudience } from "./AudienceContext.tsx";
import { useFileViewer } from "./FileViewerContext.tsx";
import { ViOpenerContext } from "./ViOpenerContext.tsx";
import { useTerminalAnimation } from "./useTerminalAnimation.ts";
import { BLOG_WPM } from "./typing.ts";

const HEAD_LINES = 10;
const HOME_PROMPT = "~ $";

function codePrompt(audience: Audience): string {
  return `~/code/blog/${audience} $`;
}

// What `cat` prints: the title as an H1 followed by the body. The raw YAML
// frontmatter is metadata, not content — the reader sees a clean document
// with the title heading it and nothing else from the `---` block.
function displayText(v: PostVersion): string {
  const body = v.body.replace(/\s+$/, "");
  return `# ${v.title}\n\n${body}`;
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

function postsForAudience(posts: Post[], audience: Audience): Post[] {
  return posts.filter((p) => p.versions[audience]);
}

export function TerminalBlog({ posts }: { posts: Post[] }) {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { audience, setAudience } = useAudience();
  const { lines, enqueue, idle } = useTerminalAnimation(audience);
  const openFile = useFileViewer();
  const startedRef = useRef(false);
  // Keyed by `${audience}:${slug}` — a post is "opened" independently in each audience.
  const openedRef = useRef(new Set<string>());
  const expandedRef = useRef(new Set<string>());
  const notFoundRef = useRef(new Set<string>());
  const visitedRef = useRef(new Set<Audience>());
  const audienceRef = useRef<Audience>(audience);

  const openKey = (a: Audience, slug: string) => `${a}:${slug}`;

  const openInVi = useCallback(
    (file: GithubFile) => {
      enqueue([
        {
          kind: "type-command",
          text: `vi ${file.path}`,
          prompt: codePrompt(audienceRef.current),
          wpm: BLOG_WPM,
        },
        { kind: "effect", run: () => openFile(file) },
      ]);
    },
    [enqueue, openFile],
  );

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
    const content = displayText(version);
    const totalLines = content.split("\n").length;
    const head = headBlock(content, HEAD_LINES);
    const steps: Step[] = [
      {
        kind: "type-command",
        text: `cat ${slug}.md | head -n ${HEAD_LINES}`,
        prompt,
        wpm: BLOG_WPM,
      },
      { kind: "print", text: head, markdown: true },
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
    const content = displayText(version);
    const tail = tailBlock(content, HEAD_LINES + 1);
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
    // `ls -1` (one-per-line) keeps the listing a clean vertical column and
    // avoids the multi-column output real `ls` produces on a tty. The date
    // lives in the filename itself (`YYYY-MM-DD-<slug>.md`) so the listing
    // stays readable on narrow viewports without horizontal scroll.
    const steps: Step[] = [{ kind: "type-command", text: "ls -1", prompt, wpm: BLOG_WPM }];
    if (visible.length === 0) {
      steps.push({
        kind: "print",
        text: `(no ${a} posts yet — write one with the /write-post skill)`,
        color: "dim",
      });
      steps.push({ kind: "blank" });
      enqueue(steps);
      return;
    }
    for (const p of visible) {
      if (!p.versions[a]) continue;
      steps.push({
        kind: "clickable",
        label: `${p.slug}.md`,
        color: "accent",
        onClick: () => openPostFromClick(p.slug),
      });
    }
    steps.push({ kind: "blank" });
    enqueue(steps);
  };

  const runIntro = (a: Audience) => {
    const visible = postsForAudience(posts, a);
    enqueue([
      {
        kind: "type-command",
        text: `cd code/blog/${a}`,
        prompt: HOME_PROMPT,
        wpm: BLOG_WPM,
      },
    ]);
    enqueueListing(a, visible);

    if (!slugParam && visible.length > 0) {
      const latest = visible[0];
      const version = latest.versions[a];
      if (version) {
        openedRef.current.add(openKey(a, latest.slug));
        enqueue([
          {
            kind: "type-command",
            text: `cat ${latest.slug}.md`,
            prompt: codePrompt(a),
            fast: true,
          },
          { kind: "type", text: displayText(version), markdown: true, fast: true },
          { kind: "blank" },
        ]);
      }
    }

    if (slugParam) enqueueOpen(slugParam, a);
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    audienceRef.current = audience;
    visitedRef.current.add(audience);
    runIntro(audience);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Audience tab switch (after initial mount): each audience owns its own
  // terminal session, so swapping just swaps the scrollback — no `clear`, no
  // re-animated `cd`. The first time a tab is focused we run the intro from
  // scratch (cd, ls, cat latest) in that session; subsequent visits resume
  // the session exactly where it was left.
  useEffect(() => {
    if (!startedRef.current) return;
    if (audience === audienceRef.current) return;
    audienceRef.current = audience;

    if (!visitedRef.current.has(audience)) {
      visitedRef.current.add(audience);
      runIntro(audience);
      return;
    }

    if (slugParam) enqueueOpen(slugParam, audience);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audience]);

  useEffect(() => {
    if (!startedRef.current) return;
    if (slugParam) enqueueOpen(slugParam, audienceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugParam]);

  return (
    <ViOpenerContext.Provider value={openInVi}>
      <Terminal
        lines={lines}
        idle={idle}
        idlePrompt={codePrompt(audience)}
        tabs={<AudienceTabs audience={audience} onSwitch={setAudience} />}
      />
    </ViOpenerContext.Provider>
  );
}
