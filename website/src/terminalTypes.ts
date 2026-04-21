export type LineColor = "default" | "dim" | "accent" | "meta" | "error";

export type LineData =
  | { kind: "command"; text: string; prompt?: string; active?: boolean }
  | { kind: "output"; text: string; color?: LineColor; active?: boolean; markdown?: boolean }
  | { kind: "blank" }
  | {
      kind: "clickable";
      label: string;
      onClick: () => void;
      color?: LineColor;
      prefix?: string;
    }
  | { kind: "action"; label: string; onClick: () => void };

export type Step =
  | { kind: "type-command"; text: string; prompt?: string; fast?: boolean; wpm?: number }
  | { kind: "print"; text: string; color?: LineColor; markdown?: boolean }
  | {
      kind: "type";
      text: string;
      color?: LineColor;
      markdown?: boolean;
      fast?: boolean;
      wpm?: number;
    }
  | { kind: "blank" }
  | { kind: "clear" }
  | {
      kind: "clickable";
      label: string;
      onClick: () => void;
      color?: LineColor;
      prefix?: string;
    }
  | { kind: "action"; label: string; onClick: () => void };
