# Canvas Format Toolbars

`WP-5.6-format-toolbars` adds rewrite-only format controls that bind to exactly one selected compatible node.

- Shapes expose fill color, stroke color, and stroke width.
- Arrows expose stroke color and stroke width.
- Text exposes color, family, weight, and size.

Every control writes a validated update to the selected `CanvasDocument` node. The floating toolbar is not persisted, and multi-selection intentionally shows no ambiguous format control.
