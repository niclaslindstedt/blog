import { Fragment, type ReactNode } from "react";

// Syntax-highlighter for a shell command line. The first word of each simple
// command (start of line, or immediately after a command separator — `|`,
// `&&`, `||`, `;`, `&`) turns green once it has been fully typed, mirroring
// how zsh-syntax-highlighting flips an "unknown command" to a "valid command"
// the moment the reader finishes the word. Everything else — flags, quoted
// strings, paths, separators, plain arguments — stays in the bright
// foreground colour, so the eye lands on the verb of each command rather
// than a rainbow of argument syntax. When `active` is true the caller is
// still typing the trailing token, so we keep the in-progress command word
// white until a boundary lands after it.
export function highlightCommand(text: string, active = false): ReactNode {
  const parts: ReactNode[] = [];
  let i = 0;
  let key = 0;
  let tokenStart = true;

  while (i < text.length) {
    if (text[i] === "&" && text[i + 1] === "&") {
      parts.push(
        <span key={key++} className="text-fg-bright mx-1">
          &&
        </span>,
      );
      i += 2;
      tokenStart = true;
      continue;
    }

    if (text[i] === "|" && text[i + 1] === "|") {
      parts.push(
        <span key={key++} className="text-fg-bright mx-1">
          ||
        </span>,
      );
      i += 2;
      tokenStart = true;
      continue;
    }

    if (text[i] === "|") {
      parts.push(
        <span key={key++} className="text-fg-bright mx-1">
          |
        </span>,
      );
      i++;
      tokenStart = true;
      continue;
    }

    if (text[i] === ";" || text[i] === "&") {
      parts.push(
        <span key={key++} className="text-fg-bright">
          {text[i]}
        </span>,
      );
      i++;
      tokenStart = true;
      continue;
    }

    if (/\s/.test(text[i])) {
      parts.push(<Fragment key={key++}>{text[i]}</Fragment>);
      i++;
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
        <span key={key++} className="text-fg-bright">
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
      text[end] !== "&" &&
      text[end] !== ";" &&
      text[end] !== "'" &&
      text[end] !== '"'
    ) {
      end++;
    }
    const token = text.slice(i, end);
    const isCommand = tokenStart && !token.startsWith("-") && !/^\d/.test(token);
    const stillTyping = active && end === text.length;
    const className = isCommand && !stillTyping ? "text-accent" : "text-fg-bright";
    parts.push(
      <span key={key++} className={className}>
        {token}
      </span>,
    );
    i = end;
    tokenStart = false;
  }

  return parts;
}
