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
| `src/client` | 300 | 39,438 |
| `src/server` | 80 | 14,350 |
| `styles` | 207 | 15,279 |
| `scripts` | 93 | 22,137 |

Largest files in the current source tree:

| Lines | Path |
| ---: | --- |
| 1,779 | `scripts/check-style-entry.js` |
| 1,709 | `scripts/check-api-error-contract.js` |
| 1,606 | `src/client/features/workspace/chat/workflows/prompt-workflow.js` |
| 1,479 | `scripts/check-generator-job-recovery.js` |
| 1,302 | `src/server/services/conversation-orchestrator.service.js` |
| 1,295 | `src/client/features/canvas/workflows/image-generator-workflow.js` |
| 1,282 | `scripts/check-canvas-menu-actions.js` |
| 1,120 | `src/client/features/canvas/workflows/canvas-menu-actions.js` |
| 1,118 | `scripts/check-library-bulk-select.js` |
| 948 | `scripts/check-prompt-conversation-event-utils.js` |
| 819 | `src/client/features/workspace/asset-library/asset-library-runtime.js` |
| 810 | `src/server/services/ai-job.service.js` |
| 781 | `src/client/features/canvas/model-viewer.js` |
| 708 | `src/client/features/workspace/asset-library/asset-panel.js` |
| 705 | `src/server/services/asset.service.js` |
| 703 | `src/client/features/canvas/node-controls.js` |
| 701 | `src/client/features/projects/workflows/project-workflow.js` |
| 675 | `scripts/check-project-snapshot.js` |

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
- `styles/features/chat.css` is now a pure aggregation entry for conversation
  history popover shell, list, and item submodules.
- `styles/features/chat-history-popover-shell.css` owns conversation history
  popover shell, hidden state, and heading styles.
- `styles/features/chat-history-popover-list.css` owns conversation history
  list and empty-state text styles.
- `styles/features/chat-history-popover-item.css` owns conversation history
  item, active/hover state, metadata, and truncation styles.
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
- `styles/legacy-theme-ios.css` is now a pure aggregation entry for iOS glass
  theme base, chrome, node/media, and chat/composer submodules.
- `styles/legacy-theme-ios-base.css` owns iOS glass light-theme variables,
  page/app background, and canvas background overlays.
- `styles/legacy-theme-ios-chrome.css` owns iOS glass chrome surfaces and
  controls for project/header/top actions/tool rail/bottom controls/add-node,
  context menu, and image-edit surfaces.
- `styles/legacy-theme-ios-node-media.css` owns iOS glass canvas viewport
  hints, node/generated/media cards, selected state, labels, 3D/video preview,
  face, and play styles.
- `styles/legacy-theme-ios-chat-composer.css` owns iOS glass chat panel,
  messages, composer/input, chat image preview, and light color-scheme styles.
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
- `styles/features/assets-page-pinterest-legacy.css` is now a pure aggregation
  entry for first-pass Pinterest-style legacy asset page submodules that
  predate the refreshed `styles/features/assets-pinterest.css` submodules.
- `styles/features/assets-page-pinterest-shell-legacy.css` owns first-pass
  Pinterest-style legacy asset page shell, profile, tabs, and active tab
  indicator styles.
- `styles/features/assets-page-pinterest-board-legacy.css` owns first-pass
  Pinterest-style legacy board grid, cover, create tile, metadata, action, and
  section title styles.
- `styles/features/assets-page-pinterest-pin-legacy.css` owns first-pass
  Pinterest-style legacy masonry, pin/card thumbnail, metadata, action, and
  empty-state styles.
- `styles/features/assets-page-pinterest-responsive-legacy.css` owns first-pass
  Pinterest-style legacy responsive overrides.
- `styles/features/assets-board.css` is now a pure aggregation entry for asset
  board shell, board card, and asset item submodules; it is imported by
  `styles/features/assets.css`.
- `styles/features/assets-board-shell.css` owns asset board bar, board chip,
  create control, and board list styles.
- `styles/features/assets-board-card.css` owns asset board card, cover, main
  text, board action, and move action hover styles.
- `styles/features/assets-board-item.css` owns asset item, thumb, type variants,
  delete/move controls, and empty-state styles.
- `styles/features/assets-save.css` is now a pure aggregation entry for asset
  save popover and canvas asset board popover submodules.
- `styles/features/assets-save-popover.css` is now a pure aggregation entry for
  the asset save popover shell and folder/action list submodules.
- `styles/features/assets-save-popover-shell.css` owns the asset save popover
  shell, title, folder icon, create action, and tabs.
- `styles/features/assets-save-popover-list.css` owns the asset save popover
  folder list, chevron/folder rows, and submit/cancel controls.
- `styles/features/assets-save-board-popover.css` is now a pure aggregation
  entry for the canvas asset board popover shell, list, and new-board control
  submodules.
- `styles/features/assets-save-board-popover-shell.css` owns the canvas asset
  board popover shell and search field styles.
- `styles/features/assets-save-board-popover-list.css` owns the canvas asset
  board popover list, section, row, and board thumbnail styles.
- `styles/features/assets-save-board-popover-new.css` owns the canvas asset
  board popover new-board control styles.
- `styles/features/assets-picker.css` is now a pure aggregation entry for asset
  picker popover, list, and preview overlay submodules; it is imported by
  `styles/features/assets.css`.
- `styles/features/assets-picker-popover.css` is now a pure aggregation entry
  for asset picker modal shell and header/list container submodules.
- `styles/features/assets-picker-popover-shell.css` owns asset picker modal
  shell, backdrop, and card styles.
- `styles/features/assets-picker-popover-head.css` owns asset picker modal
  header and scrollable list container styles.
- `styles/features/assets-picker-list.css` is now a pure aggregation entry for
  asset picker item/metadata and empty-state submodules.
- `styles/features/assets-picker-list-item.css` owns asset picker item,
  thumbnail, and metadata styles.
- `styles/features/assets-picker-list-empty.css` owns asset picker empty-state
  styles.
- `styles/features/assets-picker-preview.css` is now a pure aggregation entry
  for asset preview overlay and dialog submodules.
- `styles/features/assets-picker-preview-overlay.css` owns asset preview overlay
  and backdrop styles.
- `styles/features/assets-picker-preview-dialog.css` owns asset preview dialog,
  image, title, and close control styles.
- `styles/features/assets-canvas-picker.css` is now a pure aggregation entry
  for canvas project picker shell and project row submodules; it is imported by
  `styles/features/assets.css`.
- `styles/features/assets-canvas-picker-shell.css` is now a pure aggregation
  entry for canvas project picker frame and header/list container submodules.
- `styles/features/assets-canvas-picker-shell-frame.css` owns canvas project
  picker overlay shell, backdrop, and card styles.
- `styles/features/assets-canvas-picker-shell-head.css` owns canvas project
  picker header, close control, and list container styles.
- `styles/features/assets-canvas-picker-projects.css` is now a pure aggregation
  entry for canvas project picker row/thumb and metadata/badge submodules.
- `styles/features/assets-canvas-picker-projects-row.css` owns canvas project
  picker project row, thumbnail, active, and hover styles.
- `styles/features/assets-canvas-picker-projects-meta.css` owns canvas project
  picker metadata and badge styles.
- `styles/features/assets-context-menu.css` is now a pure aggregation entry for
  asset page card context menu shell, item, and submenu submodules; it is
  imported by `styles/features/assets.css`.
- `styles/features/assets-context-menu-shell.css` owns asset page card context
  menu shell and hidden state styles.
- `styles/features/assets-context-menu-items.css` owns asset page card context
  menu button, icon, arrow, and danger state styles.
- `styles/features/assets-context-menu-submenu.css` owns asset page card context
  submenu shell and open-state styles.
- `styles/features/assets-pinterest-board.css` is now a pure aggregation entry
  for the first asset page Pinterest shell, board tiles, masonry pins, and
  responsive legacy submodules.
- `styles/features/assets-pinterest-board-shell-legacy.css` owns the first
  asset page Pinterest shell, profile, tabs, section title, and back control
  styles.
- `styles/features/assets-pinterest-board-tiles-legacy.css` owns the first
  asset page Pinterest board grid, cover, title, create tile, and delete
  styles.
- `styles/features/assets-pinterest-board-masonry-legacy.css` owns the first
  asset page Pinterest masonry, pin sizing/delete, empty state, and floating
  library item styles.
- `styles/features/assets-pinterest-board-responsive-legacy.css` owns the first
  asset page Pinterest responsive overrides.
- `styles/features/assets-pinterest-shell.css` is now a pure aggregation entry
  for asset page Pinterest shell header, stats, and navigation submodules; it
  is imported by `styles/features/assets-pinterest.css`.
- `styles/features/assets-pinterest-shell-header.css` owns asset page Pinterest
  refresh shell, profile heading, and upload CTA styles.
- `styles/features/assets-pinterest-shell-stats.css` owns asset page Pinterest
  stats grid, stat card, icon, and count styles.
- `styles/features/assets-pinterest-shell-nav.css` owns asset page Pinterest
  tabs, section title, and back control styles.
- `styles/features/assets-pinterest-board-refresh.css` is now a pure
  aggregation entry for asset page Pinterest refreshed board grid, create-card,
  and metadata submodules; it is imported by `styles/features/assets-pinterest.css`.
- `styles/features/assets-pinterest-board-refresh-grid.css` owns asset page
  Pinterest refreshed board grid, tile, cover count variants, cover cells, and
  empty cover styles.
- `styles/features/assets-pinterest-board-refresh-create.css` owns asset page
  Pinterest refreshed board create-card styles.
- `styles/features/assets-pinterest-board-refresh-meta.css` owns asset page
  Pinterest refreshed board title and delete control styles.
- `styles/features/assets-pinterest-pin.css` is now a pure aggregation entry
  for asset page Pinterest pin card, action, and empty-state submodules; it is
  imported by `styles/features/assets-pinterest.css`.
- `styles/features/assets-pinterest-pin-card.css` owns asset page Pinterest
  pin/card thumbnail, selection check, placeholder, and metadata styles.
- `styles/features/assets-pinterest-pin-actions.css` owns asset page Pinterest
  pin hover actions and delete action styles.
- `styles/features/assets-pinterest-pin-empty.css` owns asset page Pinterest
  empty-state mark, copy, and action styles.
- `styles/features/assets-pinterest-layout.css` owns asset page Pinterest
  masonry and selection bar styles; it is imported by
  `styles/features/assets-pinterest.css`.
- `styles/features/assets-pinterest-responsive.css` is now a pure aggregation
  entry for asset page Pinterest responsive breakpoints and interaction
  refinements; it is imported by `styles/features/assets-pinterest.css`.
- `styles/features/assets-pinterest-responsive-breakpoints.css` owns asset page
  Pinterest breakpoint rules.
- `styles/features/assets-pinterest-responsive-interactions.css` owns asset page
  Pinterest interaction refinement styles and responsive overrides that follow
  those refinements.
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
- `styles/features/home-history-stack.css` is now a pure aggregation entry for
  home recent project/history stack shell, preview, and open affordance
  submodules.
- `styles/features/home-history-stack-preview.css` is now a pure aggregation
  entry for stack preview shell, media, and empty-state submodules.
- `styles/features/home-history-stack-preview-shell.css` owns the home history
  stack preview frame and layered thumbnail shell styles.
- `styles/features/home-history-stack-preview-media.css` owns the stack preview
  image presentation styles.
- `styles/features/home-history-stack-preview-empty.css` owns the stack preview
  empty placeholder styles.
- `styles/features/home-history-stack-open.css` is now a pure aggregation entry
  for stack open affordance base and hover-state submodules.
- `styles/features/home-history-stack-open-base.css` owns the stack open pill
  and chevron styles.
- `styles/features/home-history-stack-open-state.css` owns the stack open hover
  reveal and first-thumbnail hover polish styles.
- `styles/features/home-history-section.css` is now a pure aggregation entry for
  home history section layout and head/navigation submodules.
- `styles/features/home-history-section-layout.css` owns the home history
  section positioning and sizing rules.
- `styles/features/home-history-section-head.css` is now a pure aggregation
  entry for home section heading, navigation, and history action submodules.
- `styles/features/home-history-section-head-base.css` owns the shared home
  section head layout, label, title, and generic button styles.
- `styles/features/home-history-section-head-nav.css` owns home section
  navigation pill styles.
- `styles/features/home-history-section-head-action.css` owns the recent
  project/history section title and action overrides.
- `styles/features/home-history-cards.css` is now a pure aggregation entry for
  home history card base, delete, preview, and metadata submodules.
- `styles/features/home-history-cards-base.css` is now a pure aggregation entry
  for card grid/layout, shell, and state submodules.
- `styles/features/home-history-cards-base-layout.css` owns the history card
  grid and card positioning styles.
- `styles/features/home-history-cards-base-shell.css` owns the history card
  button shell and create-card sizing styles.
- `styles/features/home-history-cards-base-state.css` owns history card
  removing and hover states.
- `styles/features/home-history-cards-delete.css` is now a pure aggregation
  entry for history card delete base, state, and icon submodules.
- `styles/features/home-history-cards-delete-base.css` owns the history card
  delete button shell styles.
- `styles/features/home-history-cards-delete-state.css` owns the history card
  delete reveal, focus, and hover states.
- `styles/features/home-history-cards-delete-icon.css` owns the history card
  delete icon drawing styles.
- `styles/features/home-history-cards-preview.css` is now a pure aggregation
  entry for card preview shell, fallback, and image state submodules.
- `styles/features/home-history-cards-preview-shell.css` owns the history card
  thumbnail shell and thumbnail image fit styles.
- `styles/features/home-history-cards-preview-fallback.css` owns history card
  preview fallback icon/text styles.
- `styles/features/home-history-cards-preview-image.css` owns project preview
  image positioning and hidden state styles.
- `styles/features/home-history-cards-meta.css` is now a pure aggregation entry
  for create-card metadata and project card text submodules.
- `styles/features/home-history-cards-meta-create.css` owns create-card thumb
  text and icon styles.
- `styles/features/home-history-cards-meta-text.css` owns project card title and
  date text truncation styles.
- `styles/features/home-responsive-tablet.css` is now a pure aggregation entry
  for tablet home responsive overrides.
- `styles/features/home-responsive-tablet-history.css` owns tablet home history
  section and history grid overrides.
- `styles/features/home-responsive-tablet-community.css` owns tablet community
  section and channel shell overrides.
- `styles/features/home-responsive-tablet-feed.css` owns tablet inspiration grid
  and masonry feed overrides.
- `styles/features/home-responsive-mobile.css` is now a pure aggregation entry
  for mobile home responsive overrides.
- `styles/features/home-responsive-mobile-history.css` owns mobile home stage,
  history section, and history grid overrides.
- `styles/features/home-responsive-mobile-community.css` owns mobile community,
  channel strip, section head, and back-to-top overrides.
- `styles/features/home-responsive-mobile-feed.css` owns mobile inspiration grid
  and masonry feed overrides.
- `styles/features/home-responsive-mobile-prompt.css` owns mobile home prompt
  and model picker visibility overrides.
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
  grid, header, selection bar aggregation, and empty-state styles.
- `styles/features/project-library-shell-selection.css` is now a pure
  aggregation entry for project library selection bar, button, and danger-state
  submodules.
- `styles/features/project-library-shell-selection-bar.css` owns project
  library selection bar layout, count label, and action group styles.
- `styles/features/project-library-shell-selection-button.css` owns project
  library selection toggle and shared action button styles.
- `styles/features/project-library-shell-selection-danger.css` owns project
  library dangerous action and disabled button states.
- `styles/features/project-library-cards.css` is now a pure aggregation entry
  for project library card base, selection, content, and responsive submodules.
- `styles/features/project-library-cards-selection.css` is now a pure
  aggregation entry for project library card selection state, checkbox, and
  hover submodules.
- `styles/features/project-library-cards-selection-state.css` owns selectable
  and selected project library card state styles.
- `styles/features/project-library-cards-selection-check.css` owns project
  library card checkbox control and checked-state styles.
- `styles/features/project-library-cards-selection-hover.css` owns project
  library card hover and selected-hover styles.
- `styles/features/project-library-cards-content.css` is now a pure aggregation
  entry for project library new-card, media preview, and text submodules.
- `styles/features/project-library-cards-content-new.css` owns project library
  new-card content styles.
- `styles/features/project-library-cards-content-media.css` owns project
  library card thumbnail frame, image, and fallback icon styles.
- `styles/features/project-library-cards-content-text.css` owns project library
  card title and date text styles.
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
- `styles/legacy-canvas-choice-overlays.css` is now a pure aggregation entry
  for canvas viewport cursor states, upload choice bubbles, generation choice
  overlay, floating suggestions, and related keyframe submodules.
- `styles/legacy-canvas-choice-viewport.css` owns canvas viewport positioning
  and cursor state styles.
- `styles/legacy-canvas-choice-upload.css` owns upload choosing blur state,
  upload choice bubbles, drag/drop hover state, and upload drag-live copy
  pseudo-element styles.
- `styles/legacy-canvas-choice-generation.css` owns generation choice overlay,
  close button, stage, and generated choice image presentation styles.
- `styles/legacy-canvas-choice-floating-suggestions.css` owns floating
  suggestion placement, card states, text, and running-state styles.
- `styles/legacy-canvas-choice-keyframes.css` owns the related choice overlay
  animations.
- `styles/legacy-canvas-world.css` is now a pure aggregation entry for canvas
  selection box, world stage, empty state, and hint/quick-action submodules.
- `styles/legacy-canvas-world-selection.css` owns canvas selection box styles.
- `styles/legacy-canvas-world-stage.css` owns canvas world positioning and
  transform-origin styles.
- `styles/legacy-canvas-world-empty-state.css` owns canvas empty state, spark,
  action, and dot styles.
- `styles/legacy-canvas-world-hints.css` owns hint line and quick action
  styles.
- `styles/legacy-canvas-video-generator.css` is now a pure aggregation entry
  for video generator shell, reference/tool, and control/status submodules.
- `styles/legacy-canvas-video-generator-shell.css` owns video generator popover
  shell, open state, head, and row base layout styles.
- `styles/legacy-canvas-video-generator-reference.css` owns video generator
  reference list/thumb and tool button styles.
- `styles/legacy-canvas-video-generator-controls.css` owns video generator
  prompt, model selector, option group, send control, disabled state, and
  status styles.
- `styles/legacy-canvas-project-header.css` is now a pure aggregation entry
  for canvas project header shell, title, save-status, and return control
  submodules.
- `styles/legacy-canvas-project-header-shell.css` owns canvas project header
  fixed positioning and transparent shell overrides.
- `styles/legacy-canvas-project-header-title.css` owns canvas project title
  editing affordance styles.
- `styles/legacy-canvas-project-header-status.css` owns save-status badge base,
  visible, success, error, and pending states.
- `styles/legacy-canvas-project-header-return.css` owns the return-to-content
  control styles.
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
- `styles/features/node-base-actions.css` is now a pure aggregation entry for
  node action shell, icon, and state submodules.
- `styles/features/node-base-actions-shell.css` owns node expand/download action
  button shell placement and surface styles.
- `styles/features/node-base-actions-icon.css` owns node expand/download action
  SVG icon styles.
- `styles/features/node-base-actions-state.css` owns node action reveal, hidden,
  and hover states.
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
- `styles/features/node-director.css` is now a pure aggregation entry for
  director shell, heading, actions, and tile submodules.
- `styles/features/node-director-tile.css` is now a pure aggregation entry for
  director tile shell, state, and content submodules.
- `styles/features/node-director-tile-shell.css` owns director tile surface and
  overlay pseudo-element styles.
- `styles/features/node-director-tile-state.css` owns director tile hover and
  running states.
- `styles/features/node-director-tile-content.css` owns director tile small,
  span, and icon text styles.
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
- `styles/features/node-preview.css` is now a pure aggregation entry for
  media/model/cube/video preview helper and bottom control submodules.
- `styles/features/node-preview-model.css` is now a pure aggregation entry for
  model preview shell, viewer controls, and text submodules.
- `styles/features/node-preview-model-shell.css` owns model preview frame and
  model cube-scene sizing styles.
- `styles/features/node-preview-model-viewer.css` owns model viewer canvas,
  loading label, mode toggle, and active mode styles.
- `styles/features/node-preview-model-text.css` owns model name and preview
  title truncation styles.
- `styles/features/node-preview-cube-video.css` is now a pure aggregation entry
  for cube preview and video preview submodules.
- `styles/features/node-preview-cube.css` owns cube scene, faces, and spin
  keyframe styles.
- `styles/features/node-preview-video.css` owns video preview frame, play
  control, and progress strip styles.
- `styles/features/node.css` is now a feature CSS aggregation entry for node
  submodules.
- The inactive AI Core runtime and its legacy style modules were removed after
  dead-code audit evidence and check/build verification; `legacy-split.css` no
  longer imports `legacy-ai-core*.css`.
- `prompt-input-utils.js` now owns prompt submit attachment source resolution
  and submit debug payload building for composer files, pending home files, DOM
  previews, and debug source labels; `scripts/check-prompt-input-utils.js`
  guards the extracted behavior.
- `prompt-result-utils.js` now owns prompt result URL collection, generated
  media result classification/output counts, generated node option builders,
  and generated project patch builders; `scripts/check-prompt-result-utils.js`
  guards image, video, missing-result, node-option, and project-patch behavior.
- `prompt-workflow-constants.js` now owns prompt workflow static configuration
  for thinking steps, Midjourney image count, stream timeout, and chat agent
  debug/version flags; `scripts/check-prompt-workflow-constants.js` guards the
  extracted constants without changing prompt generation behavior.
- `prompt-generation-payload-utils.js` now owns prompt model selection
  normalization for pending-home and selected chat models; the workflow still
  owns DOM synchronization, and `scripts/check-prompt-generation-payload-utils.js`
  guards the extracted model-selection behavior.
- `prompt-preview-utils.js` now owns prompt preview batch/status helpers and
  the shared viewport-center target calculation used by prompt generation
  previews; `scripts/check-prompt-preview-utils.js` guards the extracted
  placement formula without changing preview creation behavior.
- `prompt-project-persistence-utils.js` now owns generated project patch
  commit ordering for update, autosave, and title refresh; the workflow still
  owns patch construction and generation timing, while
  `scripts/check-prompt-project-persistence-utils.js` guards the extracted
  persistence sequence.
- `image-generator-workflow-constants.js` now owns image generator selectors,
  default model/ratio/count configuration, and Midjourney output count;
  `scripts/check-image-generator-workflow-constants.js` guards those static
  workflow settings without changing generator runtime behavior.
- `image-generator-result-utils.js` now owns image generator completion message
  formatting alongside result URL parsing; `scripts/check-image-generator-result-utils.js`
  guards completion messages and image/video result URL behavior.
- `scripts/check-image-generator-copy.js` now also guards the image generator
  preview-failure chat copy against known mojibake so failed preview recovery
  keeps returning the same readable error format as the normal failure branch.
- `image-generator-job-polling-utils.js` now owns the image generator async job
  polling loop; `scripts/check-image-generator-job-polling-utils.js` guards
  success, rate-limit, missing-URL retry, failure, and timeout behavior.
- `image-generator-preview-replacement-utils.js` now owns recovered image
  generator preview replacement; `scripts/check-generator-job-recovery.js`
  guards recovered title, URL, sizing, metadata, skip, and missing-URL behavior.

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
- SQLite online backup and isolated restore-drill tooling for the current
  single-instance deployment phase.
- Read-only upload integrity auditing across persisted text/JSON references and
  the configured upload directory; no automatic orphan deletion.
- Production environment checks for base URL, mock provider flags, Railway
  volume paths, DB path, and upload path.
- Basic security headers and protected upload serving.
- Provider seams for AI model services.

Known release-readiness gaps:

- Production CSP no longer allows inline/eval scripts, `connect-src http:`,
  `img-src http:`, or `media-src http:`. Development keeps its import map and
  broader script/network allowances for unbundled local tooling. Inline styles
  remain the next CSP tightening boundary. Framing is denied, form submissions
  are same-origin only, and production responses enable one-year HSTS.
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
