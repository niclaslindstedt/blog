import { createContext, useContext } from "react";

// Lightweight opener for the search modal. Modeled after `FileViewerContext`
// in `terminal/`: a single function call from anywhere in the tree opens
// the modal; close lives on the modal itself. Default no-op so consumers
// outside the provider don't crash — the icon button just stops working.
export type SearchOpener = () => void;

export const SearchOpenerContext = createContext<SearchOpener>(() => {});

export function useSearchOpener(): SearchOpener {
  return useContext(SearchOpenerContext);
}
