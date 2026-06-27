import { normalizeTaskPayload } from "../src/server/services/providers/apimart/apimart-task.service.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const cases = [
  {
    label: "result bare url string",
    payload: {
      data: {
        status: "completed",
        result: "https://getapib.org/image/task-result.png"
      }
    },
    expected: ["https://getapib.org/image/task-result.png"]
  },
  {
    label: "result image_url",
    payload: {
      data: {
        status: "completed",
        result: { image_url: "https://example.test/result-image-url.png" }
      }
    },
    expected: ["https://example.test/result-image-url.png"]
  },
  {
    label: "result url array",
    payload: {
      data: {
        status: "completed",
        result: { url: ["https://example.test/a.png", "https://example.test/b.png"] }
      }
    },
    expected: ["https://example.test/a.png", "https://example.test/b.png"]
  },
  {
    label: "images imageUrl",
    payload: {
      data: {
        status: "completed",
        result: { images: [{ imageUrl: "https://example.test/camel.png" }] }
      }
    },
    expected: ["https://example.test/camel.png"]
  },
  {
    label: "direct data url",
    payload: {
      data: {
        status: "completed",
        url: "https://example.test/direct.png"
      }
    },
    expected: ["https://example.test/direct.png"]
  }
];

for (const item of cases) {
  const result = normalizeTaskPayload(item.payload, { type: "image", model: "gpt-image-2" });
  assert(result.status === "succeeded", `${item.label}: expected succeeded status`);
  const urls = result.outputs.map((output) => output.url);
  assert(
    JSON.stringify(urls) === JSON.stringify(item.expected),
    `${item.label}: expected ${JSON.stringify(item.expected)}, got ${JSON.stringify(urls)}`
  );
}

console.log("APIMart task output checks passed.");
