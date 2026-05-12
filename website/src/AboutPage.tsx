import { Link } from "react-router-dom";
import { FallbackShell } from "./FallbackShell.tsx";
import { fallbackHref } from "./postFilters.ts";
import { usePageTitle } from "./seo/usePageTitle.ts";
import { SITE_NAME } from "./seo/siteConfig.ts";

// /about is a high-authority anchor page: it gives Google an obvious target
// for the `Person` Knowledge-Graph entity (every post's BlogPosting points
// here for `author.url`) and gives readers somewhere to land when a search
// hit makes them curious who's behind the writing. Content stays minimal on
// purpose — niclaslindstedt.se carries the full CV; this page just gives the
// blog a stable bio surface and links out.
export function AboutPage() {
  usePageTitle(`About — ${SITE_NAME}`);
  return (
    <FallbackShell>
      <article className="flex flex-col gap-6">
        <header>
          <h1 className="mb-3 text-3xl leading-tight font-bold text-fg-bright">About</h1>
          <p className="text-sm text-dim">
            Writing by Niclas Lindstedt about AI, agents, and open source.
          </p>
        </header>

        <p className="leading-relaxed">
          This blog is where I publish hands-on notes on building developer tools — typically small
          CLIs and agent harnesses I use for my own work. Posts ship in two audience-specific
          versions so a deep technical walkthrough can sit next to a plainer explanation of the same
          idea; readers pick their preferred lens from the header.
        </p>

        <p className="leading-relaxed">
          My full CV, project portfolio, and contact info live at{" "}
          <a
            href="https://niclaslindstedt.se"
            className="text-link underline decoration-dotted hover:text-fg-bright"
          >
            niclaslindstedt.se
          </a>
          . The source for everything I publish — including this blog — is on{" "}
          <a
            href="https://github.com/niclaslindstedt"
            className="text-link underline decoration-dotted hover:text-fg-bright"
          >
            GitHub
          </a>
          .
        </p>

        <section>
          <h2 className="mb-2 text-lg font-bold text-fg-bright">Elsewhere</h2>
          <ul className="flex flex-col gap-1">
            <li>
              <a
                href="https://github.com/niclaslindstedt"
                className="text-link underline decoration-dotted hover:text-fg-bright"
              >
                github.com/niclaslindstedt
              </a>
            </li>
            <li>
              <a
                href="https://www.linkedin.com/in/niclaslindstedt/"
                className="text-link underline decoration-dotted hover:text-fg-bright"
              >
                linkedin.com/in/niclaslindstedt
              </a>
            </li>
            <li>
              <a
                href="https://hub.docker.com/u/niclaslindstedt"
                className="text-link underline decoration-dotted hover:text-fg-bright"
              >
                hub.docker.com/u/niclaslindstedt
              </a>
            </li>
            <li>
              <a
                href="https://pypi.org/user/niclaslindstedt/"
                className="text-link underline decoration-dotted hover:text-fg-bright"
              >
                pypi.org/user/niclaslindstedt
              </a>
            </li>
            <li>
              <a
                href="https://crates.io/users/niclaslindstedt"
                className="text-link underline decoration-dotted hover:text-fg-bright"
              >
                crates.io/users/niclaslindstedt
              </a>
            </li>
          </ul>
        </section>

        <nav className="text-xs text-dim">
          <Link to={fallbackHref("/")} className="underline decoration-dotted hover:text-fg-bright">
            Back to all posts
          </Link>
        </nav>
      </article>
    </FallbackShell>
  );
}
