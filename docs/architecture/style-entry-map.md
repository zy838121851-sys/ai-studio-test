# Style Entry Map

This document records the current CSS entrypoints, static paths, and style
governance risks for AI Studio. It is documentation only and does not change UI
or runtime behavior.

## HTML CSS Entrypoint

Source `index.html` currently references one CSS file:

```html
<link rel="stylesheet" href="./styles.css?v=20260628-boot-inline-1" />
```

That source entry is used by the non-built development path. In production
builds, Vite rewrites the stylesheet reference in `dist/index.html` to a hashed
asset:

```html
<link rel="stylesheet" crossorigin href="/assets/index-*.css">
```

Current observed build output includes:

```text
dist/assets/index-D3Qz9b5K.css
```

The hash can change after any CSS or imported asset change.

## Source CSS Import Chain

Top-level source entry:

```text
styles.css
```

Current imports from `styles.css`:

```text
styles/globals.css
styles/workspace.css
styles/components.css
styles/image-compare.css
styles/task-log.css
styles/legacy-split.css
```

`styles/workspace.css` currently imports:

```text
styles/workspace-layout.css
styles/features/auth.css
styles/features/home.css
styles/features/project-library.css
```

`styles/features/auth.css` currently imports:

```text
styles/features/auth-account.css
styles/features/auth-credit-detail.css
styles/features/auth-dialog.css
```

`styles/features/project-library.css` currently imports:

```text
styles/features/project-library-shell.css
styles/features/project-library-cards.css
styles/features/project-library-page.css
```

`styles/legacy-split.css` currently imports:

```text
styles/legacy-base.css
styles/features/assets.css
styles/legacy-canvas.css
styles/legacy-canvas-visual.css
styles/features/chat.css
styles/legacy-chat.css
styles/features/node.css
styles/legacy-overrides.css
styles/legacy-compact-controls.css
styles/legacy-rail-polish.css
styles/legacy-light-refinements.css
styles/legacy-theme-ios.css
styles/legacy-theme-sync.css
styles/menu-select-overrides.css
```

`styles/features/node.css` currently imports:

```text
styles/features/node-base.css
styles/features/node-image-edit.css
styles/features/node-state.css
styles/features/node-image-toolbar.css
styles/features/node-image-toolbar-savebar.css
styles/features/node-image-panels.css
styles/features/node-stack.css
styles/features/node-director.css
styles/features/node-media.css
styles/features/node-generation.css
styles/features/node-image-generator.css
styles/features/node-preview.css
```

`styles/features/node-image-edit.css` currently imports:

```text
styles/features/node-image-edit-state.css
styles/features/node-image-crop.css
styles/features/node-image-expand.css
```

`styles/features/node-image-generator.css` currently imports:

```text
styles/features/node-image-generator-base.css
styles/features/node-image-generator-inline-edit.css
```

`styles/features/node-image-generator-base.css` currently imports:

```text
styles/features/node-image-generator-shell.css
styles/features/node-image-generator-panel.css
styles/features/node-image-generator-glass.css
```

`styles/features/node-image-toolbar.css` currently imports:

```text
styles/features/node-image-toolbar-base.css
styles/features/node-image-toolbar-upscale.css
styles/features/node-image-toolbar-menu.css
```

`styles/features/node-image-panels.css` currently imports:

```text
styles/features/node-image-text-panel.css
styles/features/node-image-lightbox.css
```

`styles/features/node-stack.css` currently imports:

```text
styles/features/node-stack-base.css
styles/features/node-stack-tray.css
```

`styles/features/node-media.css` currently imports:

```text
styles/features/node-media-shell.css
styles/features/node-media-video.css
styles/features/node-media-frame.css
```

`styles/features/assets.css` currently imports:

```text
styles/features/assets-page.css
styles/features/assets-board.css
styles/features/assets-save.css
styles/features/assets-picker.css
styles/features/assets-canvas-picker.css
styles/features/assets-context-menu.css
styles/features/assets-pinterest.css
```

`styles/features/assets-page.css` currently imports:

```text
styles/features/assets-floating-library.css
styles/features/assets-page-view.css
styles/features/assets-page-pinterest-legacy.css
```

`styles/features/assets-pinterest.css` currently imports:

```text
styles/features/assets-pinterest-board.css
styles/features/assets-pinterest-shell.css
styles/features/assets-pinterest-board-refresh.css
styles/features/assets-pinterest-pin.css
styles/features/assets-pinterest-layout.css
styles/features/assets-pinterest-responsive.css
```

`styles/features/home.css` currently imports:

```text
styles/features/home-history.css
styles/features/home-community.css
styles/features/home-shell.css
```

`styles/features/home-history.css` currently imports:

```text
styles/features/home-history-stack.css
styles/features/home-history-section.css
styles/features/home-history-cards.css
```

`styles/features/home-community.css` currently imports:

```text
styles/features/home-community-channels.css
styles/features/home-community-feed.css
styles/features/home-community-inspiration.css
```

`styles/features/home-shell.css` currently imports:

```text
styles/features/home-shell-boot.css
styles/features/home-shell-prompt.css
styles/features/home-shell-model.css
styles/features/home-shell-transition.css
```

`styles/legacy-chat.css` currently imports:

```text
styles/legacy-chat-shell.css
styles/legacy-chat-message.css
styles/legacy-chat-responsive.css
styles/legacy-chat-agent.css
styles/legacy-chat-composer.css
```

`styles/legacy-compact-controls.css` currently imports:

```text
styles/legacy-compact-project-menu.css
styles/legacy-compact-tool-rail.css
styles/legacy-compact-bottom-controls.css
```

`styles/legacy-theme-ios.css` currently imports:

```text
styles/legacy-theme-ios-base.css
styles/legacy-theme-ios-chrome.css
styles/legacy-theme-ios-node-media.css
styles/legacy-theme-ios-chat-composer.css
```

`styles/legacy-theme-sync.css` currently imports:

```text
styles/legacy-theme-sync-base.css
styles/legacy-theme-sync-surfaces.css
styles/legacy-theme-sync-image-edit.css
styles/legacy-theme-sync-crop-expand.css
styles/legacy-theme-sync-media-edit.css
styles/legacy-theme-sync-node-media.css
styles/legacy-theme-sync-compact-select.css
styles/legacy-theme-sync-model-preference.css
styles/legacy-theme-sync-credit-submit.css
```

`styles/legacy-theme-sync-node-media.css` currently imports:

```text
styles/legacy-theme-sync-node-media-card.css
styles/legacy-theme-sync-node-media-ai.css
styles/legacy-theme-sync-node-media-canvas.css
```

`styles/legacy-theme-sync-model-preference.css` currently imports:

```text
styles/legacy-theme-sync-model-preference-menu.css
styles/legacy-theme-sync-model-preference-panel.css
styles/legacy-theme-sync-model-preference-color-fix.css
```

`styles/legacy-canvas.css` currently imports:

```text
styles/legacy-canvas-shell.css
styles/legacy-canvas-image-edit.css
styles/legacy-canvas-add-node.css
styles/legacy-canvas-choice-overlays.css
styles/legacy-canvas-world.css
styles/legacy-canvas-video-generator.css
styles/legacy-canvas-project-header.css
styles/legacy-canvas-library.css
```

`styles/legacy-canvas-choice-overlays.css` currently imports:

```text
styles/legacy-canvas-choice-viewport.css
styles/legacy-canvas-choice-upload.css
styles/legacy-canvas-choice-generation.css
styles/legacy-canvas-choice-floating-suggestions.css
styles/legacy-canvas-choice-keyframes.css
```

`styles/legacy-canvas-world.css` currently imports:

```text
styles/legacy-canvas-world-selection.css
styles/legacy-canvas-world-stage.css
styles/legacy-canvas-world-empty-state.css
styles/legacy-canvas-world-hints.css
```

`styles/legacy-canvas-shell.css` currently imports:

```text
styles/legacy-canvas-shell-brand.css
styles/legacy-canvas-shell-actions.css
styles/legacy-canvas-shell-tool-rail.css
styles/legacy-canvas-shell-menus.css
styles/legacy-canvas-shell-selection.css
```

`styles/legacy-canvas-image-edit.css` currently imports:

```text
styles/legacy-canvas-image-edit-popover.css
styles/legacy-canvas-image-edit-generator-select.css
styles/legacy-canvas-image-edit-compact-select.css
styles/legacy-canvas-image-edit-footer.css
```

`styles/legacy-canvas-visual.css` currently imports:

```text
styles/legacy-canvas-visual-shape-tools.css
styles/legacy-canvas-visual-media.css
styles/legacy-canvas-visual-shell.css
```

`styles/legacy-canvas-visual-shape-tools.css` currently imports:

```text
styles/legacy-canvas-visual-selection-draw.css
styles/legacy-canvas-visual-text-editor.css
styles/legacy-canvas-visual-shape-toolbar.css
styles/legacy-canvas-visual-text-toolbar.css
```

## `/styles` and `/assets/styles`

Current server behavior in `src/server/index.js`:

- `useBuiltClient` is true only when `NODE_ENV=production` and
  `dist/index.html` exists.
- When `useBuiltClient` is true, the server serves `dist` through
  `express.static(distDir, builtStaticOptions)`.
- `/assets/styles` is always mapped to the source `styles` directory.
- `/styles` is only mapped to the source `styles` directory in the non-built
  development path.
- A commented compatibility note mentions `/styles`, but the active production
  route is `/assets/styles`.

Practical meaning:

- Built production CSS should normally come from `/assets/index-*.css` inside
  `dist/assets`.
- Source CSS compatibility paths should use `/assets/styles/...` in production
  if needed.
- `/styles/...` should not be assumed available in the built production path.

## Vite Build Output Relationship

Vite config:

```text
appType: "mpa"
build.outDir: "dist"
build.assetsDir: "assets"
rollupOptions.input: "index.html"
```

Observed current production build output:

```text
dist/index.html
dist/assets/index-*.css
dist/assets/index-*.js
dist/assets/three.module-*.js
dist/assets/GLTFLoader-*.js
dist/assets/OrbitControls-*.js
```

Vite bundles the CSS import graph into the hashed `dist/assets/index-*.css`
file. Do not hardcode the hash in documentation, code, or deployment settings.

## Server Static Hosting Order

Current high-level order:

1. API and health routes.
2. `/uploads` protected upload route.
3. `/data` blocked with 404.
4. Built client static files from `dist` when `useBuiltClient` is true.
5. `/assets/styles` mapped to source `styles`.
6. `/` and `/index.html` return the selected index file.
7. Non-built development-only routes:
   - `/app.js`
   - `/styles.css`
   - `/src/main.js`
   - `/src/client`
   - `/styles`
   - `/public`
   - `/vendor/three`
8. App navigation fallback for extensionless HTML navigation paths.
9. Error logging middleware.

Style risk:

- If a CSS request is not handled by static middleware before the app navigation
  fallback, the browser can receive `index.html` as `text/html`, causing CSS MIME
  errors.
- Built production should rely on `dist/assets/index-*.css`, not source
  `styles.css`.

## Legacy CSS Files

Current legacy-style files:

```text
styles/legacy.css
styles/legacy-base.css
styles/legacy-canvas.css
styles/legacy-canvas-visual.css
styles/legacy-canvas-visual-shell.css
styles/legacy-chat.css
styles/legacy-compact-controls.css
styles/legacy-light-refinements.css
styles/legacy-node.css
styles/legacy-overrides.css
styles/legacy-rail-polish.css
styles/legacy-split.css
styles/legacy-split-progress.md
styles/legacy-theme-ios.css
styles/legacy-theme-sync.css
```

Notes:

- `legacy-split.css` is the active legacy bundle entry imported by `styles.css`.
- Most `legacy-*.css` files are still reachable through `legacy-split.css`.
- `legacy-base.css` is currently an import-free compatibility shim. The concrete
  canvas and chat legacy modules are imported directly by `legacy-split.css`,
  and `scripts/check-style-entry.js` guards against reintroducing duplicate
  imports there.
- `features/chat.css` owns the conversation history popover styles that were
  moved out of `legacy-chat.css`.
- `legacy-chat-shell.css` owns chat panel shell, floating chat button, agent
  debug panel, window actions, welcome/suggestions, and chat log shell styles;
  it is imported by `legacy-chat.css`.
- `legacy-chat-message.css` owns chat message, user message, thinking message,
  loading indicator/animation, and image message styles; it is imported by
  `legacy-chat.css`.
- `legacy-chat-responsive.css` owns chat-related responsive override blocks; it
  is imported by `legacy-chat.css`.
- `legacy-chat-agent.css` owns agent UI blocks, analysis/result cards, prompt
  details, assistant summary, task status, feedback button styles, and agent
  summary pseudo-element content; it is imported by `legacy-chat.css`.
- `legacy-chat-composer.css` owns composer layout, chat upload/model controls,
  chat image preview, send button styles, drag-over pseudo-element content, and
  preview close pseudo-element styles; it is imported by `legacy-chat.css`.
- `legacy-chat.css` is now a pure aggregation entry for chat shell, message,
  responsive, agent, and composer submodules.
- `legacy-theme-ios.css` is now a pure aggregation entry for iOS glass theme
  base, chrome, node/media, and chat/composer submodules.
- `legacy-theme-ios-base.css` owns iOS glass light-theme variables, page/app
  background, and canvas background overlays.
- `legacy-theme-ios-chrome.css` owns iOS glass chrome surfaces and controls for
  project/header/top actions/tool rail/bottom controls/add-node, context menu,
  and image-edit surfaces.
- `legacy-theme-ios-node-media.css` owns iOS glass canvas viewport hints,
  node/generated/media cards, selected state, labels, 3D/video preview, face,
  and play styles.
- `legacy-theme-ios-chat-composer.css` owns iOS glass chat panel, messages,
  composer/input, chat image preview, and light color-scheme styles.
- `legacy-compact-project-menu.css` owns compact project header and project
  menu styles; it is imported by `legacy-compact-controls.css`.
- `legacy-compact-tool-rail.css` owns compact tool rail, rail item, rail button,
  rail separator, and light-theme rail polish styles; it is imported by
  `legacy-compact-controls.css`.
- `legacy-compact-bottom-controls.css` owns bottom controls, zoom stepper,
  history controls, and light-theme glass control polish styles; it is imported
  by `legacy-compact-controls.css`.
- `legacy-compact-controls.css` is now a pure aggregation entry for compact
  project menu, tool rail, and bottom controls submodules.
- `features/auth-account.css` owns auth entry, authenticated avatar button,
  account popover, points row, and account menu styles; it is imported by
  `features/auth.css`.
- `features/auth-credit-detail.css` owns credit detail dialog, profile, info,
  transaction, empty/status, and responsive credit detail styles; it is
  imported by `features/auth.css`.
- `features/auth-dialog.css` owns login/auth dialog, WeChat panel, QR, icon
  methods, mode switch, auth form, message, and submit styles; it is imported
  by `features/auth.css`.
- `features/auth.css` is now a pure aggregation entry for auth account, credit
  detail, and auth dialog submodules.
- `features/assets-page.css` is now a pure aggregation entry for floating
  library, asset page view, and first-pass Pinterest-style legacy asset page
  styles; it is imported by `features/assets.css`.
- `features/assets-floating-library.css` owns the floating asset library shell,
  upload button, and asset list basics.
- `features/assets-page-view.css` owns asset page toolbar/list and
  `body[data-view="assetsPage"]` page-view overrides.
- `features/assets-page-pinterest-legacy.css` owns first-pass Pinterest-style
  asset page overview styles that predate the refreshed
  `features/assets-pinterest.css` submodules.
- `features/assets-board.css` owns asset board/list/card/thumb, move/delete
  action, and empty-state styles; it is imported by `features/assets.css`.
- `features/assets-save.css` owns asset save popover and canvas asset board
  popover styles; it is imported by `features/assets.css`.
- `features/assets-picker.css` owns asset picker modal and asset preview overlay
  styles; it is imported by `features/assets.css`.
- `features/assets-canvas-picker.css` owns canvas project picker overlay styles
  for asset insertion; it is imported by `features/assets.css`.
- `features/assets-context-menu.css` owns asset page card context menu styles;
  it is imported by `features/assets.css`.
- `features/assets-pinterest-board.css` owns the first asset page Pinterest
  board, masonry, pin, delete, empty, floating library item, and responsive
  foundation block; it is imported by `features/assets-pinterest.css`.
- `features/assets-pinterest-shell.css` owns asset page Pinterest refresh shell,
  profile heading, upload CTA, stats, tabs, section title, and back control
  styles; it is imported by `features/assets-pinterest.css`.
- `features/assets-pinterest-board-refresh.css` owns asset page Pinterest
  refresh board grid, board cover count variants, cover cells, create-card,
  board title, and board delete styles; it is imported by
  `features/assets-pinterest.css`.
- `features/assets-pinterest-pin.css` owns asset page Pinterest pin/card
  thumbnail, selection check, placeholder, metadata, actions, delete, and
  empty-state styles; it is imported by `features/assets-pinterest.css`.
- `features/assets-pinterest-layout.css` owns asset page Pinterest masonry and
  selection bar styles; it is imported by `features/assets-pinterest.css`.
- `features/assets-pinterest-responsive.css` owns asset page Pinterest
  responsive rules and interaction refinement styles; it is imported by
  `features/assets-pinterest.css`.
- `features/assets-pinterest.css` is now a pure aggregation entry for asset
  page Pinterest submodules; it imports
  `features/assets-pinterest-board.css` and
  `features/assets-pinterest-shell.css`, and
  `features/assets-pinterest-board-refresh.css`, and
  `features/assets-pinterest-pin.css`, and
  `features/assets-pinterest-layout.css`, and
  `features/assets-pinterest-responsive.css`, and is imported by
  `features/assets.css`.
- `features/assets.css` is now an asset feature CSS aggregation entry for asset
  submodules.
- `legacy-node.css` is currently a compatibility shim with no active selector
  ownership and is intentionally outside the active CSS import graph.
- `features/node-base.css` owns base node/card/resize/action styles that were
  moved out of `legacy-node.css`; it is imported at the top of
  `features/node.css`.
- `features/node-image-edit.css` is now a pure aggregation entry for image edit
  state, crop, and expand styles; it is imported by `features/node.css`
  immediately after node base styles to preserve the previous cascade position.
- `features/node-image-edit-state.css` owns crop/expand z-index and toolbar,
  savebar, download, expand, resize-handle, and multi-selection visibility
  suppression.
- `features/node-image-crop.css` owns crop overlay, crop box, crop handles, and
  crop action controls.
- `features/node-image-expand.css` owns image expand overlay, source frame,
  expand handles, prompt field, action row, and confirming state styles.
- `features/node-state.css` owns generic node zoom/selected/source/label state
  styles; it is imported before image toolbar styles to preserve the previous
  cascade position.
- `features/node-image-toolbar.css` is now a pure aggregation entry for image
  toolbar base, upscale controls, and menu styles.
- `features/node-image-toolbar-base.css` owns image toolbar shell, initial menu
  defaults, button base styles, and main toolbar layout styles.
- `features/node-image-toolbar-upscale.css` owns image toolbar upscale mode,
  size option, and generate button styles.
- `features/node-image-toolbar-menu.css` owns image toolbar icon/label,
  compare, separator, menu card, upscale option card, and dark menu styles.
- `features/node-image-toolbar-savebar.css` owns canvas asset savebar, asset
  board select, and save submit styles; it is imported immediately after
  `features/node-image-toolbar.css`.
- `features/node-image-panels.css` is now a pure aggregation entry for image
  text panel and image lightbox styles.
- `features/node-image-text-panel.css` owns image text edit panel, status,
  editable input list, footer actions, and loading apply state styles.
- `features/node-image-lightbox.css` owns image lightbox overlay, figure, image,
  caption, and close button styles.
- `features/node-stack.css` is now a pure aggregation entry for stack base and
  tray styles.
- `features/node-stack-base.css` owns stack hidden/member state, stacked card
  depth shadows, drop target state, and stack toggle styles.
- `features/node-stack-tray.css` owns stack tray, row, thumbnail, title, and
  metadata styles.
- `features/node-director.css` owns director node styles.
- `features/node-media.css` is now a pure aggregation entry for media shell,
  video preview, and media frame styles.
- `features/node-media-shell.css` owns 2D, 3D, image, model, video, and
  loading-image node shell styles.
- `features/node-media-video.css` owns video node selected state, hidden node
  text, and video file preview styles.
- `features/node-media-frame.css` owns image/model selected frame outline,
  image filename, image frame, and image drag suppression styles.
- `features/node-generation.css` owns temporary generation preview frame and
  shimmer animation styles.
- `features/node-image-generator-base.css` is now a pure aggregation entry for
  image generator shell, panel, and light glass override styles.
- `features/node-image-generator-shell.css` owns base image generator node,
  head, frame, result, loading, initial panel, textarea, action, and drop-active
  styles.
- `features/node-image-generator-panel.css` owns refreshed image generator
  panel layout, reference list, model/cancel controls, submit button, and
  disabled states.
- `features/node-image-generator-glass.css` owns the light glass visual
  alignment overrides for the image generator node, frame, panel, controls, and
  drop-active state.
- `features/node-image-generator-inline-edit.css` owns image generator inline
  edit popover, edit action grid, inline submit, and responsive edit action
  styles.
- `features/node-image-generator.css` is now a pure aggregation entry for image
  generator base and inline edit submodules.
- `features/node-preview.css` owns media/model/video preview helper, cube
  preview, and bottom control styles.
- `features/node.css` is now a feature CSS aggregation entry for node
  submodules.
- `features/home-history.css` is now a pure aggregation entry for home history
  stack, section header, and recent project card styles.
- `features/home-history-stack.css` owns the home recent project/history stack,
  trigger, layered thumbnails, and open affordance styles.
- `features/home-history-section.css` owns home history section header and
  section navigation styles.
- `features/home-history-cards.css` owns home history grid, card, thumbnail,
  preview fallback, create-card, and delete-control styles.
- `features/home-community.css` is now a pure aggregation entry for home
  community channel, feed, and inspiration submodules.
- `features/home-community-channels.css` owns home community section, channel
  shell, channel strip, tone swatches, and channel scroll controls.
- `features/home-community-feed.css` owns the home masonry feed, placeholder
  sweep animation, loading state, and back-to-top control.
- `features/home-community-inspiration.css` owns home inspiration grid and
  inspiration card styles.
- `features/home-shell.css` is now a pure aggregation entry for home boot,
  prompt, model picker, and transition submodules.
- `features/home-shell-boot.css` owns home boot/ready visibility and skeleton
  animation styles.
- `features/home-shell-prompt.css` owns home stage, title, prompt shell, upload
  preview, input, and plus indicator styles.
- `features/home-shell-model.css` owns home model picker, menu, native select,
  and model option styles.
- `features/home-shell-transition.css` owns home send button and home-to-canvas
  transition animation styles.
- `features/home.css` imports `features/home-history.css`,
  `features/home-community.css`, and `features/home-shell.css`, then keeps
  responsive overrides for the home feature submodules.
- `features/project-library.css` is now a pure aggregation entry for project
  library shell, cards, and page-view override styles.
- `features/project-library-shell.css` owns project library shell, title, grid,
  header, selection bar, and empty-state styles.
- `features/project-library-cards.css` owns project library board, card,
  selection check, new-card, thumbnail, and base responsive styles.
- `features/project-library-page.css` owns `body[data-view="library"]` project
  library page overrides, mobile overrides, and library entry animation.
- `legacy-theme-sync-base.css` owns root light/dark theme variables, dark canvas
  background, and light/dark theme switch styles.
- `legacy-theme-sync-surfaces.css` owns the first cross-component theme
  surface/control synchronization block for canvas chrome, edit controls, asset
  generation controls, composer, and chat panel surfaces.
- `legacy-theme-sync-image-edit.css` owns image edit popover and image
  generator control theme synchronization styles.
- `legacy-theme-sync-crop-expand.css` owns primary action button, crop action,
  and image expand action theme synchronization styles.
- `legacy-theme-sync-media-edit.css` owns secondary menu separator, shared
  textarea, edit reference, crop overlay, image expand overlay, and image
  lightbox theme synchronization styles.
- `legacy-theme-sync-node-media.css` is now a pure aggregation entry for
  node/card, AI/generation, and canvas media theme synchronization submodules.
- `legacy-theme-sync-node-media-card.css` owns dark node/card, generated card,
  asset generation card, message, and form control theme synchronization.
- `legacy-theme-sync-node-media-ai.css` owns generation choice, AI
  suggestion/result/thinking/progress, director, stack row/toggle, source badge,
  model viewer, image frame, generation frame, and thinking/image message theme
  surfaces.
- `legacy-theme-sync-node-media-canvas.css` owns canvas media node
  transparent-frame polish, resize handle placement, loading-image generation
  frame theme polish, node group z-index, and stack drop-target overrides.
- `legacy-theme-sync-compact-select.css` owns compact select base, image-edit
  compact select, composer compact select, responsive compact select, and
  compact select option state styles.
- `legacy-theme-sync-model-preference.css` is now a pure aggregation entry for
  model preference menu, panel, and color-fix submodules.
- `legacy-theme-sync-model-preference-menu.css` owns model preference menu
  placement, chat model menu sizing, composer/image edit placement, and image
  generator model menu shell styles.
- `legacy-theme-sync-model-preference-panel.css` owns model preference panel,
  header, auto toggle, tabs, list, option, state, description, tag, and
  empty-state styles.
- `legacy-theme-sync-model-preference-color-fix.css` owns generator select
  option and compact select option text color-fix theme styles.
- `legacy-theme-sync-credit-submit.css` owns credit submit button, cost, bolt,
  number, hidden, and quote-error theme synchronization styles.
- `legacy-theme-sync.css` is now a pure aggregation entry that imports
  `legacy-theme-sync-base.css`,
  `legacy-theme-sync-surfaces.css`, `legacy-theme-sync-image-edit.css`, and
  `legacy-theme-sync-crop-expand.css`, and
  `legacy-theme-sync-media-edit.css`, `legacy-theme-sync-node-media.css`, and
  `legacy-theme-sync-compact-select.css`, and
  `legacy-theme-sync-model-preference.css`, and
  `legacy-theme-sync-credit-submit.css`.
- `legacy-canvas-shell.css` is now a pure aggregation entry for legacy canvas
  shell brand, actions, tool rail, menus, and selection submodules.
- `legacy-canvas-shell-brand.css` owns canvas area background, project header,
  and legacy logo mark styles.
- `legacy-canvas-shell-actions.css` owns legacy canvas top actions and shared
  glass action surface styles.
- `legacy-canvas-shell-tool-rail.css` owns legacy canvas tool rail, rail main,
  rail buttons, separator, and jump rail button styles.
- `legacy-canvas-shell-menus.css` owns add-node menu shell and canvas context
  menu, submenu, and context color panel styles.
- `legacy-canvas-shell-selection.css` owns selection action bar, action button,
  color swatch, and related mobile selection-bar overrides.
- `legacy-canvas-image-edit.css` is now a pure aggregation entry for image edit
  popover, generator select, compact select, and footer/reference styles.
- `legacy-canvas-image-edit-popover.css` owns image edit popover shell, head,
  reference thumbnails, textarea, base action controls, and edit/generator
  model/size/count field sizing.
- `legacy-canvas-image-edit-generator-select.css` owns image generator custom
  select wrapper, trigger, menu, and option styles.
- `legacy-canvas-image-edit-compact-select.css` owns compact select sizing and
  option styles inside the image edit popover.
- `legacy-canvas-image-edit-footer.css` owns generator select hover/selected
  state, cancel/send controls, generator reference list/thumbs, expanded panel
  rows, and responsive edit action overrides.
- `legacy-canvas-add-node.css` owns add-node menu detail styles and canvas-view
  add-node menu overrides.
- `legacy-canvas-choice-overlays.css` is now a pure aggregation entry for
  canvas viewport cursor states, upload choice bubbles, generation choice
  overlay, floating suggestions, and related keyframe submodules.
- `legacy-canvas-choice-viewport.css` owns canvas viewport positioning and
  cursor state styles.
- `legacy-canvas-choice-upload.css` owns upload choosing blur state, upload
  choice bubbles, drag/drop hover state, and upload drag-live copy
  pseudo-element styles.
- `legacy-canvas-choice-generation.css` owns generation choice overlay, close
  button, stage, and generated choice image presentation styles.
- `legacy-canvas-choice-floating-suggestions.css` owns floating suggestion
  placement, card states, text, and running-state styles.
- `legacy-canvas-choice-keyframes.css` owns the related choice overlay
  animations.
- `legacy-canvas-world.css` is now a pure aggregation entry for canvas
  selection box, world stage, empty state, and hint/quick-action submodules.
- `legacy-canvas-world-selection.css` owns canvas selection box styles.
- `legacy-canvas-world-stage.css` owns canvas world positioning and
  transform-origin styles.
- `legacy-canvas-world-empty-state.css` owns canvas empty state, spark, action,
  and dot styles.
- `legacy-canvas-world-hints.css` owns hint line and quick action styles.
- `legacy-canvas-video-generator.css` owns video generator popover, reference
  list/thumb, model selector, option group, send control, disabled state, and
  status styles.
- `legacy-canvas-project-header.css` owns canvas-view project header, project
  title editing states, save-status badge states, and return-to-content control
  styles.
- `legacy-canvas-library.css` owns library head styles.
- `legacy-canvas.css` imports `legacy-canvas-shell.css`,
  `legacy-canvas-image-edit.css`, `legacy-canvas-add-node.css`, and
  `legacy-canvas-choice-overlays.css`, `legacy-canvas-world.css`, and
  `legacy-canvas-video-generator.css`, and
  `legacy-canvas-project-header.css`, and `legacy-canvas-library.css` as a pure
  aggregation entry.
- `legacy-canvas-visual-shape-tools.css` is now a pure aggregation entry for
  canvas selection/draw, text editor, shape toolbar, and text toolbar visual
  submodules.
- `legacy-canvas-visual-selection-draw.css` owns canvas object selected visuals,
  resize handle polish, draw-node, and draw-shape visuals.
- `legacy-canvas-visual-text-editor.css` owns canvas text node/editor, text
  editing state, placeholder, focus, and shape text editor styles.
- `legacy-canvas-visual-shape-toolbar.css` owns shape format toolbar, shape
  swatches, shape color popover/spectrum/tokens, and stroke width control.
- `legacy-canvas-visual-text-toolbar.css` owns canvas text format toolbar,
  select/button controls, and text color picker styles.
- `legacy-canvas-visual.css` imports `legacy-canvas-visual-shape-tools.css`,
  `legacy-canvas-visual-media.css`, and `legacy-canvas-visual-shell.css` as a
  pure aggregation entry.
- `legacy-canvas-visual-media.css` owns canvas area/world background polish,
  image/model/loading-image transparent frame polish, and resize handle
  placement styles.
- `legacy-canvas-visual-shell.css` owns brand mark/menu, home side menu, and
  simple page visual polish styles.
- `legacy-assets.css` was emptied after asset library styles moved to
  `styles/features/assets.css`, then removed from the active entry graph and
  deleted after static and check-script verification.
- `legacy.css` was previously identified as a low-risk unused compatibility shim,
  but must not be deleted without separate static evidence, runtime verification,
  and a rollback point.
- `legacy-split-progress.md` is documentation/progress history, not a CSS
  runtime import.

## CSS Files Temporarily Not Safe to Delete

Do not delete these without dedicated proof and visual verification:

```text
styles.css
styles/globals.css
styles/workspace.css
styles/workspace-layout.css
styles/features/auth-account.css
styles/features/auth-credit-detail.css
styles/features/auth-dialog.css
styles/features/auth.css
styles/features/assets-page.css
styles/features/assets-floating-library.css
styles/features/assets-page-view.css
styles/features/assets-page-pinterest-legacy.css
styles/features/assets-board.css
styles/features/assets-save.css
styles/features/assets-picker.css
styles/features/assets-canvas-picker.css
styles/features/assets-context-menu.css
styles/features/assets-pinterest-board.css
styles/features/assets-pinterest-shell.css
styles/features/assets-pinterest-board-refresh.css
styles/features/assets-pinterest-pin.css
styles/features/assets-pinterest-layout.css
styles/features/assets-pinterest-responsive.css
styles/features/assets-pinterest.css
styles/features/assets.css
styles/features/chat.css
styles/features/home.css
styles/features/home-history.css
styles/features/home-history-stack.css
styles/features/home-history-section.css
styles/features/home-history-cards.css
styles/features/home-community.css
styles/features/home-community-channels.css
styles/features/home-community-feed.css
styles/features/home-community-inspiration.css
styles/features/home-shell.css
styles/features/home-shell-boot.css
styles/features/home-shell-prompt.css
styles/features/home-shell-model.css
styles/features/home-shell-transition.css
styles/features/node-base.css
styles/features/node-image-edit.css
styles/features/node-image-edit-state.css
styles/features/node-image-crop.css
styles/features/node-image-expand.css
styles/features/node-state.css
styles/features/node-image-toolbar.css
styles/features/node-image-toolbar-base.css
styles/features/node-image-toolbar-upscale.css
styles/features/node-image-toolbar-menu.css
styles/features/node-image-toolbar-savebar.css
styles/features/node-image-panels.css
styles/features/node-image-text-panel.css
styles/features/node-image-lightbox.css
styles/features/node-stack.css
styles/features/node-stack-base.css
styles/features/node-stack-tray.css
styles/features/node-director.css
styles/features/node-media.css
styles/features/node-media-shell.css
styles/features/node-media-video.css
styles/features/node-media-frame.css
styles/features/node-generation.css
styles/features/node-image-generator.css
styles/features/node-image-generator-base.css
styles/features/node-image-generator-shell.css
styles/features/node-image-generator-panel.css
styles/features/node-image-generator-glass.css
styles/features/node-image-generator-inline-edit.css
styles/features/node-preview.css
styles/features/node.css
styles/features/project-library.css
styles/features/project-library-shell.css
styles/features/project-library-cards.css
styles/features/project-library-page.css
styles/components.css
styles/image-compare.css
styles/task-log.css
styles/legacy-split.css
styles/legacy-base.css
styles/legacy-canvas-shell.css
styles/legacy-canvas-shell-brand.css
styles/legacy-canvas-shell-actions.css
styles/legacy-canvas-shell-tool-rail.css
styles/legacy-canvas-shell-menus.css
styles/legacy-canvas-shell-selection.css
styles/legacy-canvas-image-edit.css
styles/legacy-canvas-image-edit-popover.css
styles/legacy-canvas-image-edit-generator-select.css
styles/legacy-canvas-image-edit-compact-select.css
styles/legacy-canvas-image-edit-footer.css
styles/legacy-canvas-add-node.css
styles/legacy-canvas-choice-overlays.css
styles/legacy-canvas-choice-viewport.css
styles/legacy-canvas-choice-upload.css
styles/legacy-canvas-choice-generation.css
styles/legacy-canvas-choice-floating-suggestions.css
styles/legacy-canvas-choice-keyframes.css
styles/legacy-canvas-world.css
styles/legacy-canvas-world-selection.css
styles/legacy-canvas-world-stage.css
styles/legacy-canvas-world-empty-state.css
styles/legacy-canvas-world-hints.css
styles/legacy-canvas-video-generator.css
styles/legacy-canvas-project-header.css
styles/legacy-canvas-library.css
styles/legacy-canvas.css
styles/legacy-canvas-visual-shape-tools.css
styles/legacy-canvas-visual-selection-draw.css
styles/legacy-canvas-visual-text-editor.css
styles/legacy-canvas-visual-shape-toolbar.css
styles/legacy-canvas-visual-text-toolbar.css
styles/legacy-canvas-visual-media.css
styles/legacy-canvas-visual-shell.css
styles/legacy-canvas-visual.css
styles/legacy-chat-shell.css
styles/legacy-chat-message.css
styles/legacy-chat-responsive.css
styles/legacy-chat-agent.css
styles/legacy-chat-composer.css
styles/legacy-chat.css
styles/legacy-node.css
styles/legacy-overrides.css
styles/legacy-compact-controls.css
styles/legacy-compact-project-menu.css
styles/legacy-compact-tool-rail.css
styles/legacy-compact-bottom-controls.css
styles/legacy-rail-polish.css
styles/legacy-light-refinements.css
styles/legacy-theme-ios.css
styles/legacy-theme-ios-base.css
styles/legacy-theme-ios-chrome.css
styles/legacy-theme-ios-node-media.css
styles/legacy-theme-ios-chat-composer.css
styles/legacy-theme-sync-base.css
styles/legacy-theme-sync-surfaces.css
styles/legacy-theme-sync-image-edit.css
styles/legacy-theme-sync-crop-expand.css
styles/legacy-theme-sync-media-edit.css
styles/legacy-theme-sync-node-media.css
styles/legacy-theme-sync-node-media-card.css
styles/legacy-theme-sync-node-media-ai.css
styles/legacy-theme-sync-node-media-canvas.css
styles/legacy-theme-sync-compact-select.css
styles/legacy-theme-sync-model-preference.css
styles/legacy-theme-sync-model-preference-menu.css
styles/legacy-theme-sync-model-preference-panel.css
styles/legacy-theme-sync-model-preference-color-fix.css
styles/legacy-theme-sync-credit-submit.css
styles/legacy-theme-sync.css
styles/menu-select-overrides.css
```

Additional caution:

- `styles/task-log.css` has had unrelated worktree edits in earlier governance
  stages. Confirm `git status` before including it in cleanup batches.
- Class reachability cannot be proven from ESM imports alone. CSS deletion needs
  both import evidence and visual/runtime evidence.

## CSS Governance Recommendations

- Keep `styles.css` as the documented source entry until a deliberate style
  entry migration is planned.
- Keep `scripts/check-inline-style-surface.js` in `npm run check` while
  reducing `style-src 'unsafe-inline'` dependencies. The current baseline is 52
  files with inline style dependencies, including 8 `style=` attributes, 7
  `setAttribute("style")` calls, 298 `.style` operations, and 1 `cssText`
  write. `index.html` and `project-library.js` are no longer allowed inline
  style dependency files, and the chat agent debug panel static styles now live
  in `styles/legacy-chat-shell.css`. Selection group color swatches now use
  `selection-swatch-*` classes instead of inline `--swatch` style attributes.
- Keep `scripts/check-inline-style-categories.js` in `npm run check` to prevent
  the remaining inline style surface from becoming an undifferentiated bucket.
  Its current categories are agent runtime, AI editor dynamic runtime, canvas
  dynamic runtime, serialization/export/snapshot, and workspace floating UI
  runtime. Treat serialization/export/snapshot as the highest-risk category.
- Keep `scripts/check-style-entry.js` as the static CSS entry and selector guard.
  It now checks key selectors for feature CSS plus the legacy canvas and chat
  modules, including migrated auth account selectors in
  `features/auth-account.css`, credit detail selectors in
  `features/auth-credit-detail.css`, auth dialog selectors in
  `features/auth-dialog.css`,
  migrated asset page imports in `features/assets-page.css`, migrated floating
  asset library selectors in `features/assets-floating-library.css`, migrated
  asset page view selectors in `features/assets-page-view.css`, migrated legacy
  asset page Pinterest selectors in `features/assets-page-pinterest-legacy.css`,
  migrated asset board selectors in `features/assets-board.css`, migrated asset
  save selectors in `features/assets-save.css`, migrated asset picker selectors
  in `features/assets-picker.css`, migrated canvas asset picker selectors in
  `features/assets-canvas-picker.css`, migrated asset context menu selectors in
  `features/assets-context-menu.css`, migrated asset Pinterest board selectors
  in `features/assets-pinterest-board.css`, migrated asset Pinterest shell
  selectors in `features/assets-pinterest-shell.css`, migrated asset Pinterest
  board refresh selectors in `features/assets-pinterest-board-refresh.css`,
  migrated asset Pinterest pin selectors in `features/assets-pinterest-pin.css`,
  migrated asset Pinterest layout selectors in
  `features/assets-pinterest-layout.css`, migrated asset Pinterest responsive
  selectors in `features/assets-pinterest-responsive.css`,
  migrated asset Pinterest selectors in `features/assets-pinterest.css`,
  migrated chat shell selectors in `legacy-chat-shell.css`,
  migrated chat message selectors in `legacy-chat-message.css`,
  migrated chat responsive selectors in `legacy-chat-responsive.css`,
  migrated chat agent selectors in `legacy-chat-agent.css`,
  migrated chat composer selectors in `legacy-chat-composer.css`,
  migrated compact project menu selectors in
  `legacy-compact-project-menu.css`,
  migrated compact tool rail selectors in
  `legacy-compact-tool-rail.css`,
  migrated compact bottom controls selectors in
  `legacy-compact-bottom-controls.css`,
  iOS theme imports in `legacy-theme-ios.css`, iOS theme base selectors in
  `legacy-theme-ios-base.css`, iOS theme chrome selectors in
  `legacy-theme-ios-chrome.css`, iOS theme node/media selectors in
  `legacy-theme-ios-node-media.css`, and iOS theme chat/composer selectors in
  `legacy-theme-ios-chat-composer.css`,
  migrated node base selectors in
  `features/node-base.css`,
  migrated image edit imports in `features/node-image-edit.css`, migrated image
  edit state selectors in `features/node-image-edit-state.css`, migrated crop
  selectors in `features/node-image-crop.css`, migrated expand selectors in
  `features/node-image-expand.css`, migrated node
  state selectors in `features/node-state.css`, migrated image toolbar imports
  in `features/node-image-toolbar.css`, migrated image toolbar base selectors in
  `features/node-image-toolbar-base.css`, migrated image toolbar upscale
  selectors in `features/node-image-toolbar-upscale.css`, migrated image toolbar
  menu selectors in `features/node-image-toolbar-menu.css`, migrated canvas
  asset savebar selectors in `features/node-image-toolbar-savebar.css`, migrated
  image panel imports in `features/node-image-panels.css`, migrated image text
  panel selectors in `features/node-image-text-panel.css`, migrated image
  lightbox selectors in `features/node-image-lightbox.css`, migrated stack
  imports in `features/node-stack.css`, migrated stack base selectors in
  `features/node-stack-base.css`, migrated stack tray selectors in
  `features/node-stack-tray.css`, migrated director selectors in
  `features/node-director.css`, migrated media imports in
  `features/node-media.css`, migrated media shell selectors in
  `features/node-media-shell.css`, migrated video media selectors in
  `features/node-media-video.css`, migrated media frame selectors in
  `features/node-media-frame.css`, migrated generation preview selectors in
  `features/node-generation.css`, migrated image generator base imports in
  `features/node-image-generator-base.css`, image generator shell selectors in
  `features/node-image-generator-shell.css`, image generator panel selectors in
  `features/node-image-generator-panel.css`, image generator glass override
  selectors in `features/node-image-generator-glass.css`, image generator inline edit
  selectors in `features/node-image-generator-inline-edit.css`, migrated
  preview selectors in `features/node-preview.css`, the node aggregation entry
  in `features/node.css`, migrated project library imports in
  `features/project-library.css`, and migrated project library selectors in
  `features/project-library-shell.css`, `features/project-library-cards.css`,
  and `features/project-library-page.css`, migrated home history imports in
  `features/home-history.css`, migrated home history selectors in
  `features/home-history-stack.css`, `features/home-history-section.css`, and
  `features/home-history-cards.css`, migrated home community imports in
  `features/home-community.css`, and migrated home community selectors in
  `features/home-community-channels.css`, `features/home-community-feed.css`,
  and `features/home-community-inspiration.css`, migrated home shell imports in
  `features/home-shell.css`, and migrated home shell selectors in
  `features/home-shell-boot.css`, `features/home-shell-prompt.css`,
  `features/home-shell-model.css`, and `features/home-shell-transition.css`;
  it also keeps compatibility shims such as
  `legacy-node.css` outside the active import graph, and guards the
  `legacy-canvas.css` imports of `legacy-canvas-shell.css` and
  `legacy-canvas-image-edit.css`, the `legacy-canvas-shell.css` imports of
  `legacy-canvas-shell-brand.css`, `legacy-canvas-shell-actions.css`,
  `legacy-canvas-shell-tool-rail.css`, `legacy-canvas-shell-menus.css`, and
  `legacy-canvas-shell-selection.css`, the `legacy-canvas-image-edit.css` imports of
  `legacy-canvas-image-edit-popover.css`,
  `legacy-canvas-image-edit-generator-select.css`,
  `legacy-canvas-image-edit-compact-select.css`, and
  `legacy-canvas-image-edit-footer.css`, `legacy-canvas-add-node.css`, and
  `legacy-canvas-choice-overlays.css` imports of
  `legacy-canvas-choice-viewport.css`, `legacy-canvas-choice-upload.css`,
  `legacy-canvas-choice-generation.css`,
  `legacy-canvas-choice-floating-suggestions.css`, and
  `legacy-canvas-choice-keyframes.css`, `legacy-canvas-world.css` imports of
  `legacy-canvas-world-selection.css`, `legacy-canvas-world-stage.css`,
  `legacy-canvas-world-empty-state.css`, and
  `legacy-canvas-world-hints.css`, and
  `legacy-canvas-video-generator.css`, and
  `legacy-canvas-project-header.css`, and `legacy-canvas-library.css`, plus
  the `legacy-canvas-visual.css` import of
  `legacy-canvas-visual-shape-tools.css` and
  `legacy-canvas-visual-media.css` and
  `legacy-canvas-visual-shell.css`, the
  `legacy-canvas-visual-shape-tools.css` imports of
  `legacy-canvas-visual-selection-draw.css`,
  `legacy-canvas-visual-text-editor.css`,
  `legacy-canvas-visual-shape-toolbar.css`, and
  `legacy-canvas-visual-text-toolbar.css`, and selectors in the canvas files.
- Move one feature area at a time from legacy files into a clearer structure.
- Start with documentation and smoke checks before moving selectors.
- Prefer feature grouping such as:

```text
styles/
  tokens.css
  base.css
  layout.css
  components.css
  features/
    home.css
    canvas.css
    assets.css
    projects.css
    auth.css
    chat.css
    task-log.css
  themes/
  overrides.css
```

- Do not rename selectors or change specificity unless the rendered UI is
  verified unchanged.
- Avoid broad `legacy` deletion. Shrink by moving selectors with evidence.
- After each CSS governance batch, run `npm run build` and perform visual smoke
  checks.
- Track `/assets/styles` and `/styles` assumptions explicitly when changing
  server static paths.

## Visual Smoke Checklist

Run this checklist after any style-entry or CSS migration work.

### Home

- Main home view loads with expected layout.
- Home prompt/composer is positioned correctly.
- Model picker and send controls are styled.
- Side navigation remains usable.

### Canvas

- Canvas viewport fills the intended area.
- Nodes, image toolbar, context menu, bottom controls, and empty state render
  with expected styling.
- Zoom/history controls remain positioned.
- No hidden app sections become visibly stacked because CSS failed to load.

### Asset Library

- Floating library or asset page renders with expected spacing.
- Upload button and asset list are styled.
- Image/video/model thumbnails do not overflow their containers.

### Task Log

- Task log page layout is scoped correctly.
- Filters, refresh control, list rows, and status badges are styled.
- Existing `styles/task-log.css` worktree change must not be overwritten.

### Login Dialog

- Auth entry button and account popover render correctly.
- Login/register dialog overlay, tabs, inputs, QR panel, and action buttons are
  styled.
- Logout remains inside the account popover behavior; style changes must not
  alter interaction.
