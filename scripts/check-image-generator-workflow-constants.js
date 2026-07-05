import {
  DEFAULT_GENERATOR_COUNT,
  DEFAULT_GENERATOR_MODEL,
  DEFAULT_GENERATOR_RATIO,
  GENERATOR_POPOVER_SELECTOR,
  GENERATOR_SELECTOR,
  MIDJOURNEY_IMAGE_COUNT
} from "../src/client/features/canvas/workflows/image-generator-workflow-constants.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(GENERATOR_SELECTOR === ".node-image-generator", "Generator selector should remain stable");
assert(GENERATOR_POPOVER_SELECTOR === "#imageGeneratorPopover", "Generator popover selector should remain stable");
assert(DEFAULT_GENERATOR_MODEL === "doubao-seedream-5-0-lite-260128", "Default generator model should remain stable");
assert(DEFAULT_GENERATOR_RATIO === "1:1", "Default generator ratio should remain stable");
assert(DEFAULT_GENERATOR_COUNT === "1", "Default generator count should remain stable");
assert(MIDJOURNEY_IMAGE_COUNT === 4, "Midjourney generator count should remain stable");

console.log("Image generator workflow constants checks passed.");
