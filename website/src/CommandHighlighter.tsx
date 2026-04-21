import { Fragment, type ReactNode } from "react";

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
    while (end < text.length && !/\s/.test(text[end]) && text[end] !== "|") end++;
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
        <span key={key++} className="text-fg-bright">
          {token}
        </span>,
      );
    }

    i = end;
    tokenStart = false;
  }

  return parts;
}
