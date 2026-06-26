import { readFileSync } from "node:fs";

const files = [
  "src/client/features/ai/model-catalog.js",
  "src/client/features/ai/model-preference-menu.js",
  "index.html",
  "styles/workspace-layout.css"
];

const forbidden = [
  /via apimart/i,
  /gateway/i,
  /proxy/i,
  /中转/,
  /provider:\s*"?apimart/i
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const pattern of forbidden) {
    assert(!pattern.test(text), `${file} contains forbidden public wording: ${pattern}`);
  }
}

console.log("APIMart public copy checks passed.");
