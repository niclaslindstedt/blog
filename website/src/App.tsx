import postsData from "./generated/posts.json";
import type { Post } from "./types.ts";

const posts = postsData as Post[];

export default function App() {
  return (
    <main>
      <h1>blog</h1>
      {posts.length === 0 ? (
        <p>No posts yet.</p>
      ) : (
        <ul>
          {posts.map((p) => (
            <li key={p.slug}>
              {p.date} — {p.title}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
