import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const roots = ["server.js", "app.js", "scripts", "src"];

function collectJsFiles(target) {
  const stat = statSync(target);
  if (stat.isFile()) return target.endsWith(".js") ? [target] : [];
  return readdirSync(target).flatMap((name) => collectJsFiles(join(target, name)));
}

const files = roots.flatMap(collectJsFiles);
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || `Syntax check failed: ${file}\n`);
    process.exit(result.status || 1);
  }
}

console.log(`Checked ${files.length} JavaScript files.`);
