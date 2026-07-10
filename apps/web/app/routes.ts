import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("pricing", "routes/commercial.tsx", { id: "pricing" }),
  route("account", "routes/commercial.tsx", { id: "account" }),
  route("account/billing", "routes/commercial.tsx", { id: "account-billing" }),
  route("account/credits", "routes/commercial.tsx", { id: "account-credits" }),
  route("account/security", "routes/commercial.tsx", { id: "account-security" }),
  route("account/data", "routes/commercial.tsx", { id: "account-data" }),
  route("canvas/:projectId", "routes/canvas.tsx")
] satisfies RouteConfig;
