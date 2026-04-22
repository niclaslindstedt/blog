import { createContext, useContext } from "react";
import type { GithubFile } from "./github.ts";

// Opens a GitHub file in the in-app vi simulator. Unlike FileViewerContext,
// which pops the modal immediately, this opener first animates `vi <path>`
// at the terminal prompt and then pops the modal — so clicking a source-code
// link in post markdown reads like a terminal session.
export const ViOpenerContext = createContext<(file: GithubFile) => void>(() => {});

export function useViOpener(): (file: GithubFile) => void {
  return useContext(ViOpenerContext);
}
