import "dotenv/config";
import { auditUploadIntegrity } from "../src/server/services/upload-integrity.service.js";

const strict = process.argv.includes("--strict");
const showAll = process.argv.includes("--all");
const report = auditUploadIntegrity();
const issueCount = report.orphanFiles.length + report.missingFiles.length + report.unsafeReferences.length;

console.log(`database=${report.sourceDatabasePath}`);
console.log(`upload_dir=${report.uploadDir}`);
console.log(`upload_files=${report.diskFiles.length}`);
console.log(`referenced_uploads=${report.referencedFiles.length}`);
console.log(`orphan_uploads=${report.orphanFiles.length}`);
console.log(`missing_uploads=${report.missingFiles.length}`);
console.log(`unsafe_upload_references=${report.unsafeReferences.length}`);
printList("orphan", report.orphanFiles);
printList("missing", report.missingFiles);
printList("unsafe", report.unsafeReferences);
console.log(`upload_integrity=${issueCount === 0 ? "ok" : "review"}`);

if (strict && issueCount > 0) process.exitCode = 1;

function printList(label, values) {
  const visible = showAll ? values : values.slice(0, 25);
  visible.forEach((value) => console.log(`${label}=${value}`));
  if (visible.length < values.length) {
    console.log(`${label}_omitted=${values.length - visible.length}`);
  }
}
