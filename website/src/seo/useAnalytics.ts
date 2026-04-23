import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { GOATCOUNTER_ENDPOINT } from "./analytics.ts";

interface GoatCounter {
  count?: (opts?: { path?: string; title?: string; event?: boolean }) => void;
  no_onload?: boolean;
}

declare global {
  interface Window {
    goatcounter?: GoatCounter;
  }
}

// Module-scoped so the SPA only ever injects the script once, even if this
// hook is mounted in multiple places or re-mounts on route change.
let scriptInjected = false;

function ensureScript(): void {
  if (scriptInjected || !GOATCOUNTER_ENDPOINT) return;
  scriptInjected = true;
  // `no_onload` must be set *before* the script loads so the built-in
  // onload-pageview doesn't fire — we count manually from the route hook
  // so every client-side navigation is recorded.
  window.goatcounter = { ...window.goatcounter, no_onload: true };
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://gc.zgo.at/count.js";
  s.setAttribute("data-goatcounter", GOATCOUNTER_ENDPOINT);
  document.head.appendChild(s);
}

function countPageview(path: string, retries = 20): void {
  const gc = window.goatcounter;
  if (gc?.count) {
    gc.count({ path, title: document.title });
    return;
  }
  // Script still loading — back off briefly and try again, but cap the
  // attempts so a blocked script (ad-blocker, DNT) doesn't leak timers.
  if (retries <= 0) return;
  window.setTimeout(() => countPageview(path, retries - 1), 100);
}

export function useAnalytics(): void {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    ensureScript();
  }, []);

  useEffect(() => {
    if (!GOATCOUNTER_ENDPOINT) return;
    const path = location.pathname + location.search;
    if (lastPath.current === path) return;
    lastPath.current = path;
    // Defer one tick so `usePageTitle`'s effect runs first and
    // `document.title` is fresh when we read it.
    const id = window.setTimeout(() => countPageview(path), 0);
    return () => window.clearTimeout(id);
  }, [location.pathname, location.search]);
}
