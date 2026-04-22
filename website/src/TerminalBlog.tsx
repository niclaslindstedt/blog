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

function emptyAudienceMap<T>(): Record<Audience, Map<string, T>> {
  return { technical: new Map(), "non-technical": new Map() };
}

export function TerminalBlog({ posts }: { posts: Post[] }) {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { audience, setAudience } = useAudience();
  const { setTerminalClosed } = usePreferences();
  const { lines, enqueue, idle, anchor, scrollToLine } = useTerminalAnimation(audience);
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
  // Per-audience map from slug → committed line index of that post's sed
  // command. Populated on the fly by `onStart` callbacks as the for-loop
  // types its way through each post. Scrolling just looks up the index and
  // hands it to the animator.
  const postIndexRef = useRef<Record<Audience, Map<string, number>>>(emptyAudienceMap());
  // If a click or navigation targets a post whose sed command hasn't typed
  // out yet (e.g. the reader clicked an `ls` entry mid-intro), remember the
  // slug here and let the matching `onStart` fire the scroll once the index
  // becomes known.
  const pendingScrollRef = useRef<Record<Audience, string | null>>({
    technical: null,
    "non-technical": null,
  });
  // Slugs we've already surfaced a "no such file" error for, keyed by
  // audience. Prevents duplicate error blocks if the user flicks between a
  // missing slug and the listing.
  const notFoundShownRef = useRef<Record<Audience, Set<string>>>({
    technical: new Set(),
    "non-technical": new Set(),
  });
  const visitedRef = useRef(new Set<Audience>());
  const audienceRef = useRef<Audience>(audience);

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

  const tryScrollToPost = (slug: string, a: Audience): boolean => {
    const idx = postIndexRef.current[a].get(slug);
    if (idx === undefined) {
      pendingScrollRef.current[a] = slug;
      return false;
    }
    pendingScrollRef.current[a] = null;
    scrollToLine(idx);
    return true;
  };

  const enqueueNotFound = (slug: string, a: Audience): void => {
    if (notFoundShownRef.current[a].has(slug)) return;
    notFoundShownRef.current[a].add(slug);
    const prompt = codePrompt(a);
    const steps: Step[] = [
      {
        kind: "type-command",
        text: `sed '1,/^---$/d' ${slug}.md`,
        prompt,
        wpm: BLOG_WPM,
        anchor: true,
      },
      {
        kind: "print",
        text: `sed: ${slug}.md: No such file or directory`,
        color: "error",
      },
      { kind: "blank" },
    ];
    const other: Audience = a === "technical" ? "non-technical" : "technical";
    const otherPost = posts.find((p) => p.slug === slug);
    if (otherPost?.versions[other]) {
      steps.push({
        kind: "action",
        label: `[ switch to ${other} version ]`,
        onClick: () => setAudience(other),
      });
      steps.push({ kind: "blank" });
    }
    enqueue(steps);
  };

  // User-initiated jump to a post. Always updates the URL so the address bar
  // stays in sync with the on-screen post; always tries to scroll. If the
  // post's sed command hasn't typed out yet (intro still animating), we mark
  // it pending and the matching `onStart` will finish the scroll.
  const jumpToPost = (slug: string) => {
    const a = audienceRef.current;
    if (slugParam !== slug) navigate(`/posts/${slug}`);
    tryScrollToPost(slug, a);
  };

  // Clicking a #tag under a post runs a grep pipeline that first finds files
  // tagged with the word, then pulls their `summary:` lines. Each result is a
  // clickable summary that scrolls back up to the matching post — the summary
  // acts as a search preview, not a secondary render.
  const enqueueTagSearch = (tag: string, a: Audience) => {
    const prompt = codePrompt(a);
    const matches = posts.filter((p) => {
      const v = p.versions[a];
      return v !== undefined && v.tags.includes(tag);
    });
    const steps: Step[] = [
      {
        kind: "type-command",
        text: `grep -lE "^tags:.*\\b${tag}\\b" *.md | xargs grep "^summary:"`,
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
      const v = p.versions[a];
      if (!v) continue;
      steps.push({
        kind: "clickable",
        label: `${p.slug}.md:summary: ${v.summary}`,
        color: "accent",
        onClick: () => jumpToPost(p.slug),
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
    // stays readable on narrow viewports without horizontal scroll. Clicking
    // a filename scrolls the viewport down to that post's sed command — the
    // post itself is already rendered further below by the intro for-loop.
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
        onClick: () => jumpToPost(p.slug),
      });
    }
    steps.push({ kind: "blank" });
    enqueue(steps);
  };

  // After the listing, stream every post's body into the scrollback in
  // descending-date order (the extractor already sorts `posts` that way). Each
  // post gets its own `sed` command so the reader can still see which file
  // the prose came from, and so the ls-entry click target has a real line to
  // anchor to. The sed command types fast to keep the intro snappy even with
  // a dozen posts queued.
  const enqueueAllPosts = (a: Audience, visible: Post[]): void => {
    const prompt = codePrompt(a);
    const steps: Step[] = [];
    for (const p of visible) {
      const v = p.versions[a];
      if (!v) continue;
      const slug = p.slug;
      steps.push({
        kind: "type-command",
        text: `sed '1,/^---$/d' ${slug}.md`,
        prompt,
        fast: true,
        onStart: (index) => {
          postIndexRef.current[a].set(slug, index);
          if (pendingScrollRef.current[a] === slug && audienceRef.current === a) {
            pendingScrollRef.current[a] = null;
            scrollToLine(index);
          }
        },
      });
      steps.push({ kind: "print", text: displayText(v), markdown: true });
      steps.push({ kind: "blank" });
      if (v.tags.length > 0) {
        steps.push({
          kind: "tag-row",
          tags: v.tags,
          onClick: (tag) => enqueueTagSearch(tag, a),
        });
        steps.push({ kind: "blank" });
      }
    }
    if (steps.length > 0) enqueue(steps);
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
    enqueueAllPosts(a, visible);

    if (slugParam) {
      const hasVersion = visible.some((p) => p.slug === slugParam);
      if (hasVersion) {
        pendingScrollRef.current[a] = slugParam;
      } else {
        enqueueNotFound(slugParam, a);
      }
    }
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
  // scratch (cd, ls, all posts) in that session; subsequent visits resume the
  // session where it was left and scroll back to the current slug, if any.
  useEffect(() => {
    if (!startedRef.current) return;
    if (audience === audienceRef.current) return;
    audienceRef.current = audience;

    if (!visitedRef.current.has(audience)) {
      visitedRef.current.add(audience);
      runIntro(audience);
      return;
    }

    if (slugParam) {
      const hasVersion = posts.some(
        (p) => p.slug === slugParam && p.versions[audience] !== undefined,
      );
      if (hasVersion) tryScrollToPost(slugParam, audience);
      else enqueueNotFound(slugParam, audience);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audience]);

  useEffect(() => {
    if (!startedRef.current) return;
    if (!slugParam) return;
    const a = audienceRef.current;
    const hasVersion = posts.some((p) => p.slug === slugParam && p.versions[a] !== undefined);
    if (hasVersion) tryScrollToPost(slugParam, a);
    else enqueueNotFound(slugParam, a);
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
