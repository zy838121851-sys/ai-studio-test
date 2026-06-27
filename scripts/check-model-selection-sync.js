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

const html = `<!doctype html>
<html>
<body>
  <div id="homeModelPicker">
    <select id="homeModelSelect"></select>
    <button id="homeModelButton" type="button"><span></span></button>
    <div id="homeModelMenu"></div>
  </div>
  <select id="chatModelSelect"></select>
  <select id="imageEditModel"></select>
  <div id="canvasViewport" style="width: 1200px; height: 800px;">
    <div id="canvasWorld">
      <div id="generatorNode" class="node-image-generator" style="left: 0px; top: 0px; width: 320px;">
        <div class="image-generator-stage"></div>
        <div class="image-generator-frame"></div>
        <span class="image-generator-size"></span>
      </div>
    </div>
  </div>
  <form id="imageGeneratorPopover" data-image-generator-form>
    <textarea data-image-generator-prompt></textarea>
    <div data-generator-reference-list></div>
    <input data-generator-reference-input type="file" />
    <select data-generator-model></select>
    <select data-generator-ratio>
      <option value="1:1">1:1</option>
      <option value="16:9">16:9</option>
    </select>
    <select data-generator-count>
      <option value="1">1</option>
      <option value="2">2</option>
    </select>
    <button data-generator-submit type="submit" data-credit-quote data-credit-task="image_generation" data-credit-model-source="[data-generator-model]" data-credit-count-source="[data-generator-count]"></button>
  </form>
  <script type="module">
    import { initModelCatalog } from "/src/client/features/ai/model-catalog.js?v=test";
    import { enhanceCompactSelects } from "/src/client/lib/compact-select.js?v=test";
    import { createImageGeneratorWorkflow } from "/src/client/features/canvas/workflows/image-generator-workflow.js?v=test";

    window.runModelSelectionSyncCheck = async () => {
      await initModelCatalog(document);
      enhanceCompactSelects(document);
      const workflow = createImageGeneratorWorkflow({
        elements: {
          canvasWorld: document.querySelector("#canvasWorld"),
          canvasViewport: document.querySelector("#canvasViewport")
        },
        services: {
          getZoom: () => 1
        }
      });
      workflow.showGeneratorPopover(document.querySelector("#generatorNode"));

      return {
        choose(selector, value) {
          const select = document.querySelector(selector);
          select.value = value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        },
        openChatMenu() {
          document.querySelector(".compact-select[data-select-id='chatModelSelect'] .compact-select-trigger").click();
        },
        values() {
          return {
            home: document.querySelector("#homeModelSelect").value,
            homeLabel: document.querySelector("#homeModelButton span").textContent,
            chat: document.querySelector("#chatModelSelect").value,
            imageEdit: document.querySelector("#imageEditModel").value,
            generator: document.querySelector("[data-generator-model]").value,
            generatorLabel: document.querySelector("[data-generator-select-trigger='model']").textContent,
            lists: {
              home: Array.from(document.querySelectorAll("#homeModelSelect option")).map((item) => item.value),
              chat: Array.from(document.querySelectorAll("#chatModelSelect option")).map((item) => item.value),
              imageEdit: Array.from(document.querySelectorAll("#imageEditModel option")).map((item) => item.value),
              generator: Array.from(document.querySelectorAll("[data-generator-model] option")).map((item) => item.value)
            },
            selectedChatOptions: Array.from(document.querySelectorAll(".compact-select[data-select-id='chatModelSelect'] .model-preference-option.selected")).map((item) => item.dataset.modelValue),
            activeChatOptions: Array.from(document.querySelectorAll(".compact-select[data-select-id='chatModelSelect'] .model-preference-option.active")).map((item) => item.dataset.modelValue)
          };
        }
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
  const handle = await page.evaluateHandle(() => window.runModelSelectionSyncCheck());

  await page.evaluate((api) => api.choose("#homeModelSelect", "seedream-5-lite"), handle);
  let values = await page.evaluate((api) => api.values(), handle);
  assert(values.home === "seedream-5-lite", "Homepage selection should update");
  assert(values.chat === "seedream-5-lite", "Chat menu select should sync from homepage");
  assert(values.imageEdit === "seedream-5-lite", "Image edit select should sync from homepage");
  assert(values.generator === "seedream-5-lite", "Generator select should sync from homepage");
  assert(JSON.stringify(values.lists.chat) === JSON.stringify(values.lists.home), "Chat model list should match homepage");
  assert(JSON.stringify(values.lists.imageEdit) === JSON.stringify(values.lists.home), "Image edit model list should match homepage");
  assert(JSON.stringify(values.lists.generator) === JSON.stringify(values.lists.home), "Generator model list should match homepage");

  await page.evaluate((api) => api.choose("#chatModelSelect", "nano-banana"), handle);
  values = await page.evaluate((api) => api.values(), handle);
  assert(values.home === "nano-banana", "Homepage should sync from chat menu");
  assert(values.homeLabel === "Nano Banana", "Homepage button label should sync from chat menu");
  assert(values.imageEdit === "nano-banana", "Image edit should sync from chat menu");
  assert(values.generator === "nano-banana", "Generator should sync from chat menu");

  await page.evaluate((api) => {
    api.choose("[data-generator-model]", "wan2.7-image-pro");
    api.openChatMenu();
  }, handle);
  values = await page.evaluate((api) => api.values(), handle);
  assert(values.home === "wan2.7-image-pro", "Homepage should sync from generator");
  assert(values.chat === "wan2.7-image-pro", "Chat select should sync from generator");
  assert(values.imageEdit === "wan2.7-image-pro", "Image edit should sync from generator");
  assert(values.selectedChatOptions.length === 1 && values.selectedChatOptions[0] === "wan2.7-image-pro", "Chat compact menu should have one selected model");
  assert(values.activeChatOptions.length === 1 && values.activeChatOptions[0] === "wan2.7-image-pro", "Chat compact menu should have one active model");

  await page.evaluate((api) => api.choose("#chatModelSelect", "seedance-2"), handle);
  values = await page.evaluate((api) => api.values(), handle);
  assert(values.chat === "seedance-2", "Chat should allow video model selection");
  assert(values.home === "seedance-2", "Homepage should sync video model from chat");
  assert(values.imageEdit === "seedance-2", "Image edit should sync video model from chat");
  assert(values.generator === "seedance-2", "Generator should keep video model selections");

  console.log("Model selection sync checks passed.");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

function getContentType(filePath) {
  if (filePath.endsWith(".js")) return "text/javascript";
  if (filePath.endsWith(".css")) return "text/css";
  if (filePath.endsWith(".html")) return "text/html";
  return "application/octet-stream";
}
