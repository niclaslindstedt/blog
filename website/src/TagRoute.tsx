import { useParams } from "react-router-dom";
import type { Post } from "./types.ts";
import { FallbackBlog } from "./FallbackBlog.tsx";
import { usePageTitle } from "./seo/usePageTitle.ts";
import { SITE_NAME } from "./seo/siteConfig.ts";

// /tags/:tag is intentionally blog-only — a tag listing page has no terminal
// analogue, and the pre-rendered HTML the generator emits for this route
// always shows the fallback layout. Users can open the terminal from the
// footer, which navigates back to `/` in terminal mode.
export function TagRoute({ posts }: { posts: Post[] }) {
  const { tag } = useParams<{ tag: string }>();
  usePageTitle(tag ? `Posts tagged #${tag} — ${SITE_NAME}` : SITE_NAME);
  return <FallbackBlog posts={posts} tag={tag} />;
}
