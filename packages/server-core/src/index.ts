export interface RewriteEnvironment {
  nodeEnv: "development" | "test" | "production";
  storageProvider: "local" | "oss";
}

export function assertRewriteEnvironment(environment: RewriteEnvironment): void {
  if (environment.nodeEnv === "production" && environment.storageProvider !== "oss") {
    throw new Error("Production rewrite must use the OSS storage provider.");
  }
}
