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
  | { kind: "action"; label: string; onClick: () => void }
  | { kind: "tag-row"; tags: string[]; onClick: (tag: string) => void };

export type Step =
  | {
      kind: "type-command";
      text: string;
      prompt?: string;
      fast?: boolean;
      wpm?: number;
      // When true, once this command begins rendering, the terminal scrolls so
      // the command sits at the top of the viewport and stays pinned there
      // while its output types below. Used for tag-click grep, cat-a-post, and
      // other user-initiated commands whose response the reader wants to watch
      // unfold from the command downward rather than be dragged to the bottom.
      anchor?: boolean;
      // Character index at which the typer "tabs": once `shown.length` reaches
      // `tabAt` the rest of `text` is filled in instantaneously, mimicking a
      // shell tab-completion on a uniquely-identifying filename prefix.
      tabAt?: number;
    }
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
  | { kind: "action"; label: string; onClick: () => void }
  | { kind: "tag-row"; tags: string[]; onClick: (tag: string) => void }
  | { kind: "effect"; run: () => void }
  | { kind: "delay"; ms: number };
