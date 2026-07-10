# React Canvas Adapter

`WP-4.6-react-canvas-adapter` connects the rewrite Canvas route to the framework-independent engine.

## Boundaries

- Zustand stores the durable Canvas document and exposes a narrow `setDocument` seam.
- The adapter uses granular local selection state and a node registry for DOM refs.
- Pointermove applies a transient CSS transform to the active node; pointerup commits `moveNodes` once, so high-frequency pointer samples do not rerender the full React tree.
- Existing pending/result rendering, polling, labels, sizing, and route flow remain equivalent.
- Legacy Canvas is untouched. Full toolbar and editor migration remains later Stage 5 work.

## Rollback

Revert this package commit. The rewrite route returns to its previous static renderer; Legacy behavior and persisted data are unchanged.
