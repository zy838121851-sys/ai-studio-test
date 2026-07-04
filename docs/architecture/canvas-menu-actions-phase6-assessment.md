# Canvas Menu Actions Phase 6 Assessment

Date: 2026-07-04

This document records the current Phase 6 governance state for
`src/client/features/canvas/workflows/canvas-menu-actions.js`. It is a planning
and safety map only. It must not be treated as approval to change UI, copy,
interaction behavior, export behavior, upload behavior, or group markup.

## Current Status

Phase 6 has thinned `canvas-menu-actions.js` by moving behavior-equivalent
helper rules into focused utility modules:

- `canvas-menu-layout-utils.js`: layout bounds, z-index normalization, layer
  ordering, layer reorder calculation, node union bounds, position sorting,
  image aspect sizing, layout mutation snapshots, compact gallery layout,
  stack layout, and normalize layout commands.
- `canvas-menu-node-utils.js`: node kind checks, locked node checks, visible
  unique canvas filtering, command selection filters, group lookup helpers,
  group member lookup, group assignment, and exportable image filtering.
- `canvas-menu-export-utils.js`: blob/download/canvas helpers, image export
  rect/name helpers, HTTP URL checks, export clone preparation, and SVG
  rasterization.
- `canvas-menu-clipboard-utils.js`: clipboard snapshot and paste helpers.
- `canvas-menu-text-utils.js`: text, filename, extension, attribute, and HTML
  escaping helpers.

Current rough line counts:

| File | Lines |
| --- | ---: |
| `src/client/features/canvas/workflows/canvas-menu-actions.js` | 1030 |
| `src/client/features/canvas/workflows/canvas-menu-layout-utils.js` | 450 |
| `src/client/features/canvas/workflows/canvas-menu-node-utils.js` | 94 |
| `scripts/check-canvas-menu-actions.js` | 1212 |

`scripts/check-canvas-menu-actions.js` is the current behavioral guard for this
area and is included in `npm run check`.

## Remaining Actions File Responsibilities

The remaining responsibilities in `canvas-menu-actions.js` are no longer mostly
pure helpers. They are closer to workflow orchestration:

- Binding canvas menu action handlers and command routes.
- Creating and updating the selection action bar.
- Reading live selection, context menu, zoom, and DOM state.
- Dispatching add-node, image command, object command, layer command, align,
  normalize, group, ungroup, relink, export, and save actions.
- Applying visible group node markup and group background updates.
- Running export flows that touch browser downloads, File System Access API,
  SVG construction, computed styles, image loading, and proxy fetching.
- Maintaining selection state after layer/group commands.

## Safe Remaining Extraction Candidates

These can still be considered in small isolated stages, with targeted checks:

1. Selection toolbar state derivation where output is plain data only.
2. Context target fallback lookup, if injected with `querySelector` and tested
   without changing selectors.
3. Group sizing input calculation, excluding `configureGroupNode` markup and
   visible copy.
4. Export file naming batches, if extracted without changing filenames,
   download timing, or error messages.
5. Directory write permission helper placement, if the helper signature and
   browser behavior stay identical.

## High-Risk Areas To Defer

Do not continue automated extraction into these areas without a fresh focused
plan and runtime evidence:

- `createSelectionActionBar` and `updateSelectionActionBar`: toolbar markup,
  button state, labels, and interactions are user-visible.
- `configureGroupNode`: writes group classes, inline dimensions, background,
  and visible inner HTML.
- `relinkCanvasImage`: creates file input flow and user-visible chat feedback.
- `exportNodesByScope`, `renderExportFiles`, `writeExportFilesToDirectory`,
  `buildNodesSvg`, `buildNodeSvg`, `inlineComputedTree`, and
  `inlineCloneImages`: cross browser APIs, computed styles, downloads, image
  proxying, and export output are behavior-sensitive.
- Any selector or data attribute used by context menus, command buttons, upload
  ownership, selected nodes, or save actions.

## Recommended Next Stage

Phase 6 has reached the point where further frontend extraction gives smaller
maintainability gains and higher behavior risk. The recommended next governance
step is to shift to SaaS release readiness seams:

1. Backend provider and release-gate hardening:
   - rate limit store provider boundaries;
   - storage provider boundaries;
   - job queue provider boundaries;
   - audit logger provider boundaries;
   - billing provider boundaries.
2. API contract checks:
   - validation of protected route error contracts;
   - tenant/workspace isolation checks;
   - upload and project persistence invariants.
3. Production operations:
   - Railway environment checks;
   - database health and volume path checks;
   - safe mock-provider production defaults.

If Phase 6 continues before switching stages, keep each batch limited to one
pure helper or one workflow map document, and run:

```bash
node --check src/client/features/canvas/workflows/canvas-menu-actions.js
node scripts/check-canvas-menu-actions.js
npm run check
npm run build
```

## Stop Conditions

Pause before editing if the change would:

- alter visible toolbar, menu, group, export, or chat copy;
- change selectors or data attributes;
- touch browser file APIs or export output;
- alter selection persistence;
- alter group markup or CSS-relevant classes;
- require visual verification beyond the existing checks;
- require a new dependency or framework migration.
