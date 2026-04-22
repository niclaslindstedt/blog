import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { parseGithubFileUrl } from "./github.ts";
import { useViOpener } from "./ViOpenerContext.tsx";

export type MarkdownVariant = "terminal" | "prose";

function AnchorOverride({ href, children }: { href?: string; children?: React.ReactNode }) {
  const open = useViOpener();
  const parsed = parseGithubFileUrl(href);
  if (parsed) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          open(parsed);
        }}
        className="cursor-pointer bg-transparent p-0 font-[inherit] text-accent underline decoration-dotted hover:text-fg-bright focus-visible:text-fg-bright focus-visible:outline-none"
        title={`vi ${parsed.owner}/${parsed.repo}:${parsed.path}`}
      >
        {children}
      </button>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-link underline decoration-dotted hover:text-accent"
    >
      {children}
    </a>
  );
}

const terminalComponents: Components = {
  h1: ({ children }) => (
    <div className="my-[1lh] uppercase tracking-[0.1em] text-fg-bright">
      {"# "}
      {children}
    </div>
  ),
  h2: ({ children }) => <div className="mt-3 mb-1 font-bold text-fg-bright">{children}</div>,
  h3: ({ children }) => <div className="mt-2 mb-1 font-bold text-fg">{children}</div>,
  h4: ({ children }) => <div className="mt-1 mb-1 font-bold text-fg">{children}</div>,
  h5: ({ children }) => <div className="font-bold text-fg">{children}</div>,
  h6: ({ children }) => <div className="font-bold text-fg">{children}</div>,
  p: ({ children }) => <div className="mb-[1lh] whitespace-pre-wrap">{children}</div>,
  ul: ({ children }) => <ul className="my-1 ml-5 list-disc">{children}</ul>,
  ol: ({ children }) => <ol className="my-1 ml-5 list-decimal">{children}</ol>,
  li: ({ children }) => <li className="mb-0.5">{children}</li>,
  a: AnchorOverride,
  code: ({ children, className }) => (
    <code className={`text-meta ${className ?? ""}`}>{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto whitespace-pre-wrap bg-term-titlebar p-2">{children}</pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-1 border-l-2 border-dim pl-3 text-dim">{children}</blockquote>
  ),
  hr: () => <hr className="my-2 border-t border-dim" />,
  em: ({ children }) => <em className="italic">{children}</em>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  sup: ({ children }) => (
    <sup className="relative -top-[0.3em] text-[0.85em] text-dim">{children}</sup>
  ),
  table: ({ children }) => <table className="my-2 border-collapse">{children}</table>,
  th: ({ children }) => (
    <th className="border border-dim px-2 py-1 text-left font-bold">{children}</th>
  ),
  td: ({ children }) => <td className="border border-dim px-2 py-1">{children}</td>,
};

// Prose variant for the fallback blog: still monospaced (the site's only font
// stack), but with comfortable measure, real paragraph spacing, and
// conventional heading sizes so the text reads like a regular blog rather
// than a terminal dump.
//
// Heading levels are shifted down one (h1→h2, h2→h3, …) so the page stays a
// single <h1> — the post title rendered by FallbackPost. Search engines and
// screen readers both prefer one <h1> per document.
const proseComponents: Components = {
  h1: ({ children }) => (
    <h2 className="mt-10 mb-3 text-xl leading-snug font-bold text-fg-bright">{children}</h2>
  ),
  h2: ({ children }) => <h3 className="mt-8 mb-2 text-lg font-bold text-fg-bright">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-6 mb-2 font-bold text-fg">{children}</h4>,
  h4: ({ children }) => <h5 className="mt-4 mb-1 font-bold text-fg">{children}</h5>,
  h5: ({ children }) => <h6 className="mt-4 mb-1 font-bold text-fg">{children}</h6>,
  h6: ({ children }) => <h6 className="mt-4 mb-1 font-bold text-fg">{children}</h6>,
  p: ({ children }) => <p className="mb-5 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="my-4 ml-6 list-disc">{children}</ul>,
  ol: ({ children }) => <ol className="my-4 ml-6 list-decimal">{children}</ol>,
  li: ({ children }) => <li className="mb-2 leading-relaxed">{children}</li>,
  a: AnchorOverride,
  code: ({ children, className }) => (
    <code className={`rounded bg-term-titlebar px-1 py-0.5 text-meta ${className ?? ""}`}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-5 overflow-x-auto rounded bg-term-titlebar p-4 leading-relaxed">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-5 border-l-4 border-dim pl-4 text-dim italic">{children}</blockquote>
  ),
  hr: () => <hr className="my-8 border-t border-dim" />,
  em: ({ children }) => <em className="italic">{children}</em>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  sup: ({ children }) => (
    <sup className="relative -top-[0.3em] text-[0.85em] text-dim">{children}</sup>
  ),
  table: ({ children }) => (
    <div className="my-5 overflow-x-auto">
      <table className="border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-dim px-3 py-1.5 text-left font-bold">{children}</th>
  ),
  td: ({ children }) => <td className="border border-dim px-3 py-1.5">{children}</td>,
};

export function MarkdownBody({
  text,
  variant = "terminal",
}: {
  text: string;
  variant?: MarkdownVariant;
}) {
  const components = variant === "prose" ? proseComponents : terminalComponents;
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={components}>
      {text}
    </ReactMarkdown>
  );
}
