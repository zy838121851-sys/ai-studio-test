# Canvas Selection Model

`WP-4.4-selection-model` provides framework-independent selection state for the rewrite Canvas.

## Rules

- Plain click creates a single selection.
- Additive or range selection toggles the target while preserving selected order.
- Marquee selection uses rectangle intersection and supports additive extension.
- Clearing selection always removes focus safely.
- Selection is reconciled against current document nodes so deleted nodes cannot remain focused.

The model does not listen to DOM events and does not change Legacy click, modifier, or marquee behavior; a later React adapter will translate the existing interaction contract into these primitives.

## Rollback

Revert this package commit. No UI or persisted document changes are included.
