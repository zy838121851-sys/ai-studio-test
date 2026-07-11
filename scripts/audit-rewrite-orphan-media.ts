import { auditOrphanMedia, loadRewriteConfig, RewriteInfrastructure } from "@ai-studio/server-core";

const infrastructure = new RewriteInfrastructure(loadRewriteConfig(process.env));
try {
  const report = await auditOrphanMedia(infrastructure.database, infrastructure.storage);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await infrastructure.close();
}
