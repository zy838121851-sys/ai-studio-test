import type { CanvasDocument, CanvasNode } from "./index.js";

export const CURRENT_CANVAS_SCHEMA_VERSION = 1 as const;

export type CanvasNodeKind = CanvasNode["kind"];

export interface CanvasNodeDefinition {
  kind: CanvasNodeKind;
  persistent: true;
  temporary: false;
}

export const CANVAS_NODE_REGISTRY: Readonly<Record<CanvasNodeKind, CanvasNodeDefinition>> = {
  image: { kind: "image", persistent: true, temporary: false },
  "pending-image": { kind: "pending-image", persistent: true, temporary: false },
  shape: { kind: "shape", persistent: true, temporary: false },
  arrow: { kind: "arrow", persistent: true, temporary: false }
};

export interface CanvasSnapshotMigration {
  fromVersion: number;
  toVersion: number;
  migrate(value: unknown, projectId: string): unknown;
}

export const CANVAS_SNAPSHOT_MIGRATIONS: readonly CanvasSnapshotMigration[] = [];

export function isRegisteredCanvasNodeKind(value: unknown): value is CanvasNodeKind {
  return typeof value === "string" && value in CANVAS_NODE_REGISTRY;
}

export function serializeCanvasDocument(document: CanvasDocument): CanvasDocument {
  return {
    schemaVersion: CURRENT_CANVAS_SCHEMA_VERSION,
    projectId: document.projectId,
    nodes: document.nodes.filter((node) => isRegisteredCanvasNodeKind(node.kind))
  };
}

export function migrateCanvasSnapshot(value: unknown, projectId: string): unknown {
  if (!isRecord(value)) return value;
  const version = typeof value.schemaVersion === "number" ? value.schemaVersion : 0;
  if (version === CURRENT_CANVAS_SCHEMA_VERSION) return value;

  let current: unknown = value;
  let currentVersion = version;
  for (const migration of CANVAS_SNAPSHOT_MIGRATIONS) {
    if (migration.fromVersion === currentVersion) {
      current = migration.migrate(current, projectId);
      currentVersion = migration.toVersion;
    }
  }
  return current;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
