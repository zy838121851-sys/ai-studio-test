import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { spawnSync } from "node:child_process";

const REQUIRED_IGNORED_PATHS = [
  ".env",
  ".env.local",
  "data/ai-studio.sqlite",
  "uploads/test.png",
  "debug.log",
  "tmp/server-3180.out.log",
  "logs/dev-server-3000.out.log"
];

const SENSITIVE_TRACKED_FILE_PATTERNS = [
  { name: "env file", test: (file) => /^\.env(?:\.|$)/i.test(basename(file)) && basename(file) !== ".env.example" },
  { name: "private key", test: (file) => /\.(?:pem|key|p12|pfx)$/i.test(file) },
  { name: "sqlite database", test: (file) => /\.(?:sqlite|sqlite3|db)$/i.test(file) },
  { name: "runtime log", test: (file) => /\.log$/i.test(file) },
  { name: "ssh private key", test: (file) => /(?:^|[\\/])id_rsa(?:$|\.)/i.test(file) },
  { name: "service account json", test: (file) => /(?:^|[\\/])service-account.*\.json$/i.test(file) }
];

const HIGH_CONFIDENCE_SECRET_PATTERNS = [
  { name: "private key block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "OpenAI project key", pattern: /\bsk-proj-[A-Za-z0-9_-]{20,}\b/ },
  { name: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/ },
  { name: "Slack token", pattern: /\bxox[abprs]-[A-Za-z0-9-]{20,}\b/ },
  { name: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "Aliyun access key id", pattern: /\bLTAI[A-Za-z0-9]{12,}\b/ },
  { name: "Google API key", pattern: /\bAIza[0-9A-Za-z_-]{25,}\b/ }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const trackedFiles = gitLines(["ls-files"]);
const trackedSensitiveFiles = trackedFiles.flatMap((file) => {
  const match = SENSITIVE_TRACKED_FILE_PATTERNS.find((entry) => entry.test(file));
  return match ? [`${file} (${match.name})`] : [];
});

assert(
  trackedSensitiveFiles.length === 0,
  `Sensitive runtime files must not be tracked:\n${trackedSensitiveFiles.join("\n")}`
);

const ignoredFailures = REQUIRED_IGNORED_PATHS.filter((file) => !isIgnored(file));
assert(
  ignoredFailures.length === 0,
  `Secret/runtime paths should be ignored by git:\n${ignoredFailures.join("\n")}`
);

const secretFindings = [];
for (const file of trackedFiles) {
  if (!isTextFile(file)) continue;
  const content = readFileSync(file, "utf8");
  for (const check of HIGH_CONFIDENCE_SECRET_PATTERNS) {
    const match = check.pattern.exec(content);
    if (match) {
      secretFindings.push(`${file}: ${check.name}`);
    }
  }
}

assert(
  secretFindings.length === 0,
  `High-confidence secret patterns found in tracked files:\n${secretFindings.join("\n")}`
);

console.log("Secret hygiene checks passed.");

function gitLines(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `git ${args.join(" ")} failed`);
  }
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function isIgnored(file) {
  const result = spawnSync("git", ["check-ignore", "--quiet", file], { encoding: "utf8" });
  return result.status === 0;
}

function isTextFile(file) {
  const extension = file.split(".").pop()?.toLowerCase() || "";
  if (["png", "jpg", "jpeg", "gif", "webp", "ico", "sqlite", "db"].includes(extension)) return false;
  try {
    const sample = readFileSync(file);
    return !sample.includes(0);
  } catch {
    return false;
  }
}
