import { useCallback, useEffect, useRef } from "react";
import type { Audience, Post, PostVersion } from "./types.ts";
import type { AnchorSignal, GithubFile, LineData, Step, TabStop } from "./terminal/index.ts";
import { useTerminalAnimation, BLOG_WPM } from "./terminal/index.ts";
import { useFileViewer } from "./terminal/FileViewerContext.tsx";
import { postsForAudience } from "./postFilters.ts";

function audienceCwd(audience: Audience): string {
  return `~/blog/posts/${audience}`;
}

// What `sed '1,/^---$/d'` prints: the body with the YAML frontmatter stripped.
// The title is reintroduced as an H1 by the renderer so the reader still sees a
// clean document headed by the post's title. Tags are rendered separately as
// an inline clickable row; they aren't part of the markdown text because each
// one needs its own click handler.
function displayText(v: PostVersion): string {
  const body = v.body.replace(/\s+$/, "");
  return `# ${v.title}\n\n${body}`;
}

// Files that `ls -1` would list in the audience's working directory. These are
// the tab-completion candidates a real shell would have to choose from.
function filenamesInAudience(posts: Post[], a: Audience): string[] {
  return posts.flatMap((p) => (p.versions[a] ? [`${p.slug}.md`] : []));
}

// Length of the shortest prefix of `target` that no other candidate starts
// with — i.e. how many characters the user would have to type before Tab
// can unambiguously complete the filename. Returns `target.length` when no
// such prefix exists (another candidate equals target, or target is empty).
function minUniquePrefixLen(target: string, candidates: string[]): number {
  const others = candidates.filter((c) => c !== target);
  if (target.length === 0) return 0;
  if (others.length === 0) return 1;
  for (let n = 1; n <= target.length; n++) {
    const pfx = target.slice(0, n);
    if (!others.some((o) => o.startsWith(pfx))) return n;
  }
  return target.length;
}

// Tab stop for `sed '1,/^---$/d' <filename>`: pauses at the shortest unique
// prefix and snaps to the full filename. Returns an empty list when no
// shortcut is possible (another candidate equals target, or target is empty).
function sedTabStops(filename: string, candidates: string[]): TabStop[] {
  const commandPrefix = `sed '1,/^---$/d' `;
  const unique = minUniquePrefixLen(filename, candidates);
  if (unique >= filename.length) return [];
  return [{ at: commandPrefix.length + unique, to: commandPrefix.length + filename.length }];
}

// Tab stops for each folder segment of a path starting at `startOffset` in
// `command`. A segment longer than `minTyped` characters gets a stop that
// fires after `minTyped` keystrokes and snaps to the end of the segment —
// including its trailing `/` for directory segments, mirroring how bash
// tab-completion fills in a directory name.
function pathTabStops(command: string, startOffset: number, minTyped = 3): TabStop[] {
  const stops: TabStop[] = [];
  let i = startOffset;
  while (i < command.length) {
    const slash = command.indexOf("/", i);
    const segmentEnd = slash === -1 ? command.length : slash;
    const segmentLen = segmentEnd - i;
    if (segmentLen > minTyped) {
      const snapTo = slash === -1 ? segmentEnd : segmentEnd + 1;
      stops.push({ at: i + minTyped, to: snapTo });
    }
    i = slash === -1 ? command.length : slash + 1;
  }
  return stops;
}

export interface UseTerminalBlogSessionConfig {
  posts: Post[];
  audience: Audience;
  slugParam: string | undefined;
  setAudience: (a: Audience) => void;
  // Navigation hook into react-router so the blog session can change the URL
  // when the reader clicks a post filename. Called with the slug (not a full
  // path) so the caller chooses the route shape.
  onNavigateToSlug: (slug: string) => void;
}

export interface UseTerminalBlogSession {
  lines: LineData[];
  idle: boolean;
  anchor: AnchorSignal | null;
  cwd: string;
  prompt: string;
  // Opens a GitHub file in the terminal's vi viewer, preceded by an animated
  // `curl ... | vi -` at the current prompt. Passed into the kernel's
  // ViOpenerContext so markdown links trigger this behaviour.
  openInVi: (file: GithubFile) => void;
}

// Blog-specific orchestration on top of the terminal kernel. Owns the session
// bookkeeping (which post has been rendered in which audience, which audiences
// have already cd'd, the previous slugParam) and exposes just the animation
// state the component needs for rendering. The three reactive concerns —
// initial mount, audience switch, slug change — are handled internally as
// useEffects so the component doesn't have to know about them.
export function useTerminalBlogSession(
  config: UseTerminalBlogSessionConfig,
): UseTerminalBlogSession {
  const { posts, audience, slugParam, setAudience, onNavigateToSlug } = config;
  const { lines, enqueue, idle, anchor, cwd, prompt } = useTerminalAnimation(audience);
  const openFile = useFileViewer();

  const startedRef = useRef(false);
  // Keyed by `${audience}:${slug}` — a post is "opened" independently in each audience.
  const openedRef = useRef(new Set<string>());
  const notFoundRef = useRef(new Set<string>());
  const visitedRef = useRef(new Set<Audience>());
  // Audiences whose working directory has already been cd'd into in this
  // session. Going back from a post to the index just re-runs `ls` + `grep` —
  // we're still in the directory, no need to cd again.
  const cdedRef = useRef(new Set<Audience>());
  const audienceRef = useRef<Audience>(audience);
  const slugParamRef = useRef<string | undefined>(slugParam);
  const prevSlugRef = useRef<string | undefined>(slugParam);

  // The command builders close over refs, not props, because they get invoked
  // from queued `onClick` handlers and deferred `effect` steps long after the
  // render that scheduled them.
  slugParamRef.current = slugParam;

  const openKey = (a: Audience, slug: string) => `${a}:${slug}`;

  const openInVi = useCallback(
    (file: GithubFile) => {
      // The URL is treated as a paste — typing a long raw.githubusercontent.com
      // URL character-by-character would feel laggy and unrealistic. A single
      // tab-stop snap over the URL substring mirrors the instant insert a
      // pasted clipboard would produce, while the surrounding `curl ... | vi -`
      // types at normal speed.
      const prefix = "curl -fsSL ";
      const suffix = " | vi -";
      const text = `${prefix}${file.rawUrl}${suffix}`;
      enqueue([
        {
          kind: "type-command",
          text,
          wpm: BLOG_WPM,
          tabStops: [{ at: prefix.length, to: prefix.length + file.rawUrl.length }],
        },
        { kind: "effect", run: () => openFile(file) },
      ]);
    },
    [enqueue, openFile],
  );

  const enqueueTagSearch = (tag: string, a: Audience) => {
    const matches = posts.filter((p) => {
      const v = p.versions[a];
      return v !== undefined && v.tags.includes(tag);
    });
    const steps: Step[] = [
      {
        kind: "type-command",
        text: `grep -lE "^tags:.*\\b${tag}\\b" *.md`,
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

  const enqueueOpen = (slug: string, a: Audience) => {
    const key = openKey(a, slug);
    if (openedRef.current.has(key) || notFoundRef.current.has(key)) return;
    const post = posts.find((p) => p.slug === slug);
    const version = post?.versions[a];
    const candidates = filenamesInAudience(posts, a);
    const tabStops = sedTabStops(`${slug}.md`, candidates);
    // Every user-initiated body-render anchors its command to the top of the
    // viewport so the reader starts at the beginning of the post.
    if (!version) {
      notFoundRef.current.add(key);
      enqueue([
        {
          kind: "type-command",
          text: `sed '1,/^---$/d' ${slug}.md`,
          wpm: BLOG_WPM,
          anchor: true,
          tabStops,
        },
        {
          kind: "print",
          text: `sed: ${slug}.md: No such file or directory`,
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
    const steps: Step[] = [
      {
        kind: "type-command",
        text: `sed '1,/^---$/d' ${slug}.md`,
        wpm: BLOG_WPM,
        anchor: true,
        tabStops,
      },
      { kind: "print", text: displayText(version), markdown: true },
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

  // An explicit click on a post filename (ls entry, summary line, or grep
  // result) should always re-run the body render, even if this audience
  // already rendered that post earlier — a reader clicking a filename expects
  // to see the command type out again, not a silent no-op. We clear the
  // "already opened" guard for this slug so enqueueOpen will proceed.
  // The `clear` step wipes prior scrollback (intro, grep output, or a
  // previously-opened post) so the reader lands on a clean screen showing
  // just the sed command and the post body.
  const openPostFromClick = (slug: string) => {
    if (slugParamRef.current !== slug) onNavigateToSlug(slug);
    const key = openKey(audienceRef.current, slug);
    openedRef.current.delete(key);
    enqueue([{ kind: "clear" }]);
    enqueueOpen(slug, audienceRef.current);
  };

  const enqueueListing = (a: Audience, visible: Post[]): void => {
    // `ls -1` (one-per-line) keeps the listing a clean vertical column and
    // avoids the multi-column output real `ls` produces on a tty. The date
    // lives in the filename itself (`YYYY-MM-DD-<slug>.md`) so the listing
    // stays readable on narrow viewports without horizontal scroll.
    const steps: Step[] = [{ kind: "type-command", text: "ls -1", wpm: BLOG_WPM }];
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

  // After `ls -1`, use a PCRE lookbehind so grep prints only the lede text
  // (not the `summary: ` prefix), letting the reader pick a post by its
  // one-line hook rather than by a bare filename. Piping through
  // `xargs -I{} printf '%s\n\n' {}` inserts a blank line after each match
  // so the summaries don't run together. The whole `<slug>.md:<text>` line
  // is clickable — the summary is the hook, so clicking anywhere on it
  // should open the post.
  const enqueueSummaries = (a: Audience, visible: Post[]): void => {
    const steps: Step[] = [
      {
        kind: "type-command",
        text: `grep -oP '(?<=^summary: ).*' *.md | xargs -I{} printf '%s\\n\\n' {}`,
        wpm: BLOG_WPM,
      },
    ];
    let printed = 0;
    for (const p of visible) {
      const v = p.versions[a];
      if (!v) continue;
      steps.push({
        kind: "clickable",
        label: `${p.slug}.md:${v.summary}`,
        color: "accent",
        onClick: () => openPostFromClick(p.slug),
      });
      steps.push({ kind: "blank" });
      printed += 1;
    }
    if (printed === 0) return;
    enqueue(steps);
  };

  const enqueueCd = (a: Audience) => {
    // Tab-completing each folder segment after 3 keystrokes mirrors how a
    // real shell with bash_completion fills in directory names. The snap
    // includes the trailing `/`, matching how bash appends it when a
    // directory completion is unambiguous. The `cd` step after the typed
    // command moves session cwd, so subsequent prompts render the new path.
    const text = `cd blog/posts/${a}`;
    const afterCd = 3;
    enqueue([
      {
        kind: "type-command",
        text,
        wpm: BLOG_WPM,
        tabStops: pathTabStops(text, afterCd),
      },
      { kind: "cd", to: audienceCwd(a) },
    ]);
    cdedRef.current.add(a);
  };

  const runIntro = (a: Audience) => {
    // A URL that targets a specific post is a direct "show me this file"
    // request — the reader didn't ask for a listing, so skip the cd/ls/grep
    // preamble and render the body straight into an otherwise empty session.
    if (slugParamRef.current) {
      enqueueOpen(slugParamRef.current, a);
      return;
    }
    const visible = postsForAudience(posts, a);
    enqueueCd(a);
    enqueueListing(a, visible);
    enqueueSummaries(a, visible);
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
  // scratch in that session — cd/ls/grep summaries when the reader is at `/`,
  // or just the `sed` body when the URL targets a specific post; subsequent
  // visits resume the session exactly where it was left.
  useEffect(() => {
    if (!startedRef.current) return;
    if (audience === audienceRef.current) return;
    audienceRef.current = audience;

    if (!visitedRef.current.has(audience)) {
      visitedRef.current.add(audience);
      runIntro(audience);
      return;
    }

    if (slugParamRef.current) enqueueOpen(slugParamRef.current, audience);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audience]);

  useEffect(() => {
    if (!startedRef.current) {
      prevSlugRef.current = slugParam;
      return;
    }
    const prev = prevSlugRef.current;
    prevSlugRef.current = slugParam;
    if (slugParam) {
      enqueueOpen(slugParam, audienceRef.current);
      return;
    }
    // Back to index (× tab, browser back, or history pop). Clear the post
    // body, then re-render the listing for the current audience. If we've
    // already cd'd into this directory in the session, skip the cd — we're
    // still standing in it, just running `ls` and `grep` again.
    if (prev === undefined) return;
    const a = audienceRef.current;
    const visible = postsForAudience(posts, a);
    enqueue([{ kind: "clear" }]);
    if (!cdedRef.current.has(a)) enqueueCd(a);
    enqueueListing(a, visible);
    enqueueSummaries(a, visible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugParam]);

  return { lines, idle, anchor, cwd, prompt, openInVi };
}
