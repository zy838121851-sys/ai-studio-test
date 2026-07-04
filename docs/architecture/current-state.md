# AI Studio Current Architecture Baseline

Date: 2026-07-05

This document records the non-behavioral governance baseline for AI Studio. It
is intentionally descriptive only: governance work must not change existing
features, UI appearance, or interaction behavior unless explicitly requested.

## Governance Constraints

- Preserve current product behavior.
- Do not intentionally change UI layout, styling, copy, or interaction flows.
- Prefer behavior-equivalent refactors, documentation, verification, and release
  readiness work.
- Protect existing unrelated worktree changes; at this baseline, `styles/task-log.css`
  already has user/worktree edits and is out of scope.
- Every implementation batch should pass `npm run check` and `npm run build`.

## Runtime Entrypoints

Client boot path:

```text
app.js -> src/client/main.js -> src/client/core/app-init.js
```

Current app initialization in `app-init.js`:

- Registers mock and server AI providers, then selects the server provider.
- Mounts the workspace app through `mountWorkspaceApp`.
- Initializes model catalog, auth entry, credit quote badges, canvas controller,
  and asset panel.
- Exposes the runtime on `window.AIStudio`.

Server boot path:

```text
server.js -> src/server/index.js -> createServer() / startServer()
```

Current server initialization:

- Validates runtime environment.
- Initializes SQLite and credit migrations.
- Attaches auth middleware.
- Mounts API routers for health, auth, credits, conversations, AI, uploads,
  assets, asset collections, and projects.
- Serves built assets from `dist` in production when available.

## Codebase Size Snapshot

Current source footprint, excluding `node_modules` and `dist`:

| Area | Files | Lines |
| --- | ---: | ---: |
| `src/client` | 298 | 39,385 |
| `src/server` | 80 | 14,349 |
| `styles` | 53 | 15,221 |
| `scripts` | 90 | 20,772 |

Largest files in the current source tree:

| Lines | Path |
| ---: | --- |
| 1,709 | `scripts/check-api-error-contract.js` |
| 1,607 | `src/client/features/workspace/chat/workflows/prompt-workflow.js` |
| 1,553 | `styles/legacy-theme-sync.css` |
| 1,479 | `scripts/check-generator-job-recovery.js` |
| 1,302 | `src/server/services/conversation-orchestrator.service.js` |
| 1,293 | `src/client/features/canvas/workflows/image-generator-workflow.js` |
| 1,282 | `scripts/check-canvas-menu-actions.js` |
| 1,124 | `styles/features/assets-pinterest.css` |
| 1,120 | `src/client/features/canvas/workflows/canvas-menu-actions.js` |
| 1,112 | `scripts/check-library-bulk-select.js` |
| 948 | `scripts/check-prompt-conversation-event-utils.js` |
| 823 | `styles/features/auth.css` |
| 819 | `src/client/features/workspace/asset-library/asset-library-runtime.js` |
| 810 | `src/server/services/ai-job.service.js` |
| 781 | `src/client/features/canvas/model-viewer.js` |
| 779 | `styles/legacy-chat.css` |
| 716 | `styles/legacy-canvas-visual.css` |
| 716 | `styles/legacy-canvas.css` |

Post-baseline CSS governance note:

- `styles/legacy-assets.css` was later split into `styles/features/assets.css`,
  removed from the active CSS import graph, and deleted after static and
  check-script verification.
- `styles/legacy-base.css` was reduced to a compatibility shim after duplicate
  imports of `legacy-canvas.css`, `legacy-node.css`, and `legacy-chat.css` were
  removed; `scripts/check-style-entry.js` now guards that it stays import-free.
- `scripts/check-style-entry.js` now guards key selectors in
  `legacy-canvas.css`, `legacy-chat.css`, and feature CSS modules; the node
  selector guards now track migrated node selectors in
  `styles/features/node-base.css`, `styles/features/node-image-edit.css`,
  `styles/features/node-state.css`, `styles/features/node-image-toolbar.css`,
  `styles/features/node-image-panels.css`, `styles/features/node-stack.css`,
  `styles/features/node-director.css`, `styles/features/node-media.css`,
  `styles/features/node-generation.css`, `styles/features/node-image-generator.css`,
  `styles/features/node-preview.css`, and `styles/features/node.css` so later
  feature CSS migrations have a static safety net before visual smoke checks.
  `legacy-node.css` is currently a compatibility shim with no active selector
  ownership and is intentionally outside the active `legacy-split.css` import
  graph.
- `styles/features/chat.css` now owns the conversation history popover styles
  that were moved out of `styles/legacy-chat.css`; the selector guard tracks
  the migrated chat rules in their feature file.
- `styles/features/assets-page.css` owns floating asset library shell, upload
  button/list basics, asset page shell, and first-pass Pinterest-style asset
  page overview styles; it is imported by `styles/features/assets.css`.
- `styles/features/assets-board.css` owns asset board/list/card/thumb,
  move/delete action, and empty-state styles; it is imported by
  `styles/features/assets.css`.
- `styles/features/assets-save.css` owns asset save popover and canvas asset
  board popover styles; it is imported by `styles/features/assets.css`.
- `styles/features/assets-picker.css` owns asset picker modal and asset preview
  overlay styles; it is imported by `styles/features/assets.css`.
- `styles/features/assets-canvas-picker.css` owns canvas project picker overlay
  styles for asset insertion; it is imported by `styles/features/assets.css`.
- `styles/features/assets-context-menu.css` owns asset page card context menu
  styles; it is imported by `styles/features/assets.css`.
- `styles/features/assets-pinterest.css` owns asset page Pinterest layout,
  board/masonry/pin, selection bar, and asset page interaction refinement
  styles; it is imported by `styles/features/assets.css`.
- `styles/features/assets.css` is now an asset feature CSS aggregation entry for
  asset submodules.
- `styles/features/home-history.css` owns home recent project/history stack,
  grid, card, thumbnail, and delete-control styles; it is imported by
  `styles/features/home.css`.
- `styles/features/home-community.css` owns home community channels, masonry
  feed, back-to-top control, inspiration grid, and placeholder sweep animation
  styles; it is imported by `styles/features/home.css`.
- `styles/features/home-shell.css` owns home boot skeleton, shell, prompt,
  upload preview, model picker, send control, and home/canvas transition
  animation styles; it is imported by `styles/features/home.css`.
- `styles/features/home.css` is now a home feature CSS aggregation entry plus
  responsive overrides for home submodules.
- `styles/legacy-theme-sync-base.css` owns root light/dark theme variables,
  dark canvas background, and the light/dark theme switch styles; it is
  imported by `styles/legacy-theme-sync.css`.
- `styles/legacy-theme-sync.css` now imports the theme sync base submodule
  before the remaining cross-component theme surface synchronization rules.
- `styles/legacy-canvas-shell.css` owns the first canvas shell block that was
  moved out of `styles/legacy-canvas.css`: canvas area background, project
  header/logo, top actions, tool rail, add-node menu, canvas context menu, and
  selection action bar styles.
- `styles/legacy-canvas-image-edit.css` owns image edit popover and image
  generator popover control styles that were moved out of
  `styles/legacy-canvas.css`.
- `styles/legacy-canvas-add-node.css` owns add-node menu detail styles and
  canvas-view add-node menu overrides that were moved out of
  `styles/legacy-canvas.css`.
- `styles/legacy-canvas.css` now imports `styles/legacy-canvas-shell.css`,
  `styles/legacy-canvas-image-edit.css`, and
  `styles/legacy-canvas-add-node.css` before the remaining legacy canvas styles
  to preserve cascade order.
- `styles/features/node-base.css` owns base node/card/resize/action styles that
  were moved out of `styles/legacy-node.css`; it is imported at the top of
  `styles/features/node.css` to preserve cascade order.
- `styles/features/node-image-edit.css` owns crop controls, expand controls, and
  crop/expand edit-state visibility suppression; it is imported by
  `styles/features/node.css` immediately after node base styles to preserve the
  previous cascade position.
- `styles/features/node-state.css` owns generic node zoom/selected/source/label
  state styles; it is imported before image toolbar styles to preserve the
  previous cascade position.
- `styles/features/node-image-toolbar.css` owns image node toolbar, toolbar menu,
  upscale controls, and canvas asset savebar styles.
- `styles/features/node-image-panels.css` owns image text panel and image
  lightbox styles.
- `styles/features/node-stack.css` owns stack/folded node styles.
- `styles/features/node-director.css` owns director node styles.
- `styles/features/node-media.css` owns image/video/model node shell, image
  frame, and video file preview styles.
- `styles/features/node-generation.css` owns temporary generation preview frame
  and shimmer animation styles.
- `styles/features/node-image-generator.css` owns image generator node
  frame/panel styles and tail-end node generator inline edit controls.
- `styles/features/node-preview.css` owns media/model/video preview helper,
  cube preview, and bottom control styles.
- `styles/features/node.css` is now a feature CSS aggregation entry for node
  submodules.
- The inactive AI Core runtime and its legacy style modules were removed after
  dead-code audit evidence and check/build verification; `legacy-split.css` no
  longer imports `legacy-ai-core*.css`.
- `prompt-input-utils.js` now owns prompt submit attachment source resolution
  and submit debug payload building for composer files, pending home files, DOM
  previews, and debug source labels; `scripts/check-prompt-input-utils.js`
  guards the extracted behavior.

## Static Reachability Snapshot

Static ESM import graph from `app.js` and `server.js`:

- JavaScript files scanned by `npm run check`: 470
- Client modules reachable from startup: 378
- Static client unreachable candidates: 0

The previous static unreachable client candidates were resolved or retained
through later governance work. Future deletion candidates must still be audited
with static references, runtime/check-script verification, and a rollback point.

CSS reachability from `styles.css` previously showed almost all CSS loaded via
imports, with `styles/legacy.css` as a low-risk unused shim candidate. Deleting
any CSS must be verified visually because class reachability is not captured by
ESM import analysis.

## SaaS Foundation Status

Already present:

- Auth/session foundation with protected routes and `req.auth.user`.
- Workspace, project, snapshot, asset, conversation, AI job, credit transaction,
  and model pricing tables.
- Health endpoint with database integrity information.
- Production environment checks for base URL, mock provider flags, Railway
  volume paths, DB path, and upload path.
- Basic security headers and protected upload serving.
- Provider seams for AI model services.

Known release-readiness gaps:

- CSP still allows `unsafe-inline`; production CSP no longer allows
  `unsafe-eval`, `connect-src http:`, `img-src http:`, or `media-src http:`,
  while development/test paths may keep broader allowances for tooling
  compatibility.
- Rate limiting uses an in-memory Map, which is not suitable for multi-instance
  production.
- Uploads are local filesystem based; future SaaS release should use an object
  storage adapter.
- AI job handling needs a durable queue/worker seam before higher-scale use.
- Billing currently has credit ledger foundations but no external payment/order
  provider seam.
- API input validation and response schemas are not centralized.
- Automated tests are mostly script-based checks rather than a full API/UI test
  suite.

## Governance Priorities

1. Baseline and verification: keep this document current while preserving
   behavior.
2. Publish blockers: fix source encoding/copy corruption without changing UI
   intent or interaction.
3. Frontend boundary cleanup: reduce compatibility bridge reliance and pure
   forwarding modules only after proving replacement paths.
4. Style governance: move legacy CSS by feature while preserving rendered output.
5. Backend extension seams: add adapters for storage, rate limit, job queue,
   billing, and audit logging without enabling new product capabilities.
6. Performance and package size: lazy-load heavy optional surfaces such as 3D and
   video workflows when behavior can be kept identical.
7. Tests and release gates: expand automated coverage around existing behavior.
