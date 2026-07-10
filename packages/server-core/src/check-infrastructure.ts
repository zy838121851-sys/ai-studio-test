import { RewriteInfrastructure } from "./infrastructure.js";
import { loadRewriteConfig } from "./config/rewrite-config.js";

const infrastructure = new RewriteInfrastructure(loadRewriteConfig(process.env));

try {
  const readiness = await infrastructure.checkReadiness();
  process.stdout.write(`${JSON.stringify(readiness)}\n`);
  if (!readiness.ready) {
    process.exitCode = 1;
  }
} finally {
  await infrastructure.close();
}
