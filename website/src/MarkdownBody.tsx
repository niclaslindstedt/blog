import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { parseGithubFileUrl } from "./github.ts";
import { useFileViewer } from "./FileViewerContext.tsx";

function AnchorOverride({ href, children }: { href?: string; children?: React.ReactNode }) {
  const open = useFileViewer();
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

const components: Components = {
  h1: ({ children }) => (
    <div className="mt-3 mb-1 font-bold uppercase tracking-[0.1em] text-fg-bright">{children}</div>
  ),
  h2: ({ children }) => <div className="mt-3 mb-1 font-bold text-fg-bright">{children}</div>,
  h3: ({ children }) => <div className="mt-2 mb-1 font-bold text-fg">{children}</div>,
  h4: ({ children }) => <div className="mt-1 mb-1 font-bold text-fg">{children}</div>,
  h5: ({ children }) => <div className="font-bold text-fg">{children}</div>,
  h6: ({ children }) => <div className="font-bold text-fg">{children}</div>,
  p: ({ children }) => <div className="mb-2 whitespace-pre-wrap">{children}</div>,
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
  table: ({ children }) => <table className="my-2 border-collapse">{children}</table>,
  th: ({ children }) => (
    <th className="border border-dim px-2 py-1 text-left font-bold">{children}</th>
  ),
  td: ({ children }) => <td className="border border-dim px-2 py-1">{children}</td>,
};

export function MarkdownBody({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {text}
    </ReactMarkdown>
  );
}
