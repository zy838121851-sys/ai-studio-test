import { buildEnhancedExpandPrompt, expandImage } from "../src/server/services/ai.service.js";
import { registerAIProvider } from "../src/server/services/providers/index.js";
import {
  buildExpandPrompt,
  createDefaultExpandBox
} from "../src/client/features/canvas/workflows/canvas-expand-workflow.js";
import { buildExpandImagePlanPrompt } from "../src/server/services/prompt-builder.service.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const sourceRect = { x: 100, y: 80, width: 400, height: 300 };
const defaultBox = createDefaultExpandBox(sourceRect);
const leftMargin = sourceRect.x - defaultBox.x;
const topMargin = sourceRect.y - defaultBox.y;

assert(leftMargin >= 90, `Expected wider default horizontal expansion, got ${leftMargin}px`);
assert(topMargin >= 90, `Expected wider default vertical expansion, got ${topMargin}px`);

const basePrompt = buildExpandPrompt({
  sourceRect,
  box: defaultBox,
  userPrompt: ""
});

assert(basePrompt.includes("Outpaint the original image"), "Expand prompt should use outpaint semantics");
assert(basePrompt.includes("Actively infer and complete"), "Expand prompt should ask for active inferred content");
assert(basePrompt.includes("original image content unchanged"), "Expand prompt should preserve the original image");

const plannerPrompt = buildExpandImagePlanPrompt({
  prompt: basePrompt,
  expand: {
    leftScale: 1.32,
    rightScale: 1.32,
    topScale: 1.32,
    bottomScale: 1.32
  }
});

assert(plannerPrompt.includes("2-4 concrete visual details"), "Planner prompt should require concrete side details");
assert(plannerPrompt.includes("should not merely say"), "Planner prompt should reject generic continuation");

const enhancedPrompt = buildEnhancedExpandPrompt(basePrompt, {
  sceneSummary: "A warm tabletop product scene with soft window light and shallow depth of field.",
  outsideAreaPlan: {
    left: "continue the wooden tabletop grain, blurred room edge, and soft cast shadow",
    right: "extend the tabletop with a subtle matching prop, warm shadow, and distant wall gradient",
    top: "continue the light falloff, background wall, and soft bokeh",
    bottom: "extend the foreground wood texture, shadow softness, and perspective lines"
  },
  continuityRules: [
    "preserve the original subject exactly",
    "keep the same camera angle, lens feel, and color temperature"
  ],
  outpaintPrompt: "Naturally extend the tabletop scene around the unchanged original image with seamless wood grain, soft window light, foreground shadow, and balanced negative space.",
  negative: ["new main subject", "different camera angle", "style change"]
});

assert(enhancedPrompt.includes("Automatic expansion plan from the source image"), "Enhanced prompt should include auto plan heading");
assert(enhancedPrompt.includes("left: continue the wooden tabletop"), "Enhanced prompt should include side-specific left plan");
assert(enhancedPrompt.includes("right: extend the tabletop"), "Enhanced prompt should include side-specific right plan");
assert(enhancedPrompt.includes("Use this outpaint direction"), "Enhanced prompt should include outpaint direction");
assert(enhancedPrompt.includes("different camera angle"), "Enhanced prompt should include negative constraints");

const restoreSuccessProvider = registerAIProvider({
  id: "qwen",
  async analyzeImage({ image, prompt }) {
    assert(image === "data:image/mock;base64,abc", "Planner should receive the source image");
    assert(prompt.includes("image outpainting planner"), "Planner should receive the planning prompt");
    return {
      text: JSON.stringify({
        sceneSummary: "A soft daylight product image on a textured tabletop.",
        outsideAreaPlan: {
          left: "continue tabletop grain and soft room edge",
          right: "extend background wall and a subtle matching prop",
          top: "continue light falloff and neutral wall",
          bottom: "extend foreground table texture and shadow"
        },
        continuityRules: ["keep the original product unchanged"],
        outpaintPrompt: "Extend the product scene with tabletop, background wall, natural daylight, and seamless perspective.",
        negative: ["new product", "different style"]
      })
    };
  },
  async expandImage() {
    throw new Error("Qwen expandImage should not be called for expand checks");
  },
  async generateImage() {
    throw new Error("generateImage should not be called for expand checks");
  },
  async generateText() {
    throw new Error("generateText should not be called for expand checks");
  }
});

const restoreSuccessApimartProvider = registerAIProvider({
  id: "apimart",
  async expandImage({ model, image, prompt, expand }) {
    assert(model === "wan2.7-image-pro", "Expand should default to wan2.7-image-pro");
    assert(image === "data:image/mock;base64,abc", "Expand should receive the source image");
    assert(expand.leftScale === 1.32, "Expand should receive scale parameters");
    assert(prompt.includes("Automatic expansion plan from the source image"), "Expand prompt should include the auto plan");
    assert(prompt.includes("left: continue tabletop grain"), "Expand prompt should include side-specific plan details");
    return {
      imageUrl: "mock://expanded-success",
      prompt,
      providerCalls: [{ provider: "apimart", model, operation: "expandImage", endpoint: "mock://apimart" }]
    };
  }
});

const successResult = await expandImage({
  image: "data:image/mock;base64,abc",
  prompt: basePrompt,
  expand: { leftScale: 1.32, rightScale: 1.32, topScale: 1.32, bottomScale: 1.32 }
});
assert(successResult.imageUrl === "mock://expanded-success", "Successful expand should return provider result");
assert(successResult.provider === "apimart", "Successful expand should use APIMart for the output model");
restoreSuccessProvider();
restoreSuccessApimartProvider();

const restoreFallbackProvider = registerAIProvider({
  id: "qwen",
  async analyzeImage() {
    throw new Error("simulated planner failure");
  },
  async expandImage() {
    throw new Error("Qwen expandImage should not be called for fallback expand checks");
  },
  async generateImage() {
    throw new Error("generateImage should not be called for expand checks");
  },
  async generateText() {
    throw new Error("generateText should not be called for expand checks");
  }
});

const restoreFallbackApimartProvider = registerAIProvider({
  id: "apimart",
  async expandImage({ model, prompt }) {
    assert(model === "wan2.7-image-pro", "Fallback expand should default to wan2.7-image-pro");
    assert(prompt === basePrompt, "Planner failure should fall back to the original expand prompt");
    return {
      imageUrl: "mock://expanded-fallback",
      prompt,
      providerCalls: [{ provider: "apimart", model, operation: "expandImage", endpoint: "mock://apimart" }]
    };
  }
});

const originalWarn = console.warn;
console.warn = () => {};
let fallbackResult;
try {
  fallbackResult = await expandImage({
    image: "data:image/mock;base64,abc",
    prompt: basePrompt,
    expand: { leftScale: 1.32, rightScale: 1.32, topScale: 1.32, bottomScale: 1.32 }
  });
} finally {
  console.warn = originalWarn;
}
assert(fallbackResult.imageUrl === "mock://expanded-fallback", "Fallback expand should still return provider result");
assert(fallbackResult.provider === "apimart", "Fallback expand should use APIMart for the output model");
restoreFallbackProvider();
restoreFallbackApimartProvider();

console.log("Expand prompt checks passed.");
