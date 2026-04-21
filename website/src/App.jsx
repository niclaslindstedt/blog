import sourceData from "./generated/sourceData.json";

export default function App() {
  return (
    <main>
      <h1>Hello, world.</h1>
      <p>
        <strong>{sourceData.name}</strong> — {sourceData.description}
      </p>
    </main>
  );
}
