import fs from "node:fs";
import path from "node:path";

const DIST_DIR = path.resolve("dist");
const ASSETS_DIR = path.join(DIST_DIR, "assets");

const BUDGETS = {
  appJsBytes: 750 * 1024,
  appCssBytes: 115 * 1024,
  modelViewerBytes: 30 * 1024,
  threeJsBytes: 750 * 1024,
  gltfLoaderBytes: 50 * 1024,
  orbitControlsBytes: 25 * 1024,
  totalJsBytes: 1600 * 1024,
  totalAssetsBytes: 1760 * 1024
};

function fail(message) {
  console.error(`Build budget check failed: ${message}`);
  process.exitCode = 1;
}

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function readAssetFiles() {
  if (!fs.existsSync(ASSETS_DIR)) {
    fail(`missing ${path.relative(process.cwd(), ASSETS_DIR)}`);
    return [];
  }

  return fs.readdirSync(ASSETS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const filePath = path.join(ASSETS_DIR, entry.name);
      return {
        name: entry.name,
        bytes: fs.statSync(filePath).size
      };
    });
}

function findRequiredChunk(files, label, predicate) {
  const matches = files.filter(predicate);
  if (matches.length !== 1) {
    fail(`expected exactly one ${label} chunk, found ${matches.length}`);
    return null;
  }
  return matches[0];
}

function checkBudget(label, actualBytes, budgetBytes) {
  if (actualBytes > budgetBytes) {
    fail(`${label} is ${formatKiB(actualBytes)} over budget ${formatKiB(budgetBytes)}`);
    return;
  }

  console.log(`${label}: ${formatKiB(actualBytes)} / ${formatKiB(budgetBytes)}`);
}

const files = readAssetFiles();

const appJs = findRequiredChunk(
  files,
  "app JS",
  (file) => /^index-[A-Za-z0-9_-]+\.js$/.test(file.name)
);
const appCss = findRequiredChunk(
  files,
  "app CSS",
  (file) => /^index-[A-Za-z0-9_-]+\.css$/.test(file.name)
);
const modelViewer = findRequiredChunk(
  files,
  "model viewer",
  (file) => /^model-viewer-[A-Za-z0-9_-]+\.js$/.test(file.name)
);
const threeJs = findRequiredChunk(
  files,
  "Three.js vendor",
  (file) => /^three\.module-[A-Za-z0-9_-]+\.js$/.test(file.name)
);
const gltfLoader = findRequiredChunk(
  files,
  "GLTFLoader vendor",
  (file) => /^GLTFLoader-[A-Za-z0-9_-]+\.js$/.test(file.name)
);
const orbitControls = findRequiredChunk(
  files,
  "OrbitControls vendor",
  (file) => /^OrbitControls-[A-Za-z0-9_-]+\.js$/.test(file.name)
);

const totalJsBytes = files
  .filter((file) => file.name.endsWith(".js"))
  .reduce((sum, file) => sum + file.bytes, 0);
const totalAssetsBytes = files.reduce((sum, file) => sum + file.bytes, 0);

if (process.exitCode) {
  process.exit();
}

console.log("Build budget summary:");
checkBudget("app JS", appJs.bytes, BUDGETS.appJsBytes);
checkBudget("app CSS", appCss.bytes, BUDGETS.appCssBytes);
checkBudget("model viewer", modelViewer.bytes, BUDGETS.modelViewerBytes);
checkBudget("Three.js vendor", threeJs.bytes, BUDGETS.threeJsBytes);
checkBudget("GLTFLoader vendor", gltfLoader.bytes, BUDGETS.gltfLoaderBytes);
checkBudget("OrbitControls vendor", orbitControls.bytes, BUDGETS.orbitControlsBytes);
checkBudget("total JS", totalJsBytes, BUDGETS.totalJsBytes);
checkBudget("total assets", totalAssetsBytes, BUDGETS.totalAssetsBytes);

if (!process.exitCode) {
  console.log("Build budget checks passed.");
}
