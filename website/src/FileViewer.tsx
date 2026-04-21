import { useEffect, useState } from "react";
import { Highlight, themes, type Language } from "prism-react-renderer";
import type { GithubFile } from "./github.ts";
import { guessLanguage } from "./github.ts";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; content: string };

export function FileViewer({ file, onClose }: { file: GithubFile; onClose: () => void }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

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

      <div className="flex-1 overflow-auto">
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
                  return (
                    <div key={i} {...rest} className="flex">
                      <span className="mr-4 w-10 shrink-0 select-none text-right text-dim">
                        {i + 1}
                      </span>
                      <span className="flex-1 whitespace-pre">
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
                    <span className="mr-4 w-10 shrink-0 text-right">~</span>
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
            ? `"${file.path}" ${lineCount} lines, ${charCount} chars`
            : state.status === "error"
              ? "-- error --"
              : "-- loading --"}
        </span>
        <span className="text-dim">-- VIEW -- &nbsp; ESC / q to close</span>
      </div>
    </div>
  );
}
