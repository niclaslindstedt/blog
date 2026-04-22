import { useEffect } from "react";

// Sync document.title with the currently rendered route. The SEO generator
// bakes the right <title> into each pre-rendered HTML file, so this hook is
// purely for client-side navigation: when the user clicks from the homepage
// into a post, the tab label follows them without a full page load.
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
