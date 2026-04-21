import { useEffect, useState, type ReactNode } from "react";

// Generic iTerm2-style tab row. Intentionally knows nothing about the blog —
// only this file's Tailwind classes (term-bg, term-titlebar, term-border,
// font-ui, text-fg-bright, text-dim) tie it to the host theme, and those are
// straightforward to swap for CSS custom properties if this component is
// ever lifted into a standalone package.

export interface TabItem<T extends string = string> {
  id: T;
  label: ReactNode;
}

export interface TabsProps<T extends string = string> {
  tabs: readonly TabItem<T>[];
  active: T;
  onSelect: (id: T) => void;
  /** Render a close × on each tab. Omit to hide the × entirely. */
  onClose?: (id: T) => void;
  ariaLabel?: string;
  /** Render ⌘N / ⌃N hints and bind a window-level keydown listener. */
  enableShortcuts?: boolean;
}

function detectMac(): boolean {
  if (typeof navigator === "undefined") return false;
  const source = navigator.platform || navigator.userAgent || "";
  return /Mac|iPhone|iPad|iPod/i.test(source);
}

function shortcutLabel(isMac: boolean, index: number): string {
  return `${isMac ? "⌘" : "⌃"}${index + 1}`;
}

export function Tabs<T extends string = string>({
  tabs,
  active,
  onSelect,
  onClose,
  ariaLabel,
  enableShortcuts = true,
}: TabsProps<T>) {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => setIsMac(detectMac()), []);

  // Cmd/Ctrl+N switches tabs iTerm2-style. Most browsers reserve these
  // chords for their own tab switching and will eat the event before it
  // reaches us — the hint glyph is still accurate on hosts that pass it
  // through (PWA, Electron, some Firefox configs).
  useEffect(() => {
    if (!enableShortcuts) return;
    const onKey = (e: KeyboardEvent) => {
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod || e.altKey || e.shiftKey) return;
      const idx = Number.parseInt(e.key, 10);
      if (!Number.isFinite(idx) || idx < 1 || idx > tabs.length) return;
      const target = tabs[idx - 1];
      if (!target) return;
      e.preventDefault();
      onSelect(target.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enableShortcuts, isMac, onSelect, tabs]);

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex bg-term-titlebar font-ui text-[13px]"
    >
      {tabs.map((t, i) => {
        const isActive = t.id === active;
        return (
          <div
            key={t.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onSelect(t.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(t.id);
              }
            }}
            className={[
              "group flex cursor-pointer select-none items-center gap-2 border-b py-1.5 pr-3 pl-2 tracking-wide focus:outline-none",
              i > 0 ? "border-l border-l-term-border" : "",
              isActive
                ? "border-b-term-bg bg-term-bg text-fg-bright"
                : "border-b-term-border bg-term-titlebar text-dim hover:text-fg-bright",
            ].join(" ")}
          >
            {onClose && (
              <button
                type="button"
                aria-label="Close tab"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(t.id);
                }}
                className="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-[12px] leading-none text-dim opacity-50 hover:bg-term-border hover:text-fg-bright hover:opacity-100 group-hover:opacity-80"
              >
                {"×"}
              </button>
            )}
            <span className="flex-1 text-center">{t.label}</span>
            {enableShortcuts && (
              <span
                aria-hidden="true"
                className={`shrink-0 pl-1 text-[11px] tracking-tight tabular-nums ${isActive ? "opacity-60" : "opacity-40"}`}
              >
                {shortcutLabel(isMac, i)}
              </span>
            )}
          </div>
        );
      })}
      <div className="flex-1 border-b border-term-border" aria-hidden="true" />
    </div>
  );
}
