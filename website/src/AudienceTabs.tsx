import { useEffect, useState } from "react";
import { AUDIENCES, type Audience } from "./types.ts";

function detectMac(): boolean {
  if (typeof navigator === "undefined") return false;
  const source = navigator.platform || navigator.userAgent || "";
  return /Mac|iPhone|iPad|iPod/i.test(source);
}

function shortcutLabel(isMac: boolean, index: number): string {
  return `${isMac ? "⌘" : "⌃"}${index + 1}`;
}

export function AudienceTabs({
  audience,
  onSwitch,
}: {
  audience: Audience;
  onSwitch: (next: Audience) => void;
}) {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => setIsMac(detectMac()), []);

  // Cmd/Ctrl+1 / +2 switch audience, iTerm2-style. Most browsers reserve
  // these for their own tab switching and will eat the event before it
  // reaches us — the shortcut hint in the tab is still accurate on a
  // standalone host or an OS that passes the chord through.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod || e.altKey || e.shiftKey) return;
      const idx = Number.parseInt(e.key, 10);
      if (!Number.isFinite(idx) || idx < 1 || idx > AUDIENCES.length) return;
      const target = AUDIENCES[idx - 1];
      if (!target) return;
      e.preventDefault();
      onSwitch(target);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMac, onSwitch]);

  // "Closing" a tab in a fixed two-audience model means focusing the other
  // view — matches iTerm2's semantics (close-current → next tab takes focus).
  const handleClose = (target: Audience) => {
    const other = AUDIENCES.find((a) => a !== target);
    if (other) onSwitch(other);
  };

  return (
    <div
      role="tablist"
      aria-label="Audience"
      data-no-drag
      className="flex bg-term-titlebar font-ui text-[13px]"
    >
      {AUDIENCES.map((a, i) => {
        const active = a === audience;
        return (
          <div
            key={a}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onSwitch(a)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSwitch(a);
              }
            }}
            className={[
              "group flex cursor-pointer select-none items-center gap-2 border-b py-1.5 pr-3 pl-2 tracking-wide focus:outline-none",
              i > 0 ? "border-l border-l-term-border" : "",
              active
                ? "border-b-term-bg bg-term-bg text-fg-bright"
                : "border-b-term-border bg-term-titlebar text-dim hover:text-fg-bright",
            ].join(" ")}
          >
            <button
              type="button"
              aria-label={`Close ${a} tab`}
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                handleClose(a);
              }}
              className="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-[12px] leading-none text-dim opacity-50 hover:bg-term-border hover:text-fg-bright hover:opacity-100 group-hover:opacity-80"
            >
              {"×"}
            </button>
            <span className="flex-1 text-center">{a}</span>
            <span
              aria-hidden="true"
              className={`shrink-0 pl-1 text-[11px] tracking-tight tabular-nums ${active ? "opacity-60" : "opacity-40"}`}
            >
              {shortcutLabel(isMac, i)}
            </span>
          </div>
        );
      })}
      <div className="flex-1 border-b border-term-border" aria-hidden="true" />
    </div>
  );
}
