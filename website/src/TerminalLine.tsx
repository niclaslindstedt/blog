import type { LineColor, LineData } from "./terminalTypes.ts";
import { highlightCommand } from "./CommandHighlighter.tsx";
import { MarkdownBody } from "./MarkdownBody.tsx";

function outputColor(_color?: LineColor): string {
  // Plain-terminal look: every output line renders in the single fg color.
  return "text-fg";
}

export function TerminalLine({ line }: { line: LineData }) {
  switch (line.kind) {
    case "command":
      // Inline layout (not flex) so that when the prompt + command don't fit
      // on one line, the wrap happens at the space between them and the
      // command uses the full viewport width on line 2 — matching how a real
      // terminal wraps a long command. `break-words` is kept as a fallback
      // for single tokens longer than the viewport (e.g. a URL argument).
      return (
        <div className="whitespace-pre-wrap break-words">
          <span className="text-accent">{line.prompt ?? "$"}</span>{" "}
          <span className="text-fg-bright">
            {highlightCommand(line.text)}
            {line.active && <span className="animate-blink-cursor" aria-hidden="true" />}
          </span>
        </div>
      );
    case "output":
      if (line.markdown) {
        return (
          <div
            className={`font-[inherit] text-[inherit] leading-[inherit] ${outputColor(line.color)}`}
          >
            <MarkdownBody text={line.text} />
            {line.active && <span className="animate-blink-cursor" aria-hidden="true" />}
          </div>
        );
      }
      return (
        <pre
          className={`m-0 whitespace-pre-wrap break-words font-[inherit] text-[inherit] leading-[inherit] ${outputColor(line.color)}`}
        >
          {line.text}
          {line.active && <span className="animate-blink-cursor" aria-hidden="true" />}
        </pre>
      );
    case "blank":
      return <div className="h-[1em]">&nbsp;</div>;
    case "clickable":
      // `whitespace-pre-wrap` keeps the aligned spaces inside an `ls -l`
      // prefix while still allowing the row to wrap on narrow viewports so it
      // never forces horizontal scroll. `break-words` only kicks in if a
      // single filename is longer than the available width.
      return (
        <div className="whitespace-pre-wrap break-words">
          {line.prefix && <span className="text-dim">{line.prefix}</span>}
          <button
            type="button"
            onClick={line.onClick}
            className={`cursor-pointer bg-transparent p-0 text-left font-[inherit] hover:underline focus-visible:underline focus-visible:outline-none ${outputColor(line.color ?? "accent")}`}
          >
            {line.label}
          </button>
        </div>
      );
    case "action":
      return (
        <div className="my-1">
          <button
            type="button"
            onClick={line.onClick}
            className="cursor-pointer bg-transparent p-0 text-left font-[inherit] text-link hover:text-fg-bright focus-visible:text-fg-bright focus-visible:outline-none"
          >
            {line.label}
          </button>
        </div>
      );
    case "tag-row":
      // Inline row of `#tag` buttons, wraps on narrow viewports. Each tag is a
      // real word-boundary token so a click can safely feed it to `grep`.
      return (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {line.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => line.onClick(tag)}
              className="cursor-pointer bg-transparent p-0 text-left font-[inherit] text-fg hover:underline focus-visible:underline focus-visible:outline-none"
            >
              #{tag}
            </button>
          ))}
        </div>
      );
  }
}
