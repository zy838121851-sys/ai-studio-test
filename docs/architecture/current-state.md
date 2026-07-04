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
| `src/client` | 298 | 36,815 |
| `src/server` | 80 | 13,381 |
| `styles` | 28 | 13,292 |
| `scripts` | 90 | 18,837 |

Largest files in the current source tree:

| Lines | Path |
| ---: | --- |
| 2,273 | `styles/features/assets.css` |
| 2,045 | `styles/legacy-node.css` |
| 1,608 | `scripts/check-api-error-contract.js` |
| 1,569 | `src/client/features/workspace/chat/workflows/prompt-workflow.js` |
| 1,529 | `styles/legacy-theme-sync.css` |
| 1,503 | `styles/legacy-canvas.css` |
| 1,446 | `scripts/check-generator-job-recovery.js` |
| 1,303 | `styles/features/home.css` |
| 1,252 | `src/server/services/conversation-orchestrator.service.js` |
| 1,214 | `scripts/check-canvas-menu-actions.js` |
| 1,203 | `src/client/features/canvas/workflows/image-generator-workflow.js` |
| 1,065 | `scripts/check-library-bulk-select.js` |

Post-baseline CSS governance note:

- `styles/legacy-assets.css` was later split into `styles/features/assets.css`,
  removed from the active CSS import graph, and deleted after static and
  check-script verification.
- `styles/legacy-base.css` was reduced to a compatibility shim after duplicate
  imports of `legacy-canvas.css`, `legacy-node.css`, and `legacy-chat.css` were
  removed; `scripts/check-style-entry.js` now guards that it stays import-free.
- `scripts/check-style-entry.js` now guards key selectors in
  `legacy-canvas.css`, `legacy-node.css`, and `legacy-chat.css` so later
  feature CSS migrations have a static safety net before visual smoke checks.
- `styles/features/chat.css` now owns the conversation history popover styles
  that were moved out of `styles/legacy-chat.css`; the selector guard tracks
  the migrated chat rules in their feature file.
- `styles/features/node.css` now owns tail-end node generator inline edit
  controls plus media/model/video preview helpers that were moved out of
  `styles/legacy-node.css`; it is imported immediately after `legacy-node.css`
  to preserve cascade order.
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
