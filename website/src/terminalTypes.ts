export type LineColor = "default" | "dim" | "accent" | "meta";

export type LineData =
  | { kind: "command"; text: string; active?: boolean }
  | { kind: "output"; text: string; color?: LineColor; active?: boolean }
  | { kind: "blank" }
  | { kind: "clickable"; label: string; onClick: () => void; color?: LineColor }
  | { kind: "action"; label: string; onClick: () => void };

export type Step =
  | { kind: "type-command"; text: string }
  | { kind: "print"; text: string; color?: LineColor }
  | { kind: "type"; text: string; color?: LineColor }
  | { kind: "blank" }
  | { kind: "clickable"; label: string; onClick: () => void; color?: LineColor }
  | { kind: "action"; label: string; onClick: () => void };
