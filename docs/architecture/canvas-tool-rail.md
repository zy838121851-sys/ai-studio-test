# Canvas Tool Rail

`WP-5.1-tool-rail` restores the rewrite Canvas tool-rail contract using the existing tool semantics.

## Preserved contract

- Stable `data-tool` identifiers for select, shape, text, pen, eraser, and laser.
- Active tool state, collapse state, 44px touch targets, and accessible labels/tooltips.
- Shape and pen submenu anchors use `data-shape-tool` and `data-pen-tool`; their full geometry and drawing behavior remain in the following dedicated packages.
- Desktop and mobile layout use the same information order and restrained existing visual language.

This is rewrite-only. Legacy CSS, HTML, event bindings, icons, colors, and interaction are not changed.

## Rollback

Revert this package commit. The rewrite Canvas returns to its previous route without affecting Legacy.
