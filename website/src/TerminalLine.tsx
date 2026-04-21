import type { LineColor, LineData } from "./terminalTypes.ts";
import { highlightCommand } from "./CommandHighlighter.tsx";
import { MarkdownBody } from "./MarkdownBody.tsx";

function outputColor(color?: LineColor): string {
  switch (color) {
    case "accent":
      return "text-accent";
    case "meta":
      return "text-meta";
    case "dim":
      return "text-dim";
    case "error":
      return "text-red";
    default:
      return "text-fg";
  }
}

export function TerminalLine({ line }: { line: LineData }) {
  switch (line.kind) {
    case "command":
      return (
        <div className="flex gap-2 whitespace-pre-wrap break-words">
          <span className="shrink-0 text-accent">$</span>
          <span className="flex-1 text-fg-bright">
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
      return (
        <div>
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
  }
}
