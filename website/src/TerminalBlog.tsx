import { useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { Audience, Post, PostVersion } from "./types.ts";
import type { Step, TabStop } from "./terminalTypes.ts";
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

const HOME_PROMPT = "~ $";

function codePrompt(audience: Audience): string {
  return `~/code/blog/${audience} $`;
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

  // On a post page, the tab × returns to the index instead of swapping
  // audience — the reader is closing this post, not asking for the same
  // post in the other voice.
  const closeTabToIndex = useCallback(() => {
    navigate({ pathname: "/", search: location.search });
  }, [navigate, location.search]);
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
  const prevSlugRef = useRef<string | undefined>(slugParam);

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
          prompt,
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
        prompt,
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
    if (slugParam !== slug) navigate(`/posts/${slug}`);
    const key = openKey(audienceRef.current, slug);
    openedRef.current.delete(key);
    enqueue([{ kind: "clear" }]);
    enqueueOpen(slug, audienceRef.current);
  };

  // Clicking a #tag under a post runs a `grep` that filters *.md files by a
  // `tags:` frontmatter line containing the tag as a whole word, and then
  // surfaces each matching filename as a clickable `sed` target — same shape
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

  // After `ls -1`, use a PCRE lookbehind so grep prints only the lede text
  // (not the `summary: ` prefix), letting the reader pick a post by its
  // one-line hook rather than by a bare filename. The whole
  // `<slug>.md:<text>` line is clickable — the summary is the hook, so
  // clicking anywhere on it should open the post.
  const enqueueSummaries = (a: Audience, visible: Post[]): void => {
    const prompt = codePrompt(a);
    const steps: Step[] = [
      {
        kind: "type-command",
        text: `grep -oP '(?<=^summary: ).*' *.md`,
        prompt,
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
      printed += 1;
    }
    if (printed === 0) return;
    steps.push({ kind: "blank" });
    enqueue(steps);
  };

  const enqueueCd = (a: Audience) => {
    // Tab-completing each folder segment after 3 keystrokes mirrors how a
    // real shell with bash_completion fills in directory names. The snap
    // includes the trailing `/`, matching how bash appends it when a
    // directory completion is unambiguous.
    const text = `cd code/blog/${a}`;
    const afterCd = 3;
    enqueue([
      {
        kind: "type-command",
        text,
        prompt: HOME_PROMPT,
        wpm: BLOG_WPM,
        tabStops: pathTabStops(text, afterCd),
      },
    ]);
    cdedRef.current.add(a);
  };

  const runIntro = (a: Audience) => {
    // A URL that targets a specific post is a direct "show me this file"
    // request — the reader didn't ask for a listing, so skip the cd/ls/grep
    // preamble and render the body straight into an otherwise empty session.
    if (slugParam) {
      enqueueOpen(slugParam, a);
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

    if (slugParam) enqueueOpen(slugParam, audience);
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

  return (
    <ViOpenerContext.Provider value={openInVi}>
      <Terminal
        lines={lines}
        idle={idle}
        anchor={anchor}
        idlePrompt={codePrompt(audience)}
        tabs={
          <AudienceTabs
            audience={audience}
            onSwitch={setAudience}
            onClose={slugParam ? closeTabToIndex : undefined}
          />
        }
        onClose={closeTerminal}
        onMinimize={closeTerminal}
      />
    </ViOpenerContext.Provider>
  );
}
