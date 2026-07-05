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
| `src/client` | 298 | 39,683 |
| `src/server` | 80 | 14,430 |
| `styles` | 140 | 15,391 |
| `scripts` | 90 | 21,558 |

Largest files in the current source tree:

| Lines | Path |
| ---: | --- |
| 1,710 | `scripts/check-api-error-contract.js` |
| 1,608 | `src/client/features/workspace/chat/workflows/prompt-workflow.js` |
| 1,480 | `scripts/check-generator-job-recovery.js` |
| 1,303 | `src/server/services/conversation-orchestrator.service.js` |
| 1,294 | `src/client/features/canvas/workflows/image-generator-workflow.js` |
| 1,283 | `scripts/check-canvas-menu-actions.js` |
| 1,249 | `scripts/check-style-entry.js` |
| 1,121 | `src/client/features/canvas/workflows/canvas-menu-actions.js` |
| 1,119 | `scripts/check-library-bulk-select.js` |
| 949 | `scripts/check-prompt-conversation-event-utils.js` |
| 820 | `src/client/features/workspace/asset-library/asset-library-runtime.js` |
| 811 | `src/server/services/ai-job.service.js` |
| 782 | `src/client/features/canvas/model-viewer.js` |
| 709 | `src/client/features/workspace/asset-library/asset-panel.js` |
| 706 | `src/server/services/asset.service.js` |
| 704 | `src/client/features/canvas/node-controls.js` |
| 702 | `src/client/features/projects/workflows/project-workflow.js` |
| 676 | `scripts/check-project-snapshot.js` |

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
  `styles/features/node-image-toolbar-base.css`,
  `styles/features/node-image-toolbar-upscale.css`,
  `styles/features/node-image-toolbar-menu.css`,
  `styles/features/node-image-toolbar-savebar.css`,
  `styles/features/node-image-panels.css`,
  `styles/features/node-image-text-panel.css`,
  `styles/features/node-image-lightbox.css`, `styles/features/node-stack.css`,
  `styles/features/node-stack-base.css`, `styles/features/node-stack-tray.css`,
  `styles/features/node-director.css`, `styles/features/node-media.css`,
  `styles/features/node-media-shell.css`, `styles/features/node-media-video.css`,
  `styles/features/node-media-frame.css`,
  `styles/features/node-generation.css`, `styles/features/node-image-generator.css`,
  `styles/features/node-preview.css`, `styles/features/node.css`,
  `styles/features/project-library-shell.css`,
  `styles/features/project-library-cards.css`, and
  `styles/features/project-library-page.css`,
  `styles/features/home-community-channels.css`,
  `styles/features/home-community-feed.css`, and
  `styles/features/home-community-inspiration.css`,
  `styles/features/home-shell-boot.css`,
  `styles/features/home-shell-prompt.css`,
  `styles/features/home-shell-model.css`, and
  `styles/features/home-shell-transition.css` so later feature CSS migrations
  have a static safety net before visual smoke checks.
  `legacy-node.css` is currently a compatibility shim with no active selector
  ownership and is intentionally outside the active `legacy-split.css` import
  graph.
- `styles/features/chat.css` now owns the conversation history popover styles
  that were moved out of `styles/legacy-chat.css`; the selector guard tracks
  the migrated chat rules in their feature file.
- `styles/legacy-chat-shell.css` owns chat panel shell, floating chat button,
  agent debug panel, window actions, welcome/suggestions, and chat log shell
  styles that were moved out of `styles/legacy-chat.css`; it is imported by
  `styles/legacy-chat.css`.
- `styles/legacy-chat-message.css` owns chat message, user message, thinking
  message, loading indicator/animation, and image message styles that were
  moved out of `styles/legacy-chat.css`; it is imported by
  `styles/legacy-chat.css`.
- `styles/legacy-chat-responsive.css` owns the chat-related responsive override
  blocks that were moved out of `styles/legacy-chat.css`; it is imported by
  `styles/legacy-chat.css`.
- `styles/legacy-chat-agent.css` owns agent UI blocks, analysis/result cards,
  prompt details, assistant summary, task status, feedback button styles, and
  agent summary pseudo-element content moved out of `styles/legacy-chat.css`.
- `styles/legacy-chat-composer.css` owns composer layout, chat upload/model
  controls, chat image preview, send button styles, drag-over pseudo-element
  content, and preview close pseudo-element styles moved out of
  `styles/legacy-chat.css`.
- `styles/legacy-chat.css` is now a pure aggregation entry for chat shell,
  message, responsive, agent, and composer submodules.
- `styles/legacy-compact-project-menu.css` owns compact project header and
  project menu styles moved out of `styles/legacy-compact-controls.css`; it is
  imported by `styles/legacy-compact-controls.css`.
- `styles/legacy-compact-tool-rail.css` owns compact tool rail, rail item,
  rail button, rail separator, and light-theme rail polish styles moved out of
  `styles/legacy-compact-controls.css`; it is imported by
  `styles/legacy-compact-controls.css`.
- `styles/legacy-compact-bottom-controls.css` owns bottom controls,
  zoom stepper, history controls, and light-theme glass control polish moved
  out of `styles/legacy-compact-controls.css`; `styles/legacy-compact-controls.css`
  is now a pure aggregation entry for compact project menu, tool rail, and
  bottom controls styles.
- `styles/features/auth-account.css` owns auth entry, authenticated avatar
  button, account popover, points row, and account menu styles; it is imported
  by `styles/features/auth.css`.
- `styles/features/auth-credit-detail.css` owns credit detail dialog, profile,
  info, transaction, empty/status, and responsive credit detail styles moved
  out of `styles/features/auth.css`.
- `styles/features/auth-dialog.css` owns login/auth dialog, WeChat panel, QR,
  icon methods, mode switch, auth form, message, and submit styles moved out
  of `styles/features/auth.css`.
- `styles/features/auth.css` is now a pure aggregation entry for auth account,
  credit detail, and auth dialog submodules.
- `styles/features/assets-page.css` is now a pure aggregation entry for
  floating asset library, asset page view, and first-pass Pinterest-style
  legacy asset page styles; it is imported by `styles/features/assets.css`.
- `styles/features/assets-floating-library.css` owns the floating asset library
  shell, upload button, and asset list basics.
- `styles/features/assets-page-view.css` owns asset page toolbar/list and
  `body[data-view="assetsPage"]` page-view overrides.
- `styles/features/assets-page-pinterest-legacy.css` owns first-pass
  Pinterest-style asset page overview styles that predate the refreshed
  `styles/features/assets-pinterest.css` submodules.
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
- `styles/features/assets-pinterest-board.css` owns the first asset page
  Pinterest board, masonry, pin, delete, empty, floating library item, and
  responsive foundation block; it is imported by
  `styles/features/assets-pinterest.css`.
- `styles/features/assets-pinterest-shell.css` owns asset page Pinterest refresh
  shell, profile heading, upload CTA, stats, tabs, section title, and back
  control styles; it is imported by `styles/features/assets-pinterest.css`.
- `styles/features/assets-pinterest-board-refresh.css` owns asset page
  Pinterest refresh board grid, board cover count variants, cover cells,
  create-card, board title, and board delete styles; it is imported by
  `styles/features/assets-pinterest.css`.
- `styles/features/assets-pinterest-pin.css` owns asset page Pinterest
  pin/card thumbnail, selection check, placeholder, metadata, actions, delete,
  and empty-state styles; it is imported by
  `styles/features/assets-pinterest.css`.
- `styles/features/assets-pinterest-layout.css` owns asset page Pinterest
  masonry and selection bar styles; it is imported by
  `styles/features/assets-pinterest.css`.
- `styles/features/assets-pinterest-responsive.css` owns asset page Pinterest
  responsive rules and interaction refinement styles; it is imported by
  `styles/features/assets-pinterest.css`.
- `styles/features/assets-pinterest.css` is now a pure aggregation entry for
  asset page Pinterest submodules; it imports
  `styles/features/assets-pinterest-board.css` and
  `styles/features/assets-pinterest-shell.css`, and
  `styles/features/assets-pinterest-board-refresh.css`, and
  `styles/features/assets-pinterest-pin.css`, and
  `styles/features/assets-pinterest-layout.css`, and
  `styles/features/assets-pinterest-responsive.css`, and is imported by
  `styles/features/assets.css`.
- `styles/features/assets.css` is now an asset feature CSS aggregation entry for
  asset submodules.
- `styles/features/home-history.css` is now a pure aggregation entry for home
  history stack, section header, and recent project card styles; it is imported
  by `styles/features/home.css`.
- `styles/features/home-history-stack.css` owns the home recent project/history
  stack, trigger, layered thumbnails, and open affordance styles.
- `styles/features/home-history-section.css` owns home history section header
  and section navigation styles.
- `styles/features/home-history-cards.css` owns home history grid, card,
  thumbnail, preview fallback, create-card, and delete-control styles.
- `styles/features/home-community.css` is now a pure aggregation entry for home
  community channel, feed, and inspiration submodules.
- `styles/features/home-community-channels.css` owns home community section,
  channel shell, channel strip, tone swatches, and channel scroll controls.
- `styles/features/home-community-feed.css` owns the home masonry feed,
  placeholder sweep animation, loading state, and back-to-top control.
- `styles/features/home-community-inspiration.css` owns home inspiration grid
  and inspiration card styles.
- `styles/features/home-shell.css` is now a pure aggregation entry for home
  boot, prompt, model picker, and transition submodules.
- `styles/features/home-shell-boot.css` owns home boot/ready visibility and
  skeleton animation styles.
- `styles/features/home-shell-prompt.css` owns home stage, title, prompt shell,
  upload preview, input, and plus indicator styles.
- `styles/features/home-shell-model.css` owns home model picker, menu, native
  select, and model option styles.
- `styles/features/home-shell-transition.css` owns home send button and
  home-to-canvas transition animation styles.
- `styles/features/home.css` is now a home feature CSS aggregation entry plus
  responsive overrides for home submodules.
- `styles/features/project-library.css` is now a pure aggregation entry for
  project library shell, cards, and page-view override styles.
- `styles/features/project-library-shell.css` owns project library shell, title,
  grid, header, selection bar, and empty-state styles.
- `styles/features/project-library-cards.css` owns project library board, card,
  selection check, new-card, thumbnail, and base responsive styles.
- `styles/features/project-library-page.css` owns `body[data-view="library"]`
  project library page overrides, mobile overrides, and library entry
  animation.
- `styles/legacy-theme-sync-base.css` owns root light/dark theme variables,
  dark canvas background, and the light/dark theme switch styles; it is
  imported by `styles/legacy-theme-sync.css`.
- `styles/legacy-theme-sync-surfaces.css` owns the first cross-component theme
  surface/control synchronization block for canvas chrome, edit controls, asset
  generation controls, composer, and chat panel surfaces.
- `styles/legacy-theme-sync-image-edit.css` owns image edit popover and image
  generator control theme synchronization styles that were moved out of
  `styles/legacy-theme-sync.css`.
- `styles/legacy-theme-sync-crop-expand.css` owns primary action button,
  crop action, and image expand action theme synchronization styles that were
  moved out of `styles/legacy-theme-sync.css`.
- `styles/legacy-theme-sync-media-edit.css` owns secondary menu separator,
  shared textarea, edit reference, crop overlay, image expand overlay, and
  image lightbox theme synchronization styles that were moved out of
  `styles/legacy-theme-sync.css`.
- `styles/legacy-theme-sync-node-media.css` is now a pure aggregation entry for
  node/card, AI/generation, and canvas media theme synchronization submodules.
- `styles/legacy-theme-sync-node-media-card.css` owns dark node/card, generated
  card, asset generation card, message, and form control theme synchronization.
- `styles/legacy-theme-sync-node-media-ai.css` owns generation choice, AI
  suggestion/result/thinking/progress, director, stack row/toggle, source badge,
  model viewer, image frame, generation frame, and thinking/image message theme
  surfaces.
- `styles/legacy-theme-sync-node-media-canvas.css` owns canvas media node
  transparent-frame polish, resize handle placement, loading-image generation
  frame theme polish, node group z-index, and stack drop-target overrides.
- `styles/legacy-theme-sync-compact-select.css` owns compact select base,
  image-edit compact select, composer compact select, responsive compact
  select, and compact select option state styles that were moved out of
  `styles/legacy-theme-sync.css`.
- `styles/legacy-theme-sync-model-preference.css` is now a pure aggregation
  entry for model preference menu, panel, and color-fix submodules.
- `styles/legacy-theme-sync-model-preference-menu.css` owns model preference
  menu placement, chat model menu sizing, composer/image edit placement, and
  image generator model menu shell styles.
- `styles/legacy-theme-sync-model-preference-panel.css` owns model preference
  panel, header, auto toggle, tabs, list, option, state, description, tag, and
  empty-state styles.
- `styles/legacy-theme-sync-model-preference-color-fix.css` owns generator
  select option and compact select option text color-fix theme styles.
- `styles/legacy-theme-sync-credit-submit.css` owns credit submit button, cost,
  bolt, number, hidden, and quote-error theme synchronization styles that were
  moved out of `styles/legacy-theme-sync.css`.
- `styles/legacy-theme-sync.css` is now a pure aggregation entry that imports
  the theme sync base, surfaces, image edit, crop expand, media edit, node
  media, compact select, model preference, and credit submit submodules.
- `styles/legacy-canvas-shell.css` is now a pure aggregation entry for legacy
  canvas shell brand, action, tool rail, menu, and selection submodules.
- `styles/legacy-canvas-shell-brand.css` owns canvas area background,
  project header, and legacy logo mark styles.
- `styles/legacy-canvas-shell-actions.css` owns legacy canvas top actions and
  shared glass action surface styles.
- `styles/legacy-canvas-shell-tool-rail.css` owns legacy canvas tool rail,
  rail main/action/separator, and jump rail button styles.
- `styles/legacy-canvas-shell-menus.css` owns add-node menu shell and canvas
  context menu/submenu/color panel styles.
- `styles/legacy-canvas-shell-selection.css` owns selection action bar, action
  button, swatch, and mobile selection-bar override styles.
- `styles/legacy-canvas-image-edit.css` is now a pure aggregation entry for
  image edit popover, generator select, compact select, and footer/reference
  styles that were moved out of `styles/legacy-canvas.css`.
- `styles/legacy-canvas-image-edit-popover.css` owns image edit popover shell,
  head, reference thumbnails, textarea, base action controls, and
  edit/generator model/size/count field sizing.
- `styles/legacy-canvas-image-edit-generator-select.css` owns image generator
  custom select wrapper, trigger, menu, and option styles.
- `styles/legacy-canvas-image-edit-compact-select.css` owns compact select
  sizing and option styles inside the image edit popover.
- `styles/legacy-canvas-image-edit-footer.css` owns generator select
  hover/selected state, cancel/send controls, generator reference list/thumbs,
  expanded panel rows, and responsive edit action overrides.
- `styles/legacy-canvas-add-node.css` owns add-node menu detail styles and
  canvas-view add-node menu overrides that were moved out of
  `styles/legacy-canvas.css`.
- `styles/legacy-canvas-choice-overlays.css` owns canvas viewport cursor states,
  upload choice bubbles, generation choice overlay, floating suggestions, and
  their related keyframes.
- `styles/legacy-canvas-world.css` owns canvas selection box, canvas world,
  empty state, hint line, and quick action styles that were moved out of
  `styles/legacy-canvas.css`.
- `styles/legacy-canvas-video-generator.css` owns video generator popover,
  reference list/thumb, model selector, option group, send control, disabled
  state, and status styles that were moved out of `styles/legacy-canvas.css`.
- `styles/legacy-canvas-project-header.css` owns canvas-view project header,
  project title editing states, save-status badge states, and return-to-content
  control styles that were moved out of `styles/legacy-canvas.css`.
- `styles/legacy-canvas-library.css` owns library head styles that were moved
  out of `styles/legacy-canvas.css`.
- `styles/legacy-canvas.css` now imports `styles/legacy-canvas-shell.css`,
  `styles/legacy-canvas-image-edit.css`, and
  `styles/legacy-canvas-add-node.css`, and
  `styles/legacy-canvas-choice-overlays.css`, and
  `styles/legacy-canvas-world.css`, and
  `styles/legacy-canvas-video-generator.css`, and
  `styles/legacy-canvas-project-header.css`, and
  `styles/legacy-canvas-library.css` as a pure aggregation entry to preserve
  cascade order.
- `styles/legacy-canvas-visual-shape-tools.css` is now a pure aggregation entry
  for canvas selection/draw, text editor, shape toolbar, and text toolbar
  visual submodules.
- `styles/legacy-canvas-visual-selection-draw.css` owns canvas object selected
  visuals, resize handle polish, draw-node, and draw-shape visuals.
- `styles/legacy-canvas-visual-text-editor.css` owns canvas text node/editor,
  text editing state, placeholder, focus, and shape text editor styles.
- `styles/legacy-canvas-visual-shape-toolbar.css` owns shape format toolbar,
  shape swatches, shape color popover/spectrum/tokens, and stroke width control.
- `styles/legacy-canvas-visual-text-toolbar.css` owns canvas text format
  toolbar, select/button controls, and text color picker styles.
- `styles/legacy-canvas-visual.css` now imports
  `styles/legacy-canvas-visual-shape-tools.css` and
  `styles/legacy-canvas-visual-media.css` and
  `styles/legacy-canvas-visual-shell.css` as a pure aggregation entry to
  preserve cascade order.
- `styles/legacy-canvas-visual-media.css` owns canvas area/world background
  polish, image/model/loading-image transparent frame polish, and resize handle
  placement styles that were moved out of `styles/legacy-canvas-visual.css`.
- `styles/legacy-canvas-visual-shell.css` owns brand mark/menu, home side menu,
  and simple page visual polish styles that were moved out of
  `styles/legacy-canvas-visual.css`.
- `styles/features/node-base.css` owns base node/card/resize/action styles that
  were moved out of `styles/legacy-node.css`; it is imported at the top of
  `styles/features/node.css` to preserve cascade order.
- `styles/features/node-image-edit.css` is now a pure aggregation entry for
  image edit state, crop, and expand styles; it is imported by
  `styles/features/node.css` immediately after node base styles to preserve the
  previous cascade position.
- `styles/features/node-image-edit-state.css` owns crop/expand z-index and
  toolbar, savebar, download, expand, resize-handle, and multi-selection
  visibility suppression.
- `styles/features/node-image-crop.css` owns crop overlay, crop box, crop
  handles, and crop action controls.
- `styles/features/node-image-expand.css` owns image expand overlay, source
  frame, expand handles, prompt field, action row, and confirming state styles.
- `styles/features/node-state.css` owns generic node zoom/selected/source/label
  state styles; it is imported before image toolbar styles to preserve the
  previous cascade position.
- `styles/features/node-image-toolbar.css` is now a pure aggregation entry for
  image toolbar base, upscale controls, and menu styles.
- `styles/features/node-image-toolbar-base.css` owns image toolbar shell,
  initial menu defaults, button base styles, and main toolbar layout styles.
- `styles/features/node-image-toolbar-upscale.css` owns image toolbar upscale
  mode, size option, and generate button styles.
- `styles/features/node-image-toolbar-menu.css` owns image toolbar icon/label,
  compare, separator, menu card, upscale option card, and dark menu styles.
- `styles/features/node-image-toolbar-savebar.css` owns canvas asset savebar,
  asset board select, and save submit styles; it is imported immediately after
  `styles/features/node-image-toolbar.css`.
- `styles/features/node-image-panels.css` is now a pure aggregation entry for
  image text panel and image lightbox styles.
- `styles/features/node-image-text-panel.css` owns image text edit panel,
  status, editable input list, footer actions, and loading apply state styles.
- `styles/features/node-image-lightbox.css` owns image lightbox overlay, figure,
  image, caption, and close button styles.
- `styles/features/node-stack.css` is now a pure aggregation entry for stack
  base and tray styles.
- `styles/features/node-stack-base.css` owns stack hidden/member state, stacked
  card depth shadows, drop target state, and stack toggle styles.
- `styles/features/node-stack-tray.css` owns stack tray, row, thumbnail, title,
  and metadata styles.
- `styles/features/node-director.css` owns director node styles.
- `styles/features/node-media.css` is now a pure aggregation entry for media
  shell, video preview, and media frame styles.
- `styles/features/node-media-shell.css` owns 2D, 3D, image, model, video, and
  loading-image node shell styles.
- `styles/features/node-media-video.css` owns video node selected state, hidden
  node text, and video file preview styles.
- `styles/features/node-media-frame.css` owns image/model selected frame outline,
  image filename, image frame, and image drag suppression styles.
- `styles/features/node-generation.css` owns temporary generation preview frame
  and shimmer animation styles.
- `styles/features/node-image-generator-base.css` is now a pure aggregation
  entry for image generator shell, panel, and light glass override styles.
- `styles/features/node-image-generator-shell.css` owns base image generator
  node, head, frame, result, loading, initial panel, textarea, action, and
  drop-active styles.
- `styles/features/node-image-generator-panel.css` owns refreshed image
  generator panel layout, reference list, model/cancel controls, submit button,
  and disabled states.
- `styles/features/node-image-generator-glass.css` owns the light glass visual
  alignment overrides for the image generator node, frame, panel, controls, and
  drop-active state.
- `styles/features/node-image-generator-inline-edit.css` owns image generator
  inline edit popover, edit action grid, inline submit, and responsive edit
  action styles moved out of `styles/features/node-image-generator.css`.
- `styles/features/node-image-generator.css` is now a pure aggregation entry
  for image generator base and inline edit submodules.
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
