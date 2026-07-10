import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(source, text, message) {
  assert(source.includes(text), message);
}

const workflow = read("src/client/features/canvas/workflows/image-generator-workflow.js");
const recoveryWorkflow = read("src/client/features/canvas/workflows/image-generator-recovery-workflow.js");
const workflowCopySurface = `${workflow}\n${recoveryWorkflow}`;
const previewJobUtils = read("src/client/features/canvas/workflows/image-generator-preview-job-utils.js");

[
  "鍥惧儚",
  "澶辫触"
].forEach((text) => {
  assert(!workflowCopySurface.includes(text), `image generator workflow copy must not contain mojibake: ${text}`);
});

[
  "正在等待第 ${index + 1}/${count} 张结果",
  "正在生成第 ${index + 1}/${count} 张",
  "正在恢复生成结果...",
  "生成失败：${error.message}",
  "图像生成失败：${error.message}"
].forEach((text) => {
  assertIncludes(workflowCopySurface, text, `image generator workflow copy must preserve: ${text}`);
});

[
  "正在生成第 ${index + 1}/${count} 张",
  "正在根据当前提示生成结果",
  "正在生成图片",
  "生成失败",
  "生成失败，请重试"
].forEach((text) => {
  assertIncludes(previewJobUtils, text, `image generator preview copy must preserve: ${text}`);
});

console.log("Image generator copy checks passed.");
