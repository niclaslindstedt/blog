import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("missing #root mount point");

// `hydrateRoot` (rather than `createRoot`) so the SSR'd prose inside #root
// stays in the DOM until React attaches matching React tree to it, instead
// of being torn down and re-rendered on mount. The first-render contract:
// `useIsHydrated()` returns false during this pass, so every component
// whose output depends on browser-only state must render its SSR-matching
// default. Once committed, useEffects run and the tree transitions to the
// reader's real preferences (audience, theme, terminal view) — Suspense
// boundaries cover the lazy chunks so the SSR'd HTML stays painted the
// entire time.
hydrateRoot(
  root,
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
