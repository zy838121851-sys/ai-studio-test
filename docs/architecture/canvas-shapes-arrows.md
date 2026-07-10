# Canvas Shapes And Arrows

`WP-5.2-shapes-arrows` adds the rewrite Canvas shape registry and pointer-derived arrow geometry.

## Rules

- Registered shapes are rectangle, ellipse, diamond, triangle, and star.
- Shape nodes use stable world-space geometry and are validated through the document registry.
- Arrow angle and length are derived directly from start/end pointer coordinates; no decorative path is substituted for user input.
- The tool submenu exposes all shape IDs and an arrow entry. Full node rendering/format controls remain isolated for later adapters.

Legacy shape behavior and CSS are unchanged. This package only adds the rewrite engine and rewrite submenu contract.

## Rollback

Revert this package commit. Existing Legacy shapes and persisted documents remain untouched.
