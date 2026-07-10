export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: Record<string, unknown>;
  };
}

export interface ServiceHealth {
  service: "ai-studio-rewrite-api";
  status: "ok" | "degraded";
  dependencies?: {
    database: "ready" | "unavailable";
    redis: "ready" | "unavailable";
    storage: "ready" | "unavailable";
  };
}
