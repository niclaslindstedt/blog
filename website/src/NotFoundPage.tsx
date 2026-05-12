import { FallbackShell } from "./FallbackShell.tsx";
import { usePageTitle } from "./seo/usePageTitle.ts";
import { SITE_NAME } from "./seo/siteConfig.ts";

// Component twin of the SSR'd not-found body in scripts/seo/render.tsx. Both
// must render byte-identical DOM so when GitHub Pages serves 404.html (which
// the SEO generator pre-renders with NotFoundBody) and the React app takes
// over, hydration succeeds instead of tearing the SSR'd HTML down. The link
// is intentionally a plain <a href="/"> (not a React-router Link) — a 404
// is a dead-end, the reader is bouncing back to home anyway, and a full
// reload makes the markup match the SSR exactly.
export function NotFoundPage() {
  usePageTitle(`Page not found — ${SITE_NAME}`);
  return (
    <FallbackShell>
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-fg-bright">Page not found</h1>
        <p className="text-dim">
          The page you're looking for doesn't exist. Head back to the homepage to browse posts.
        </p>
        <a href="/" className="text-fg underline decoration-dotted hover:text-accent">
          Back to all posts
        </a>
      </div>
    </FallbackShell>
  );
}
