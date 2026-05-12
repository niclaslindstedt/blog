import { useEffect, useState } from "react";

// Returns `false` during the SSR pass and during the first client render
// (so the rendered output matches the server HTML and hydration succeeds),
// then `true` from the next render onwards. Use it to gate any component
// whose output depends on browser-only state (localStorage, window size,
// `navigator`, etc.) — render the SSR-matching default while `!hydrated`,
// the real value once hydrated. Without this hook, those components flip
// to client state on the first render and React tears the SSR'd DOM down
// as a hydration mismatch.
export function useIsHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
