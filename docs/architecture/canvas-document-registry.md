# Canvas Document Registry

`WP-4.1-canvas-document-registry` establishes the framework-independent persistence boundary for the rewrite Canvas.

## Rules

- `CANVAS_NODE_REGISTRY` is the only allowlist for persistent node kinds.
- `serializeCanvasDocument` emits only registered persistent nodes and the current schema version.
- `normalizeCanvasDocument` remains backward-compatible with the existing v1 document shape and rejects malformed or unknown nodes.
- `CANVAS_SNAPSHOT_MIGRATIONS` is the explicit place for future schema migrations. Unknown versions are returned for a guarded caller to reject; they are never silently treated as current.
- Temporary generation previews are not registered as persistent nodes.

## Rollback

Revert this package commit. No Legacy Canvas files, database schema, or user snapshots are changed by this package.
