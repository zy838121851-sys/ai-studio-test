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
styles/features/node-image-panels.css
styles/features/node-stack.css
styles/features/node-director.css
styles/features/node-media.css
styles/features/node-generation.css
styles/features/node-image-generator.css
styles/features/node-preview.css
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

`styles/features/assets-pinterest.css` currently imports:

```text
styles/features/assets-pinterest-board.css
```

`styles/features/home.css` currently imports:

```text
styles/features/home-history.css
styles/features/home-community.css
styles/features/home-shell.css
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

`styles/legacy-canvas-visual.css` currently imports:

```text
styles/legacy-canvas-visual-shape-tools.css
styles/legacy-canvas-visual-media.css
styles/legacy-canvas-visual-shell.css
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
- `features/assets-page.css` owns floating asset library shell, upload
  button/list basics, asset page shell, and first-pass Pinterest-style asset
  page overview styles; it is imported by `features/assets.css`.
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
- `features/assets-pinterest.css` owns asset page Pinterest refresh layout,
  stats, board/masonry refinements, selection bar, and asset page interaction
  refinement styles; it imports `features/assets-pinterest-board.css` and is
  imported by `features/assets.css`.
- `features/assets.css` is now an asset feature CSS aggregation entry for asset
  submodules.
- `legacy-node.css` is currently a compatibility shim with no active selector
  ownership and is intentionally outside the active CSS import graph.
- `features/node-base.css` owns base node/card/resize/action styles that were
  moved out of `legacy-node.css`; it is imported at the top of
  `features/node.css`.
- `features/node-image-edit.css` owns crop controls, expand controls, and
  crop/expand edit-state visibility suppression; it is imported by
  `features/node.css` immediately after node base styles to preserve the
  previous cascade position.
- `features/node-state.css` owns generic node zoom/selected/source/label state
  styles; it is imported before image toolbar styles to preserve the previous
  cascade position.
- `features/node-image-toolbar.css` owns image node toolbar, toolbar menu,
  upscale controls, and canvas asset savebar styles.
- `features/node-image-panels.css` owns image text panel and image lightbox
  styles.
- `features/node-stack.css` owns stack/folded node styles.
- `features/node-director.css` owns director node styles.
- `features/node-media.css` owns image/video/model node shell, image frame, and
  video file preview styles.
- `features/node-generation.css` owns temporary generation preview frame and
  shimmer animation styles.
- `features/node-image-generator.css` owns image generator node frame/panel
  styles and tail-end node generator inline edit controls.
- `features/node-preview.css` owns media/model/video preview helper, cube
  preview, and bottom control styles.
- `features/node.css` is now a feature CSS aggregation entry for node
  submodules.
- `features/home-history.css` owns home recent project/history stack, grid,
  card, thumbnail, preview fallback, and delete-control styles.
- `features/home-community.css` owns home community channels, masonry feed,
  back-to-top control, inspiration grid, and placeholder sweep animation
  styles.
- `features/home-shell.css` owns home boot skeleton, shell, prompt, upload
  preview, model picker, send control, and home/canvas transition animation
  styles.
- `features/home.css` imports `features/home-history.css`,
  `features/home-community.css`, and `features/home-shell.css`, then keeps
  responsive overrides for the home feature submodules.
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
- `legacy-theme-sync-node-media.css` owns dark node/card theme synchronization,
  generation choice and AI panel theme surfaces, canvas media node transparent
  frame polish, loading-image generation frame theme polish, and stack
  drop-target theme overrides.
- `legacy-theme-sync-compact-select.css` owns compact select base, image-edit
  compact select, composer compact select, responsive compact select, and
  compact select option state styles.
- `legacy-theme-sync-model-preference.css` owns model preference menu, chat
  model menu, image generator model menu, model preference panel, option, tag,
  and generator select option color-fix theme styles.
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
- `legacy-canvas-shell.css` owns the first legacy canvas shell block: canvas
  area background, project header/logo, top actions, tool rail, add-node menu,
  canvas context menu, selection action bar, and related mobile selection-bar
  overrides.
- `legacy-canvas-image-edit.css` owns image edit popover and image generator
  popover control styles.
- `legacy-canvas-add-node.css` owns add-node menu detail styles and canvas-view
  add-node menu overrides.
- `legacy-canvas-choice-overlays.css` owns canvas viewport cursor states, upload
  choice bubbles, generation choice overlay, floating suggestions, and related
  keyframes.
- `legacy-canvas-world.css` owns canvas selection box, canvas world, empty
  state, hint line, and quick action styles.
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
- `legacy-canvas-visual-shape-tools.css` owns canvas object selected visuals,
  draw-shape visuals, canvas text editor, shape format toolbar, shape color
  popover, stroke width control, text format toolbar, and text color picker
  styles.
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
styles/features/auth.css
styles/features/assets-page.css
styles/features/assets-board.css
styles/features/assets-save.css
styles/features/assets-picker.css
styles/features/assets-canvas-picker.css
styles/features/assets-context-menu.css
styles/features/assets-pinterest-board.css
styles/features/assets-pinterest.css
styles/features/assets.css
styles/features/chat.css
styles/features/home.css
styles/features/home-history.css
styles/features/home-community.css
styles/features/home-shell.css
styles/features/node-base.css
styles/features/node-image-edit.css
styles/features/node-state.css
styles/features/node-image-toolbar.css
styles/features/node-image-panels.css
styles/features/node-stack.css
styles/features/node-director.css
styles/features/node-media.css
styles/features/node-generation.css
styles/features/node-image-generator.css
styles/features/node-preview.css
styles/features/node.css
styles/features/project-library.css
styles/components.css
styles/image-compare.css
styles/task-log.css
styles/legacy-split.css
styles/legacy-base.css
styles/legacy-canvas-shell.css
styles/legacy-canvas-image-edit.css
styles/legacy-canvas-add-node.css
styles/legacy-canvas-choice-overlays.css
styles/legacy-canvas-world.css
styles/legacy-canvas-video-generator.css
styles/legacy-canvas-project-header.css
styles/legacy-canvas-library.css
styles/legacy-canvas.css
styles/legacy-canvas-visual-shape-tools.css
styles/legacy-canvas-visual-media.css
styles/legacy-canvas-visual-shell.css
styles/legacy-canvas-visual.css
styles/legacy-chat.css
styles/legacy-node.css
styles/legacy-overrides.css
styles/legacy-compact-controls.css
styles/legacy-rail-polish.css
styles/legacy-light-refinements.css
styles/legacy-theme-ios.css
styles/legacy-theme-sync-base.css
styles/legacy-theme-sync-surfaces.css
styles/legacy-theme-sync-image-edit.css
styles/legacy-theme-sync-crop-expand.css
styles/legacy-theme-sync-media-edit.css
styles/legacy-theme-sync-node-media.css
styles/legacy-theme-sync-compact-select.css
styles/legacy-theme-sync-model-preference.css
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
  in `styles/legacy-chat.css`. Selection group color swatches now use
  `selection-swatch-*` classes instead of inline `--swatch` style attributes.
- Keep `scripts/check-inline-style-categories.js` in `npm run check` to prevent
  the remaining inline style surface from becoming an undifferentiated bucket.
  Its current categories are agent runtime, AI editor dynamic runtime, canvas
  dynamic runtime, serialization/export/snapshot, and workspace floating UI
  runtime. Treat serialization/export/snapshot as the highest-risk category.
- Keep `scripts/check-style-entry.js` as the static CSS entry and selector guard.
  It now checks key selectors for feature CSS plus the legacy canvas and chat
  modules, including migrated asset page selectors in `features/assets-page.css`,
  migrated asset board selectors in `features/assets-board.css`, migrated asset
  save selectors in `features/assets-save.css`, migrated asset picker selectors
  in `features/assets-picker.css`, migrated canvas asset picker selectors in
  `features/assets-canvas-picker.css`, migrated asset context menu selectors in
  `features/assets-context-menu.css`, migrated asset Pinterest board selectors
  in `features/assets-pinterest-board.css`, migrated asset Pinterest selectors
  in `features/assets-pinterest.css`, migrated node base selectors in
  `features/node-base.css`,
  migrated image edit selectors in `features/node-image-edit.css`, migrated node
  state selectors in `features/node-state.css`, migrated image toolbar selectors
  in `features/node-image-toolbar.css`, migrated image panel selectors in
  `features/node-image-panels.css`, migrated stack selectors in
  `features/node-stack.css`, migrated director selectors in
  `features/node-director.css`, migrated media node selectors in
  `features/node-media.css`, migrated generation preview selectors in
  `features/node-generation.css`, migrated image generator selectors in
  `features/node-image-generator.css`, migrated preview selectors in
  `features/node-preview.css`, and the node aggregation entry in
  `features/node.css`; it also keeps compatibility shims such as
  `legacy-node.css` outside the active import graph, and guards the
  `legacy-canvas.css` imports of `legacy-canvas-shell.css` and
  `legacy-canvas-image-edit.css`, `legacy-canvas-add-node.css`, and
  `legacy-canvas-choice-overlays.css`, `legacy-canvas-world.css`, and
  `legacy-canvas-video-generator.css`, and
  `legacy-canvas-project-header.css`, and `legacy-canvas-library.css`, plus
  the `legacy-canvas-visual.css` import of
  `legacy-canvas-visual-shape-tools.css` and
  `legacy-canvas-visual-media.css` and
  `legacy-canvas-visual-shell.css` and selectors in the canvas files.
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
