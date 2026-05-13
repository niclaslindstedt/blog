import { useId, useState } from "react";

import type { TerminalMention } from "./types.ts";

export type MentionsPanelVariant = "terminal" | "prose";

// Lifts the post's external references out of the prose into a panel above
// the body. The collapsed state — the default — shows each project as a
// small link chip (featured items get a yellow star) so the references read
// as a single compact strip rather than two stacked cards. A wide chevron
// button sitting on the panel's bottom edge toggles a details section
// containing the full title + description for every reference. Rendered in
// the terminal scrollback and in the prose fallback; the `variant` only
// adjusts surrounding spacing.
export function MentionsPanel({
  mentions,
  variant = "prose",
}: {
  mentions: TerminalMention[];
  variant?: MentionsPanelVariant;
}) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();

  if (mentions.length === 0) return null;

  const wrapperClass = variant === "terminal" ? "my-[1lh] flex flex-col" : "mb-8 flex flex-col";

  return (
    <aside className={wrapperClass} aria-label="External references" data-mentions-panel={variant}>
      <div className="overflow-hidden rounded border border-term-border bg-term-titlebar/40">
        <div className="border-b border-term-border bg-term-titlebar px-3 py-1 text-xs text-dim">
          mentions
        </div>
        <div className="flex flex-wrap justify-center gap-2 px-3 py-2.5">
          {mentions.map((m) => (
            <MentionChip key={m.link} mention={m} />
          ))}
        </div>
        {expanded && (
          <div
            id={detailsId}
            className="flex flex-col gap-2 border-t border-term-border px-3 py-2.5"
          >
            {mentions.map((m) => (
              <div key={m.link} className="flex flex-col gap-0.5">
                <div className="flex items-baseline gap-1.5">
                  {m.type === "highlight" && (
                    <span aria-hidden="true" className="text-yellow">
                      ★
                    </span>
                  )}
                  <span className="font-bold text-fg-bright">{m.title}</span>
                </div>
                <div className="text-sm text-dim">{m.description}</div>
              </div>
            ))}
          </div>
        )}
        {/* Tap target ≥44px (WCAG 2.5.5) while the visible chrome stays a thin
            strip: the outer button sets the 44px hit area and the inner span
            carries the divider, padding, and hover state. A negative top
            margin reclaims the chip strip's bottom padding so the extra hit
            area lives in already-empty space and the card doesn't grow. */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={expanded ? detailsId : undefined}
          aria-label={expanded ? "Hide reference details" : "Show reference details"}
          className="group -mt-2.5 flex min-h-11 w-full cursor-pointer items-end bg-transparent focus-visible:outline-none"
        >
          <span className="flex w-full items-center justify-center border-t border-term-border py-1 text-dim transition-colors group-hover:bg-term-titlebar group-hover:text-fg-bright group-focus-visible:bg-term-titlebar group-focus-visible:text-fg-bright">
            <span aria-hidden="true" className="text-xs leading-none">
              {expanded ? "▲" : "▼"}
            </span>
          </span>
        </button>
      </div>
    </aside>
  );
}

function MentionChip({ mention }: { mention: TerminalMention }) {
  const isFeatured = mention.type === "highlight";
  return (
    <a
      href={mention.link}
      target="_blank"
      rel="noreferrer"
      className={
        "group inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-sm font-bold no-underline transition-colors " +
        (isFeatured
          ? "border-link text-link hover:border-fg-bright hover:text-fg-bright"
          : "border-term-border text-link hover:border-fg-bright hover:text-fg-bright")
      }
    >
      {isFeatured && (
        <span aria-hidden="true" className="text-yellow">
          ★
        </span>
      )}
      <span>{mention.title}</span>
      <span aria-hidden="true" className="text-dim transition-colors group-hover:text-fg-bright">
        ↗
      </span>
    </a>
  );
}
