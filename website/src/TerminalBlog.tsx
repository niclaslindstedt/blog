import { useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { Audience, Post, PostVersion } from "./types.ts";
import type { Step } from "./terminalTypes.ts";
import type { GithubFile } from "./github.ts";
import { Terminal } from "./Terminal.tsx";
import { AudienceTabs } from "./AudienceTabs.tsx";
import { useAudience } from "./AudienceContext.tsx";
import { useFileViewer } from "./FileViewerContext.tsx";
import { usePreferences } from "./PreferencesContext.tsx";
import { ViOpenerContext } from "./ViOpenerContext.tsx";
import { useTerminalAnimation } from "./useTerminalAnimation.ts";
import { postsForAudience, withViewParam } from "./postFilters.ts";
import { BLOG_WPM } from "./typing.ts";

const HEAD_LINES = 10;
const HOME_PROMPT = "~ $";

function codePrompt(audience: Audience): string {
  return `~/code/blog/${audience} $`;
}

// What `cat` prints: the title as an H1 followed by the body. The raw YAML
// frontmatter is metadata, not content — the reader sees a clean document
// with the title heading it and nothing else from the `---` block. Tags are
// rendered separately as an inline clickable row; they aren't part of the
// markdown text because each one needs its own click handler.
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

export function TerminalBlog({ posts }: { posts: Post[] }) {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { audience, setAudience } = useAudience();
  const { setTerminalClosed } = usePreferences();
  const { lines, enqueue, idle, anchor } = useTerminalAnimation(audience);
  const openFile = useFileViewer();

  // Red and yellow dots both dismiss the terminal. Persist the choice in
  // localStorage *and* reflect it in the URL (`?view=blog`) so the fallback
  // state is shareable — pasting the URL into another browser lands the
  // recipient directly on the prose view without relying on their storage.
  const closeTerminal = useCallback(() => {
    setTerminalClosed(true);
    navigate(
      {
        pathname: location.pathname,
        search: withViewParam(location.search, "blog"),
      },
      { replace: true },
    );
  }, [setTerminalClosed, navigate, location.pathname, location.search]);
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
    // Every user-initiated `cat` anchors its command to the top of the
    // viewport so the reader starts at the beginning of the post. Auto-opens
    // during the intro are anchored too — they're the reader's first look at
    // a post and they should also start from the top.
    const catAnchor = true;
    if (!version) {
      notFoundRef.current.add(key);
      enqueue([
        {
          kind: "type-command",
          text: `cat ${slug}.md | head -n ${HEAD_LINES}`,
          prompt,
          wpm: BLOG_WPM,
          anchor: catAnchor,
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
        anchor: catAnchor,
      },
      { kind: "print", text: head, markdown: true },
      { kind: "blank" },
    ];
    if (totalLines > HEAD_LINES) {
      steps.push({ kind: "action", label: "[ show more ]", onClick: () => showMore(slug, a) });
      steps.push({ kind: "blank" });
    } else if (version.tags.length > 0) {
      steps.push({
        kind: "tag-row",
        tags: version.tags,
        onClick: (tag) => enqueueTagSearch(tag, a),
      });
      steps.push({ kind: "blank" });
    }
    enqueue(steps);
  };

  // An explicit click on a post filename (ls entry or grep result) should
  // always re-run `cat`, even if this audience already rendered that post
  // earlier — a reader clicking a filename expects to see the command type out
  // again, not a silent no-op. We clear the "already opened" guard for this
  // slug so enqueueOpen will proceed; the useEffect that fires on slugParam
  // change sees the key re-added and remains a no-op, avoiding a double cat.
  const openPostFromClick = (slug: string) => {
    if (slugParam !== slug) navigate(`/posts/${slug}`);
    const key = openKey(audienceRef.current, slug);
    openedRef.current.delete(key);
    expandedRef.current.delete(key);
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
    const steps: Step[] = [
      {
        kind: "type-command",
        text: `cat ${slug}.md | tail -n +${HEAD_LINES + 1}`,
        prompt: codePrompt(a),
        wpm: BLOG_WPM,
        anchor: true,
      },
      { kind: "type", text: tail, markdown: true, wpm: BLOG_WPM },
      { kind: "blank" },
    ];
    if (version.tags.length > 0) {
      steps.push({
        kind: "tag-row",
        tags: version.tags,
        onClick: (tag) => enqueueTagSearch(tag, a),
      });
      steps.push({ kind: "blank" });
    }
    enqueue(steps);
  };

  // Clicking a #tag under a post runs a `grep` that filters *.md files by a
  // `tags:` frontmatter line containing the tag as a whole word, and then
  // surfaces each matching filename as a clickable `cat` target — same shape
  // as the `ls -1` listing, just filtered.
  const enqueueTagSearch = (tag: string, a: Audience) => {
    const prompt = codePrompt(a);
    const matches = posts.filter((p) => {
      const v = p.versions[a];
      return v !== undefined && v.tags.includes(tag);
    });
    const steps: Step[] = [
      {
        kind: "type-command",
        text: `grep -lE "^tags:.*\\b${tag}\\b" *.md`,
        prompt,
        wpm: BLOG_WPM,
        anchor: true,
      },
    ];
    if (matches.length === 0) {
      steps.push({ kind: "blank" });
      enqueue(steps);
      return;
    }
    for (const p of matches) {
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
        const steps: Step[] = [
          { kind: "delay", ms: 750 },
          {
            kind: "type-command",
            text: `cat ${latest.slug}.md`,
            prompt: codePrompt(a),
            fast: true,
            anchor: true,
          },
          { kind: "type", text: displayText(version), markdown: true, fast: true },
          { kind: "blank" },
        ];
        if (version.tags.length > 0) {
          steps.push({
            kind: "tag-row",
            tags: version.tags,
            onClick: (tag) => enqueueTagSearch(tag, a),
          });
          steps.push({ kind: "blank" });
        }
        enqueue(steps);
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
        anchor={anchor}
        idlePrompt={codePrompt(audience)}
        tabs={<AudienceTabs audience={audience} onSwitch={setAudience} />}
        onClose={closeTerminal}
        onMinimize={closeTerminal}
      />
    </ViOpenerContext.Provider>
  );
}
