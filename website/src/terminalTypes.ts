export type LineColor = "default" | "dim" | "accent" | "meta" | "error";

export type LineData =
  | { kind: "command"; text: string; active?: boolean }
  | { kind: "output"; text: string; color?: LineColor; active?: boolean; markdown?: boolean }
  | { kind: "blank" }
  | { kind: "clickable"; label: string; onClick: () => void; color?: LineColor }
  | { kind: "action"; label: string; onClick: () => void };

export type Step =
  | { kind: "type-command"; text: string }
  | { kind: "print"; text: string; color?: LineColor; markdown?: boolean }
  | { kind: "type"; text: string; color?: LineColor; markdown?: boolean }
  | { kind: "blank" }
  | { kind: "clickable"; label: string; onClick: () => void; color?: LineColor }
  | { kind: "action"; label: string; onClick: () => void };
