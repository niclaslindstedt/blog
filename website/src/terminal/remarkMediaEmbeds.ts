import type { Root, RootContent, Paragraph, Html } from "mdast";

// Authors embed a YouTube video by putting its URL on a paragraph by itself
// (either as a bare URL or a markdown link). The plugin replaces that
// paragraph with a raw HTML iframe wrapped in an aspect-ratio container so
// the embed scales with the post's measure. rehype-raw is already in the
// pipeline, so the HTML node renders as real DOM.
const YOUTUBE_URL =
  /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^\s]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[?&#][^\s]*)?$/;

function youtubeIdFromUrl(url: string): string | null {
  const trimmed = url.trim();
  const match = trimmed.match(YOUTUBE_URL);
  return match ? match[1] : null;
}

function paragraphSoleUrl(node: Paragraph): string | null {
  if (node.children.length !== 1) return null;
  const child = node.children[0];
  if (child.type === "link") return child.url;
  if (child.type === "text") {
    const text = child.value.trim();
    if (/^https?:\/\/\S+$/.test(text)) return text;
  }
  return null;
}

function youtubeEmbedHtml(id: string): string {
  const src = `https://www.youtube-nocookie.com/embed/${id}`;
  return [
    '<div class="media-embed media-embed-youtube">',
    `<iframe src="${src}" title="YouTube video" loading="lazy" `,
    'frameborder="0" referrerpolicy="strict-origin-when-cross-origin" ',
    'allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ',
    "allowfullscreen></iframe>",
    "</div>",
  ].join("");
}

export function remarkMediaEmbeds() {
  return (tree: Root): void => {
    const next: RootContent[] = [];
    for (const node of tree.children) {
      if (node.type === "paragraph") {
        const url = paragraphSoleUrl(node);
        const id = url ? youtubeIdFromUrl(url) : null;
        if (id) {
          const html: Html = { type: "html", value: youtubeEmbedHtml(id) };
          next.push(html);
          continue;
        }
      }
      next.push(node);
    }
    tree.children = next;
  };
}
