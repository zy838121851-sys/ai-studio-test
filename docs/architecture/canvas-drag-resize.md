# Canvas Drag And Resize

`WP-4.5-drag-resize` provides deterministic document transforms for pointer-driven movement and resizing.

## Rules

- Moving applies the sampled world-space delta only to selected node IDs.
- Resizing changes width/height and preserves the node origin unless a new origin is explicitly supplied.
- Resize dimensions are clamped to a stable minimum so pointer noise cannot create invalid nodes.
- The functions are pure document transforms and do not synthesize pointer paths or animation frames.

## Rollback

Revert this package commit. No React adapter, Legacy code, or persisted document is changed.
