export type LineColor = "default" | "dim" | "accent" | "meta" | "error";

export interface TabStop {
  at: number;
  to: number;
}

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
      fast?: boolean;
      wpm?: number;
      // When true, once this command begins rendering, the terminal scrolls so
      // the command sits at the top of the viewport and stays pinned there
      // while its output types below. Used for tag-click grep, cat-a-post, and
      // other user-initiated commands whose response the reader wants to watch
      // unfold from the command downward rather than be dragged to the bottom.
      anchor?: boolean;
      // Ordered list of tab-completion points. When `shown.length` reaches
      // `at`, the typer snaps `shown` forward to `to` instantaneously,
      // mimicking a shell tab-complete on a uniquely-identifying prefix. A
      // single command can carry multiple stops (e.g. one per folder segment
      // in a cd path) — each stop is consumed in order.
      tabStops?: TabStop[];
    }
  | { kind: "print"; text: string; color?: LineColor; markdown?: boolean }
  // Commits a command line instantly, without the typing animation. Used when
  // a previously-typed command is being re-rendered on session re-entry (e.g.
  // back-to-index after viewing a post) so the reader isn't forced to watch
  // the same command animate twice.
  | { kind: "print-command"; text: string }
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
  // Updates the session cwd instantly, with no animation. Pair it with a
  // `type-command "cd …"` to give the reader both the visible command and
  // the state change (the next prompt rendered will reflect the new cwd).
  // `to` is the full resolved path — the engine does not resolve relatives.
  | { kind: "cd"; to: string }
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
