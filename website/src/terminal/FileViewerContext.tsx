import { createContext, useContext } from "react";
import type { GithubFile } from "./github.ts";

export const FileViewerContext = createContext<(file: GithubFile) => void>(() => {});

export function useFileViewer(): (file: GithubFile) => void {
  return useContext(FileViewerContext);
}
