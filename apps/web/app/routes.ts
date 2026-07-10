import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("pricing", "routes/commercial.tsx", { id: "pricing" }),
  route("account", "routes/commercial.tsx", { id: "account" }),
  route("account/billing", "routes/commercial.tsx", { id: "account-billing" }),
  route("account/credits", "routes/commercial.tsx", { id: "account-credits" }),
  route("account/security", "routes/commercial.tsx", { id: "account-security" }),
  route("account/data", "routes/commercial.tsx", { id: "account-data" }),
  route("legal/terms", "routes/commercial.tsx", { id: "legal-terms" }),
  route("legal/privacy", "routes/commercial.tsx", { id: "legal-privacy" }),
  route("legal/refunds", "routes/commercial.tsx", { id: "legal-refunds" }),
  route("legal/ai-disclosure", "routes/commercial.tsx", { id: "legal-ai-disclosure" }),
  route("support/report", "routes/commercial.tsx", { id: "support-report" }),
  route("support/appeal", "routes/commercial.tsx", { id: "support-appeal" }),
  route("canvas/:projectId", "routes/canvas.tsx")
] satisfies RouteConfig;
