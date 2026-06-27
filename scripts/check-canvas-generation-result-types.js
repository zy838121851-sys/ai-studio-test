import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { listImageModels } from "../src/server/services/model-catalog.service.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const rootDir = path.resolve(".");
const models = listImageModels();
let capturedGeneratePayload = null;

const html = `<!doctype html>
<html>
<body>
  <div id="canvasWorld"></div>
  <script type="module">
    import { initModelCatalog } from "/src/client/features/ai/model-catalog.js?v=test";
    import { executeImageEditAction } from "/src/client/features/ai/image-edit-actions.js?v=test";
    import {
      createGenerationPreviewNode,
      replacePreviewNodeWithImage,
      replacePreviewNodeWithVideo
    } from "/src/client/features/canvas/node-creation.js?v=test";
    import { renderNodeTemplate } from "/src/client/features/canvas/node-template.js?v=test";

    const world = document.querySelector("#canvasWorld");

    function addNode(config = {}) {
      const node = document.createElement("article");
      node.className = "node-card node-" + config.kind;
      node.dataset.kind = config.kind || "";
      node.dataset.title = config.title || "";
      node.style.left = (config.x || 0) + "px";
      node.style.top = (config.y || 0) + "px";
      if (config.media?.url) node.dataset.objectUrl = config.media.url;
      node.innerHTML = renderNodeTemplate({
        kind: config.kind,
        title: config.title || "",
        desc: config.desc || "",
        media: config.media || {}
      });
      world.append(node);
      return node;
    }

    function createPreview(payload = {}) {
      return createGenerationPreviewNode({ addNode, ...payload });
    }

    function markGenerated(node, { prompt = "", sourceNode = null, actionType = "", model = "" } = {}) {
      node.dataset.createdBy = "ai";
      node.dataset.sourceMode = "generated";
      if (prompt) node.dataset.generationPrompt = prompt;
      if (model) node.dataset.generationModel = model;
      if (actionType) node.dataset.assetType = actionType;
      if (sourceNode?.dataset?.nodeId) node.dataset.sourceId = sourceNode.dataset.nodeId;
    }

    function replaceImage(previewNode, payload = {}) {
      return replacePreviewNodeWithImage({
        previewNode,
        addNode,
        applyGeneratedContext: markGenerated,
        recordGenerationCreated() {},
        ...payload
      });
    }

    function replaceVideo(previewNode, payload = {}) {
      return replacePreviewNodeWithVideo({
        previewNode,
        addNode,
        applyGeneratedContext: markGenerated,
        recordGenerationCreated() {},
        ...payload
      });
    }

    window.runCanvasGenerationResultTypeCheck = async () => {
      await initModelCatalog(document);

      const imagePreview = createPreview({
        title: "Image loading",
        desc: "Waiting",
        x: 10,
        y: 10,
        width: 320,
        aspectRatio: "1 / 1"
      });
      const imageNode = replaceImage(imagePreview, {
        title: "Generated Image.png",
        desc: "Generated image",
        url: "data:image/png;base64,abc",
        width: 320,
        aspectRatio: "1 / 1",
        prompt: "make image",
        actionType: "image_generation",
        model: "seedream-5-lite"
      });

      const videoPreview = createPreview({
        title: "Video loading",
        desc: "Waiting",
        x: 360,
        y: 10,
        width: 320,
        aspectRatio: "16 / 9"
      });
      const videoNode = replaceVideo(videoPreview, {
        title: "Generated Video.mp4",
        desc: "Generated video",
        url: "/uploads/generated-video.mp4",
        width: 320,
        aspectRatio: "16 / 9",
        prompt: "make video",
        actionType: "video_generation",
        model: "seedance-2"
      });

      const sourceNode = addNode({
        kind: "image",
        title: "Source.png",
        desc: "Source",
        x: 10,
        y: 380,
        media: {
          url: "data:image/png;base64,source",
          type: "image/png"
        }
      });
      sourceNode.dataset.nodeId = "source-1";

      let editedVideoNode = null;
      const editResult = await executeImageEditAction({
        sourceNode,
        referenceNodes: [sourceNode],
        prompt: "animate this image",
        label: "Animate",
        model: "seedance-2",
        readImageSourceAsDataUrl: async (src) => src,
        getOutputSize: () => "1024*1024",
        createPreview,
        replacePreview: replaceImage,
        replacePreviewVideo: (previewNode, payload) => {
          editedVideoNode = replaceVideo(previewNode, payload);
          return editedVideoNode;
        },
        addChat() {},
        addThinking: () => ({}),
        updateThinking() {},
        updateChat() {},
        addSourceBadge() {}
      });

      return {
        imageKind: imageNode.dataset.kind,
        imageModel: imageNode.dataset.generationModel,
        videoKind: videoNode.dataset.kind,
        videoModel: videoNode.dataset.generationModel,
        videoSrc: videoNode.querySelector("video")?.getAttribute("src") || "",
        editVideoKind: editedVideoNode?.dataset?.kind || "",
        editVideoModel: editedVideoNode?.dataset?.generationModel || "",
        editVideoUrl: editResult?.videoUrl || ""
      };
    };
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.pathname === "/api/models") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ models }));
      return;
    }
    if (url.pathname === "/api/ai/generate" && req.method === "POST") {
      const body = await readRequestBody(req);
      capturedGeneratePayload = JSON.parse(body || "{}");
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        message: "Video generated",
        videoUrl: "/uploads/edit-video.mp4",
        model: capturedGeneratePayload.model,
        requestedModel: capturedGeneratePayload.model
      }));
      return;
    }
    if (url.pathname === "/" || url.pathname === "/test") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(html);
      return;
    }
    const filePath = path.resolve(rootDir, `.${decodeURIComponent(url.pathname)}`);
    if (!filePath.startsWith(rootDir)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    const content = await readFile(filePath);
    res.writeHead(200, { "content-type": getContentType(filePath) });
    res.end(content);
  } catch (error) {
    res.writeHead(404);
    res.end(String(error?.message || "Not found"));
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const browser = await chromium.launch();

try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/test`);
  const result = await page.evaluate(() => window.runCanvasGenerationResultTypeCheck());

  assert(result.imageKind === "image", "Image generation should create an image node");
  assert(result.imageModel === "seedream-5-lite", "Image node should preserve generation model");
  assert(result.videoKind === "video", "Video generation should create a video node");
  assert(result.videoModel === "seedance-2", "Video node should preserve generation model");
  assert(result.videoSrc === "/uploads/generated-video.mp4", "Video node should render the generated video URL");
  assert(result.editVideoKind === "video", "Image edit with a video model should create a video node");
  assert(result.editVideoModel === "seedance-2", "Image edit video node should preserve generation model");
  assert(result.editVideoUrl === "/uploads/edit-video.mp4", "Image edit should return the generated video URL");
  assert(capturedGeneratePayload?.model === "seedance-2", "Image edit video should submit the selected video model");
  assert(capturedGeneratePayload?.images?.length === 1, "Image edit video should include the source image as reference");

  console.log("Canvas generation result type checks passed.");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function getContentType(filePath) {
  if (filePath.endsWith(".js")) return "text/javascript";
  if (filePath.endsWith(".css")) return "text/css";
  if (filePath.endsWith(".html")) return "text/html";
  return "application/octet-stream";
}
