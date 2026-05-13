import type { TerminalMention } from "./types.ts";

export type MentionsPanelVariant = "terminal" | "prose";

// Lifts the post's external references out of the prose into a panel above
// the body. A `highlight` mention (at most one per audience version) renders
// as a prominent card with a colored accent; remaining `mention` items
// render as a condensed list underneath. The component is rendered both
// inside the terminal scrollback (as part of the post body output) and in
// the prose fallback page — the `variant` only adjusts surrounding spacing
// so each view fits its chrome.
export function MentionsPanel({
  mentions,
  variant = "prose",
}: {
  mentions: TerminalMention[];
  variant?: MentionsPanelVariant;
}) {
  if (mentions.length === 0) return null;
  const highlight = mentions.find((m) => m.type === "highlight");
  const rest = mentions.filter((m) => m !== highlight);

  const wrapperClass =
    variant === "terminal" ? "my-[1lh] flex flex-col gap-3" : "mb-8 flex flex-col gap-3";

  return (
    <aside className={wrapperClass} aria-label="External references" data-mentions-panel={variant}>
      {highlight && <HighlightCard mention={highlight} />}
      {rest.length > 0 && <MentionList mentions={rest} />}
    </aside>
  );
}

function HighlightCard({ mention }: { mention: TerminalMention }) {
  return (
    <a
      href={mention.link}
      target="_blank"
      rel="noreferrer"
      className="group flex flex-col gap-1 rounded border border-link bg-term-titlebar/60 px-4 py-3 no-underline transition-colors hover:border-fg-bright hover:bg-term-titlebar"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[10px] font-bold tracking-[0.18em] text-link uppercase">
          Featured
        </span>
        <span aria-hidden="true" className="text-dim transition-colors group-hover:text-fg-bright">
          ↗
        </span>
      </div>
      <div className="text-base font-bold text-fg-bright group-hover:underline">
        {mention.title}
      </div>
      <div className="text-sm text-fg">{mention.description}</div>
    </a>
  );
}

function MentionList({ mentions }: { mentions: TerminalMention[] }) {
  return (
    <div className="flex flex-col gap-2 rounded border border-term-border bg-term-titlebar/30 px-4 py-3">
      <div className="text-[10px] font-bold tracking-[0.18em] text-dim uppercase">
        Also mentioned
      </div>
      <ul className="flex flex-col gap-1.5">
        {mentions.map((m) => (
          <li key={m.link} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
            <a
              href={m.link}
              target="_blank"
              rel="noreferrer"
              className="font-bold text-link underline decoration-dotted hover:text-fg-bright"
            >
              {m.title}
            </a>
            <span className="text-sm text-dim sm:before:mr-2 sm:before:text-dim sm:before:content-['—']">
              {m.description}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
