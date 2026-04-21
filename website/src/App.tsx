import postsData from "./generated/posts.json";
import type { Post } from "./types.ts";
import { TerminalBlog } from "./TerminalBlog.tsx";

const posts = postsData as Post[];

export default function App() {
  return (
    <main className="flex min-h-screen items-start justify-center px-6 py-12">
      <TerminalBlog posts={posts} />
    </main>
  );
}
