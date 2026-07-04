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
dist/assets/index-Ca4_DQ85.css
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
```

`styles/legacy-split.css` currently imports:

```text
styles/legacy-base.css
styles/legacy-assets.css
styles/legacy-canvas.css
styles/legacy-canvas-visual.css
styles/legacy-chat.css
styles/legacy-node.css
styles/legacy-overrides.css
styles/legacy-compact-controls.css
styles/legacy-rail-polish.css
styles/legacy-light-refinements.css
styles/legacy-theme-ios.css
styles/legacy-theme-sync.css
styles/legacy-ai-core.css
styles/legacy-ai-core-analysis.css
styles/legacy-ai-core-workspace.css
styles/legacy-ai-core-ambient.css
styles/menu-select-overrides.css
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
styles/legacy-ai-core.css
styles/legacy-ai-core-ambient.css
styles/legacy-ai-core-analysis.css
styles/legacy-ai-core-workspace.css
styles/legacy-assets.css
styles/legacy-base.css
styles/legacy-canvas.css
styles/legacy-canvas-visual.css
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
styles/components.css
styles/image-compare.css
styles/task-log.css
styles/legacy-split.css
styles/legacy-base.css
styles/legacy-assets.css
styles/legacy-canvas.css
styles/legacy-canvas-visual.css
styles/legacy-chat.css
styles/legacy-node.css
styles/legacy-overrides.css
styles/legacy-compact-controls.css
styles/legacy-rail-polish.css
styles/legacy-light-refinements.css
styles/legacy-theme-ios.css
styles/legacy-theme-sync.css
styles/legacy-ai-core.css
styles/legacy-ai-core-analysis.css
styles/legacy-ai-core-workspace.css
styles/legacy-ai-core-ambient.css
styles/menu-select-overrides.css
```

Additional caution:

- `styles/task-log.css` currently has an unrelated pre-existing worktree change.
  Do not include it in cleanup batches unless explicitly requested.
- Class reachability cannot be proven from ESM imports alone. CSS deletion needs
  both import evidence and visual/runtime evidence.

## CSS Governance Recommendations

- Keep `styles.css` as the documented source entry until a deliberate style
  entry migration is planned.
- Keep `scripts/check-inline-style-surface.js` in `npm run check` while
  reducing `style-src 'unsafe-inline'` dependencies. The current baseline is 53
  files with inline style dependencies, including 21 `style=` attributes, 7
  `setAttribute("style")` calls, 299 `.style` operations, and 2 `cssText`
  writes. `index.html` is no longer an allowed inline style dependency file.
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
