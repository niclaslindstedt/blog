import { Fragment, type ReactNode } from "react";

// Syntax-highlighter for an already-typed shell command, mirroring the set of
// roles that zsh-syntax-highlighting + oh-my-zsh paint by default: the command
// word in green, flags in orange, pipes in magenta, paths in cyan, and quoted
// strings in yellow. Anything that doesn't match a rule falls back to the
// foreground colour so the user still sees it.
export function highlightCommand(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let i = 0;
  let key = 0;
  let tokenStart = true;

  while (i < text.length) {
    if (text[i] === "|") {
      parts.push(
        <span key={key++} className="text-pipe mx-1">
          |
        </span>,
      );
      i++;
      tokenStart = true;
      continue;
    }

    if (/\s/.test(text[i])) {
      parts.push(<Fragment key={key++}>{text[i]}</Fragment>);
      i++;
      tokenStart = true;
      continue;
    }

    if (text[i] === "'" || text[i] === '"') {
      const quote = text[i];
      let end = i + 1;
      while (end < text.length && text[end] !== quote) {
        if (text[end] === "\\" && end + 1 < text.length) end += 2;
        else end++;
      }
      if (end < text.length) end++;
      parts.push(
        <span key={key++} className="text-meta">
          {text.slice(i, end)}
        </span>,
      );
      i = end;
      tokenStart = false;
      continue;
    }

    if (text[i] === "-" && tokenStart && i + 1 < text.length) {
      let end = i + 1;
      if (text[end] === "-") end++;
      while (end < text.length && !/\s/.test(text[end]) && text[end] !== "|") end++;
      parts.push(
        <span key={key++} className="text-flag">
          {text.slice(i, end)}
        </span>,
      );
      i = end;
      tokenStart = false;
      continue;
    }

    let end = i;
    while (
      end < text.length &&
      !/\s/.test(text[end]) &&
      text[end] !== "|" &&
      text[end] !== "'" &&
      text[end] !== '"'
    ) {
      end++;
    }
    const token = text.slice(i, end);

    if (tokenStart && !token.startsWith("-") && !/^\d/.test(token)) {
      parts.push(
        <span key={key++} className="text-accent">
          {token}
        </span>,
      );
    } else if (token.includes("/") || /\.[a-z0-9]+$/i.test(token)) {
      parts.push(
        <span key={key++} className="text-path">
          {token}
        </span>,
      );
    } else {
      parts.push(
        <span key={key++} className="text-fg">
          {token}
        </span>,
      );
    }

    i = end;
    tokenStart = false;
  }

  return parts;
}
