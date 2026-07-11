# Canvas Pen Tool

`WP-5.4-pen-tool` implements rewrite Canvas freehand drawing from actual pointer samples.

## Rules

- Pointer start, move, and end points are recorded in order with pressure.
- The committed pen node is rejected when it contains fewer than two samples.
- SVG path data is generated only from recorded points.
- The rewrite adapter commits the node after pointerup and renders the exact recorded path.
- No animation or timed interpolation substitutes for user pointer input.

## Rollback

Revert this package commit. Legacy pen/laser behavior and existing project data remain untouched.
