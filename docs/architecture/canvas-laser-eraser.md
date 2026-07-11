# Canvas Laser And Eraser

`WP-5.5-laser-eraser` keeps transient laser data outside the persisted canvas document. Each sample records its canvas-relative position and timestamp; samples older than 420 milliseconds are removed.

The eraser uses the same canvas-relative pointer coordinate system. It removes only nodes whose bounds intersect the configured circular pointer radius. Neither tool changes Legacy behavior or writes decorative animation data into `CanvasDocument`.

Verification covers timing and hit testing in `packages/canvas-engine`, plus Playwright paths that start in both empty canvas space and a node.
