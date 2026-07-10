import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("canvas/:projectId", "routes/canvas.tsx")
] satisfies RouteConfig;
