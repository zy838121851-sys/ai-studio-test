# Canvas Viewport Coordinate System

`WP-4.2-viewport-coordinate-system` provides framework-independent viewport math for the rewrite Canvas.

## Rules

- `screenToWorld` and `worldToScreen` are inverse operations for every supported zoom level.
- Zoom is clamped to `0.1..4` and zooming around an anchor preserves that screen point.
- Panning changes only the viewport translation; it does not mutate document node coordinates.
- Fit-to-bounds computes a centered viewport with explicit padding and deterministic invalid-input fallback.

The module contains no DOM, React, pointer-event, or rendering dependency. Existing Legacy canvas coordinate behavior remains unchanged until a later adapter package.

## Rollback

Revert this package commit. No existing canvas UI or persisted document is changed.
