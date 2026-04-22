import { useEffect, useMemo, useRef, useState } from "react";
import { Highlight, themes, type Language } from "prism-react-renderer";
import type { GithubFile } from "./github.ts";
import { guessLanguage, parseLineRange } from "./github.ts";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; content: string };

export function FileViewer({ file, onClose }: { file: GithubFile; onClose: () => void }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const range = useMemo(() => parseLineRange(file.fragment), [file.fragment]);
  const firstRangeRef = useRef<HTMLDivElement | null>(null);
  // Wrap defaults on narrow screens (keeps horizontal scroll off); double-tap
  // the content to toggle — unwrapping re-enables horizontal scroll.
  const [wrap, setWrap] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches,
  );

  useEffect(() => {
    let canceled = false;
    setState({ status: "loading" });
    fetch(file.rawUrl)
      .then(async (res) => {
        if (canceled) return;
        if (!res.ok) {
          setState({ status: "error", message: `HTTP ${res.status} fetching ${file.rawUrl}` });
          return;
        }
        const text = await res.text();
        if (canceled) return;
        setState({ status: "loaded", content: text });
      })
      .catch((e) => {
        if (canceled) return;
        setState({ status: "error", message: String(e?.message ?? e) });
      });
    return () => {
      canceled = true;
    };
  }, [file.rawUrl]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "q") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Push a history entry so the browser Back button closes the viewer.
  // If popstate closed us, skip the cleanup history.back() to avoid
  // navigating past the original page.
  useEffect(() => {
    window.history.pushState({ fileViewerOpen: true }, "");
    let closedViaPop = false;
    const onPop = () => {
      closedViaPop = true;
      onClose();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (!closedViaPop) window.history.back();
    };
  }, [onClose]);

  useEffect(() => {
    if (state.status !== "loaded" || !range) return;
    firstRangeRef.current?.scrollIntoView({ block: "center" });
  }, [state.status, range]);

  const lang = guessLanguage(file.path);
  const displayTitle = `${file.owner}/${file.repo}:${file.path} @ ${file.ref}`;

  const lineCount = state.status === "loaded" ? state.content.split("\n").length : 0;
  const charCount = state.status === "loaded" ? state.content.length : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-term-bg text-fg"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-term-border bg-term-titlebar px-3 py-1.5 text-xs text-dim">
        <span className="truncate">
          <span className="text-accent">vi</span>{" "}
          <a
            href={file.href}
            target="_blank"
            rel="noreferrer"
            className="text-link underline decoration-dotted hover:text-accent"
          >
            {displayTitle}
          </a>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 cursor-pointer bg-transparent p-0 text-meta hover:text-accent"
        >
          [ :q ]
        </button>
      </div>

      <div
        className={`flex-1 touch-manipulation ${wrap ? "overflow-y-auto overflow-x-hidden" : "overflow-auto"}`}
        onDoubleClick={() => setWrap((w) => !w)}
      >
        {state.status === "loading" && <div className="p-4 text-dim">-- loading --</div>}
        {state.status === "error" && (
          <div className="p-4 text-red">-- error: {state.message} --</div>
        )}
        {state.status === "loaded" && (
          <Highlight
            code={state.content.replace(/\n$/, "")}
            language={lang as Language}
            theme={themes.vsDark}
          >
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
              <pre
                className={`${className} m-0 px-3 py-2 text-[13px] leading-[1.5]`}
                style={{ ...style, background: "transparent" }}
              >
                {tokens.map((line, i) => {
                  const { key: _lk, ...rest } = getLineProps({ line });
                  const lineNumber = i + 1;
                  const inRange =
                    range !== null && lineNumber >= range.start && lineNumber <= range.end;
                  const isFirstInRange = range !== null && lineNumber === range.start;
                  const rowClass = `flex${inRange ? " bg-accent/15" : ""}`;
                  return (
                    <div
                      key={i}
                      {...rest}
                      ref={isFirstInRange ? firstRangeRef : undefined}
                      className={rowClass}
                    >
                      <span
                        className={`mr-2 w-8 shrink-0 select-none text-right ${inRange ? "text-accent" : "text-dim"}`}
                      >
                        {lineNumber}
                      </span>
                      <span
                        className={`flex-1 ${wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"}`}
                      >
                        {line.map((token, ti) => {
                          const { key: _tk, ...trest } = getTokenProps({ token });
                          return <span key={ti} {...trest} />;
                        })}
                      </span>
                    </div>
                  );
                })}
                {/* vim-style tildes for empty space below EOF */}
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={`tilde-${i}`} className="flex text-dim">
                    <span className="mr-2 w-8 shrink-0 text-right">~</span>
                    <span />
                  </div>
                ))}
              </pre>
            )}
          </Highlight>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-term-border bg-term-titlebar px-3 py-1 text-xs text-dim">
        <span>
          {state.status === "loaded"
            ? `"${file.path}" ${lineCount} lines, ${charCount} chars${range ? ` [L${range.start}${range.end !== range.start ? `-L${range.end}` : ""}]` : ""}`
            : state.status === "error"
              ? "-- error --"
              : "-- loading --"}
        </span>
        <span className="text-dim">
          -- VIEW -- &nbsp; ESC / q &middot; dbl-tap: {wrap ? "unwrap" : "wrap"}
        </span>
      </div>
    </div>
  );
}
