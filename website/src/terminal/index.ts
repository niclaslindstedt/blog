// Public surface of the terminal kernel. Consumers import from `./terminal`;
// internal files are implementation details. Keeping this list short forces a
// conscious choice each time something becomes kernel-public API.

export { Terminal } from "./Terminal.tsx";
export { Tabs, type TabItem } from "./Tabs.tsx";
export { TerminalLine } from "./TerminalLine.tsx";
export { MarkdownBody, type MarkdownVariant } from "./MarkdownBody.tsx";
export { FileViewer } from "./FileViewer.tsx";
export { FileViewerContext, useFileViewer } from "./FileViewerContext.tsx";
export { ViOpenerContext, useViOpener } from "./ViOpenerContext.tsx";
export {
  useTerminalAnimation,
  type AnchorSignal,
  type UseTerminalAnimation,
} from "./useTerminalAnimation.ts";
export type { LineColor, LineData, Step, TabStop } from "./types.ts";
export { charDelayMs, BLOG_WPM } from "./typing.ts";
export { parseGithubFileUrl, parseLineRange, guessLanguage, type GithubFile } from "./github.ts";
