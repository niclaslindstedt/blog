// Extract project metadata from source so the website never goes stale.
// Outputs website/src/generated/sourceData.json.
import fs from "node:fs";
import path from "node:path";

const out = {
  name: "blog",
  description: "A retro pixel-art React blog where posts are git-tracked markdown files authored and managed via Claude skills.",
  generatedAt: new Date().toISOString(),
};

const dest = path.join("src", "generated");
fs.mkdirSync(dest, { recursive: true });
fs.writeFileSync(path.join(dest, "sourceData.json"), JSON.stringify(out, null, 2));
console.log("wrote", path.join(dest, "sourceData.json"));