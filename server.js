import { startServer } from "./src/server/index.js";

try {
  startServer();
} catch (error) {
  console.error("[error] Server failed to start", { error: error.message });
  process.exitCode = 1;
}
