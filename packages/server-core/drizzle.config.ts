import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/database/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgres://ai_studio:ai_studio_local@127.0.0.1:55432/ai_studio_rewrite"
  },
  strict: true,
  verbose: true
});
