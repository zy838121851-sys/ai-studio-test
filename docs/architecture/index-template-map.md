# Index Template Map

Date: 2026-06-30

This document maps the current `index.html` structure for staged SaaS
governance. It is documentation only. Do not use this map as permission to move,
rename, delete, or split DOM nodes without a separate behavior-equivalent
migration plan and runtime verification.

## Scope

Source inspected:

- `index.html`
- Static references from `src/client`
- Related visibility rules in `styles.css` and `styles/`

Current template size:

- `index.html` has 846 lines.
- The body contains one large `<main class="app">` that hosts home, account,
  project library, asset library, task log, canvas, chat, AI Core, menus, and
  multiple popovers.

## Top-Level Shell

| Area | Main DOM | Default state | Notes |
| --- | --- | --- | --- |
| App root | `body.app-booting`, `main.app` | Body starts in `app-booting`; `app-init.js` removes boot state. | `body[data-view]` and `app-view.active` are central to routing. |
| Side navigation | `.home-side-menu`, `[data-nav-view]` | Home button starts with `.active`. | JS updates the active nav button through `view-router.js`. |
| Script/CSS entry | `./styles.css`, `./app.js` | Always loaded from template in source/dev path. | Production build rewrites CSS/JS to hashed `dist/assets/*`. |
| Three import map | `three`, `three/examples/jsm/`, `three/addons/` | Present in `<head>`. | Supports 3D/model viewer fallback paths and must not be removed casually. |

## Main Page Areas

### Home

Current location:

- `index.html` lines 150-239

Main DOM:

- `#homeView`
- `.home-view`
- `.app-view`
- `.active`
- `.home-nav`
- `.home-stage`
- `#homePromptForm`
- `#homeUploadButton`
- `#homeFileInput`
- `#homeFilePreview`
- `#homePromptInput`
- `#homeModelPicker`
- `#homeModelSelect`
- `#homeModelButton`
- `#homeModelMenu`
- `#homeHistory`
- `.home-community-section`
- `.home-channel-shell`
- `.home-channel-strip`
- `.home-channel-all`
- `.home-channel-scroll.prev`
- `.home-channel-scroll.next`
- `#homeInspirationFeed`
- `#homeInspirationLoading`
- `#homeBackTop`

Default visibility:

- `#homeView` is the only `.app-view` that starts with `.active`.
- `body` starts as `.app-booting`; CSS hides or skeletonizes some home content
  during boot.
- `view-router.js` later sets `body.dataset.view` and toggles `.active`.

Likely JS dependencies:

- `#homeView`, `#homePromptForm`, `#homePromptInput`, `#homeModelSelect`,
  `#homeFileInput`, `#homeFilePreview`, `#homeModelButton`, `#homeModelMenu`,
  `#homeHistory`, `#homeBackTop` are collected by
  `src/client/features/workspace/runtime/ui-elements.js`.
- `#homeModelSelect`, `#homeModelMenu`, `#homeModelButton`, `#homeModelPicker`
  are used by model catalog and global interactions.
- `#homeInspirationFeed`, `#homeInspirationLoading`, `.home-channel-*`, and
  `[data-channel]` are used by the home inspiration feed.
- `.home-side-menu [data-nav-view]` is used by view routing.

Future feature target:

- `features/home`
- Model picker integration can remain shared through `features/ai` or a common
  model-selector module.

### Login, Account, and Credits

Current locations:

- Auth entry and account popover: lines 42-75
- Credit detail dialog: lines 76-147
- Auth dialog: lines 241-308

Main DOM:

- `#authEntry`
- `#authEntryButton`
- `#authAccountPopover`
- `#authAccountAvatar`
- `#authAccountName`
- `#authAccountEmail`
- `[data-auth-credits-open]`
- `[data-auth-points-value]`
- `[data-auth-menu-action]`
- `[data-auth-logout]`
- `#creditDetailDialog`
- `[data-credit-detail-close]`
- `[data-credit-tab]`
- `[data-credit-panel]`
- `[data-credit-avatar]`
- `[data-credit-name]`
- `[data-credit-email]`
- `[data-credit-short-id]`
- `[data-credit-copy-id]`
- `[data-credit-available]`
- `[data-credit-reserved]`
- `[data-credit-balance-status]`
- `[data-credit-transactions]`
- `[data-credit-transactions-status]`
- `#authDialog`
- `[data-auth-close]`
- `[data-auth-wechat-panel]`
- `#authWechatQr`
- `[data-auth-method]`
- `[data-auth-oauth]`
- `[data-auth-mode-switch]`
- `[data-auth-mode]`
- `#authForm`
- `#authName`
- `#authEmail`
- `#authPhone`
- `#authCode`
- `#authPassword`
- `#authMessage`
- `#authSendCode`
- `#authSubmit`

Default visibility:

- `#authEntry` is present at boot.
- `#authAccountPopover` starts with `.hidden` and `aria-hidden="true"`.
- `#creditDetailDialog` starts with `.hidden` and `aria-hidden="true"`.
- `#authDialog` starts with `.hidden` and `aria-hidden="true"`.
- Some auth form fields start with `.hidden` and are toggled by auth mode/method.

Likely JS dependencies:

- `src/client/features/auth/auth-entry.js` directly queries the auth and credit
  ids/data attributes listed above.
- `src/client/features/credits/quote-badges.js` scans `[data-credit-quote]` and
  related generated credit badge nodes.

Future feature target:

- `features/auth` for entry, popover, OAuth/login/register dialog.
- `features/credits` for credit detail dialog and credit quote badges.

### Model Preferences and Model Selectors

Current locations:

- Home model picker: lines 162-196
- Image edit model select: lines 610-615
- Image generator model select: lines 652-657
- Video generator model select: lines 692-695
- Chat model select: lines 818-823

Main DOM:

- `#homeModelPicker`
- `#homeModelSelect`
- `#homeModelButton`
- `#homeModelMenu`
- `#imageEditModel`
- `[data-generator-model]`
- `[data-video-generator-model]`
- `#chatModelSelect`
- `[data-model-value]`
- `[data-credit-model-source]`

Default visibility:

- Home model picker is inside active home view.
- Canvas/chat model controls are present in the large template but visibility
  depends on `body[data-view]`, popover state, or `.collapsed`/`.open` classes.

Likely JS dependencies:

- `src/client/features/ai/model-catalog.js` hydrates `#homeModelSelect`,
  `#homeModelMenu`, `#homeModelButton`, `#chatModelSelect`, `#imageEditModel`,
  and `[data-generator-model]`.
- `src/client/features/credits/quote-badges.js` reads model selectors through
  `[data-credit-model-source]`.

Future feature target:

- Shared `features/ai` model selector/catalog layer.
- Surface-specific ownership remains in `features/home`, `features/canvas`, and
  `features/workspace`.

### Project Library

Current location:

- `index.html` lines 311-318

Main DOM:

- `#projectLibraryView`
- `.project-library-view`
- `.app-view`
- `.library-nav`
- `.library-shell`
- `#projectGrid`

Default visibility:

- Present in DOM but not `.active` at initial HTML.
- Display is toggled through `view-router.js` with view value `library`.
- CSS has `body[data-view="library"]` rules for project library layout.

Likely JS dependencies:

- `#projectLibraryView` and `#projectGrid` are collected by
  `src/client/features/workspace/runtime/ui-elements.js`.
- `view-router.js` toggles `.active` on `#projectLibraryView`.
- Project cards also emit `[data-nav-view]` and `[data-new-project]`.

Future feature target:

- `features/projects`

### Task Log / Profile Space

Current location:

- `index.html` lines 320-423

Main DOM:

- `#profileView`
- `.profile-view`
- `.simple-page-view`
- `#taskLogPage`
- `#taskLogRefresh`
- `#taskLogSearch`
- `#taskLogDateFrom`
- `#taskLogDateTo`
- `#taskLogType`
- `#taskLogStatus`
- `#taskLogRows`
- `#taskLogRange`
- `#taskLogPrev`
- `#taskLogNext`
- `#taskLogLimit`
- `#taskLogModal`
- `[data-task-log-close]`
- `#taskLogDetailBody`

Default visibility:

- Present in DOM but not `.active` at initial HTML.
- Routed by `data-nav-view="space"` and `body[data-view="space"]`.
- `#taskLogModal` uses the native `hidden` attribute.

Likely JS dependencies:

- `src/client/features/workspace/task-log/task-log-runtime.js` directly queries
  all task log ids above and checks `body.dataset.view === "space"`.
- `styles/task-log.css` scopes task log layout under
  `body[data-view="space"] .profile-view`.

Future feature target:

- Runtime behavior belongs under `features/workspace/task-log` today.
- Long term, template ownership can move to `features/workspace` or a dedicated
  `features/task-log` if the product keeps task logs as a full surface.

### Asset Library

Current locations:

- Full asset page: lines 425-438
- Floating canvas library: lines 525-536

Main DOM:

- `#assetsPageView`
- `.assets-page-view`
- `.simple-page-view`
- `#assetsPageUploadAsset`
- `#assetsPageAssetList`
- `#floatingLibrary`
- `#closeLibrary`
- `#uploadAsset`
- `#assetUploadInput`
- `#assetList`
- `.asset-list`
- `.upload-asset`

Default visibility:

- `#assetsPageView` is present but not `.active` at initial HTML.
- Asset page is routed through `data-nav-view="assetsPage"` and
  `body[data-view="assetsPage"]`.
- Floating library visibility is controlled by canvas/workspace JS and CSS.

Likely JS dependencies:

- `src/client/features/workspace/runtime/ui-elements.js` collects
  `#assetsPageView`, `#assetsPageAssetList`, `#assetsPageUploadAsset`,
  `#floatingLibrary`, `#assetList`, `#uploadAsset`, and `#assetUploadInput`.
- `asset-panel.js` and `asset-library-runtime.js` directly query `#assetList`,
  `#floatingLibrary`, and `#assetsPageView`.

Future feature target:

- `features/assets`

### Workspace and Canvas

Current location:

- `index.html` lines 449-780

Main DOM:

- `#canvasArea`
- `.canvas-area`
- `.project-header`
- `#projectMenuTrigger`
- `#projectTitle`
- `#projectSaveStatus`
- `#projectMenu`
- `#toolRail`
- `#toggleToolRail`
- `.rail-btn[data-tool]`
- `[data-shape-tool]`
- `[data-pen-tool]`
- `#floatingLibrary`
- `#addNodeMenu`
- `[data-add-node]`
- `#canvasContextMenu`
- `[data-context-action]`
- `[data-context-scope]`
- `[data-image-command]`
- `[data-canvas-command]`
- `[data-export-scope]`
- `#canvasViewport`
- `#canvasWorld`
- `#emptyState`
- `.bottom-controls`
- `#zoomOutButton`
- `#zoomText`
- `#zoomInButton`
- `#zoomRange`
- `#undoButton`
- `#redoButton`
- `#returnToContentButton`

Default visibility:

- `#canvasArea` does not start with `.app-view`, `.hidden`, or `.active`.
- CSS hides `.canvas-area`, `.chat-panel`, and `.chat-float` when
  `body:not([data-view="canvas"])`.
- Canvas-specific styling is heavily scoped under `body[data-view="canvas"]`.
- If CSS fails, the canvas area can appear along with other template regions.

Likely JS dependencies:

- `src/client/features/workspace/runtime/ui-elements.js` collects many canvas
  ids including `#canvasViewport`, `#canvasWorld`, `#emptyState`, `#zoomRange`,
  `#zoomText`, `#toolRail`, `#toggleToolRail`, `#canvasContextMenu`,
  `#imageEditPopover`, and `#textFormatToolbar`.
- `canvas-viewport-events.js`, `keyboard-shortcuts.js`,
  `image-generator-workflow.js`, `video-generator-workflow.js`,
  `canvas-menu-actions.js`, and chat workflows directly query
  `#canvasViewport` or `#canvasWorld`.
- Toolbars and menus depend on `.rail-btn[data-tool]`, `[data-shape-tool]`,
  `[data-pen-tool]`, `[data-context-action]`, `[data-add-node]`, and related
  data attributes.

Future feature target:

- `features/workspace` for shell/routing and shared state.
- `features/canvas` for canvas viewport, world, tool rail, context menu, node
  interactions, image edit, image generation, video generation, 3D model nodes,
  and selection behavior.

### Image Edit, Image Generation, and Video Generation Popovers

Current locations:

- Image edit popover: lines 601-641
- Image generator popover: lines 643-682
- Video generator popover: lines 684-704

Main DOM:

- `#imageEditPopover`
- `#editImageThumb`
- `#editAddRef`
- `#editReferenceInput`
- `#imageEditPrompt`
- `#imageEditModel`
- `#imageEditSize`
- `#imageEditCount`
- `#imageEditCancel`
- `#imageEditSubmit`
- `#imageGeneratorPopover`
- `[data-image-generator-form]`
- `[data-generator-reference-list]`
- `[data-generator-add-reference]`
- `[data-generator-reference-input]`
- `[data-generator-expand]`
- `[data-image-generator-prompt]`
- `[data-generator-model]`
- `[data-generator-ratio]`
- `[data-generator-count]`
- `[data-generator-cancel]`
- `[data-generator-submit]`
- `#videoGeneratorPopover`
- `[data-video-generator-form]`
- `[data-video-generator-reference-list]`
- `[data-video-generator-add-reference]`
- `[data-video-generator-reference-input]`
- `[data-video-generator-prompt]`
- `[data-video-generator-model]`
- `[data-video-option-group]`
- `[data-video-generator-submit]`
- `[data-video-generator-status]`

Default visibility:

- Present in DOM without `hidden`.
- Expected visibility is controlled by CSS state such as `.open` and canvas
  `body[data-view="canvas"]` selectors.

Likely JS dependencies:

- `image-generator-workflow.js` uses `#imageGeneratorPopover` and the
  `[data-generator-*]` controls.
- `video-generator-workflow.js` uses `#videoGeneratorPopover` and
  `[data-video-generator-*]`.
- `image-edit-workflow.js` and related canvas workflows use `#imageEditPopover`
  and image edit controls.

Future feature target:

- `features/canvas`
- Shared model/pricing controls can keep using `features/ai` and
  `features/credits`.

### Chat Panel

Current location:

- `index.html` lines 782-840

Main DOM:

- `#chatFloat`
- `.chat-float.collapsed`
- `#chatPanel`
- `.chat-panel.collapsed`
- `#newConversation`
- `#conversationHistory`
- `#collapseChat`
- `.welcome`
- `.suggestions`
- `#chatLog`
- `#promptForm`
- `#chatImagePreview`
- `#promptInput`
- `#chatUploadImage`
- `#chatModelSelect`
- `#presetSkill`
- `#chatImageInput`

Default visibility:

- `#chatFloat` and `#chatPanel` start with `.collapsed`.
- CSS hides chat outside `body[data-view="canvas"]`.

Likely JS dependencies:

- `src/client/features/workspace/runtime/ui-elements.js` collects the chat ids.
- `prompt-workflow.js` directly queries `#promptForm`, `#promptInput`,
  `#chatModelSelect`, `#newConversation`, `#conversationHistory`, and
  `#chatLog`.
- `model-catalog.js` hydrates `#chatModelSelect`.

Future feature target:

- Existing runtime path is under `features/workspace/chat`.
- Template extraction should probably be owned by `features/workspace` with a
  `chat` sub-feature, unless the product later makes chat a standalone surface.

### AI Core / Agent

Current location:

- `index.html` lines 784-790

Main DOM:

- `#aiCore`
- `.ai-core`
- `.ai-core-orb`
- `#aiCoreHint`

Default visibility:

- Present in DOM.
- CSS has canvas-scoped AI Core rules under `body[data-view="canvas"]`.
- Runtime state currently controls whether AI Core is enabled/disabled.

Likely JS dependencies:

- Agent modules and AI Core workspace modules refer to AI Core state and UI.
- Canvas and workspace code treat agent output as part of canvas/workspace
  interaction.

Future feature target:

- `features/agent`
- Shell placement may stay under `features/workspace` until agent has a stable
  mount/dispose API.

### 3D Preview / Model3D

Current static template signals:

- Three import map in `<head>` lines 9-17.
- Task log filter option `value="model3d"` line 354.
- Asset upload accepts `.glb`, `.gltf`, `.obj`, `.fbx`, `.stl`, `.usdz`.
- Image toolbar action `data-toolbar-action="generate-3d"` is generated by
  `src/client/features/canvas/image-toolbar.js`, not hardcoded in
  `index.html`.
- 3D model node markup and model viewer are generated dynamically, not as a
  large static `index.html` section.

Likely JS dependencies:

- `src/client/features/canvas/model-viewer.js` dynamically imports Three,
  `GLTFLoader`, and `OrbitControls`.
- `prompt-workflow.js` handles 3D generation and `/api/ai/3d/*` task polling.
- `node-template.js` and canvas menu actions reference `.node-model`,
  `.model-frame`, and `.model-viewer`.

Future feature target:

- `features/model3d` for provider-facing model preview/generation concepts.
- Keep canvas node rendering integration under `features/canvas` until the
  boundary is explicit.

### Popovers, Menus, Dialogs, and Floating Panels

Current DOM:

- `#brandMenu`
- `#projectMenu`
- `#authAccountPopover`
- `#creditDetailDialog`
- `#authDialog`
- `#taskLogModal`
- `#floatingLibrary`
- `#addNodeMenu`
- `#canvasContextMenu`
- `#imageEditPopover`
- `#imageGeneratorPopover`
- `#videoGeneratorPopover`
- `#textFormatToolbar`
- Dynamically generated overlays such as conversation history, asset preview,
  generation choice, upload choice, image expand, and image text panels.

Default visibility:

- Some are hidden by `.hidden` or native `hidden`.
- Some rely on `.open`, `.collapsed`, `body[data-view]`, or CSS positioning.
- Several dynamic overlays are not present in `index.html` and are created by
  JS on demand.

Likely JS dependencies:

- `[data-brand-menu]`, `[data-new-project]`, `[data-save-project]`, and
  `[data-nav-view]` are bound from taskbar/home interactions.
- Context and canvas menus rely heavily on data attributes instead of ids.

Future feature target:

- Keep generic dialog/menu behavior in shared components only after a stable
  component contract exists.
- For now, extract by owning feature: auth dialogs to `features/auth`, asset
  panels to `features/assets`, canvas popovers to `features/canvas`, task log
  modal to task log ownership.

## DOM IDs and Classes That Should Not Be Renamed Yet

These identifiers have direct or high-confidence JS dependencies and should be
treated as locked until a migration proves replacement bindings.

Routing and views:

- `#homeView`
- `#projectLibraryView`
- `#profileView`
- `#assetsPageView`
- `.app-view`
- `.active`
- `[data-nav-view]`
- `body[data-view]`

Home:

- `#homePromptForm`
- `#homePromptInput`
- `#homeModelSelect`
- `#homeModelButton`
- `#homeModelMenu`
- `#homeModelPicker`
- `#homeFileInput`
- `#homeFilePreview`
- `#homeHistory`
- `#homeBackTop`
- `#homeInspirationFeed`
- `#homeInspirationLoading`
- `.home-channel-shell`
- `.home-channel-strip`
- `.home-channel-all`
- `.home-channel-scroll`
- `[data-channel]`

Auth and credits:

- `#authEntry`
- `#authEntryButton`
- `#authAccountPopover`
- `#authAccountAvatar`
- `#authAccountName`
- `#authAccountEmail`
- `#authDialog`
- `#authForm`
- `#authName`
- `#authEmail`
- `#authPhone`
- `#authCode`
- `#authPassword`
- `#authMessage`
- `#authSendCode`
- `#authSubmit`
- `#authWechatQr`
- `#creditDetailDialog`
- `[data-auth-*]`
- `[data-credit-*]`

Projects and assets:

- `#projectGrid`
- `#assetsPageView`
- `#assetsPageUploadAsset`
- `#assetsPageAssetList`
- `#floatingLibrary`
- `#assetList`
- `#uploadAsset`
- `#assetUploadInput`
- `.assets-page-view`
- `.asset-list`
- `.upload-asset`

Canvas:

- `#canvasArea`
- `#canvasViewport`
- `#canvasWorld`
- `#emptyState`
- `#toolRail`
- `#toggleToolRail`
- `#canvasContextMenu`
- `#addNodeMenu`
- `#imageEditPopover`
- `#imageGeneratorPopover`
- `#videoGeneratorPopover`
- `#textFormatToolbar`
- `#zoomText`
- `#zoomRange`
- `#undoButton`
- `#redoButton`
- `.canvas-area`
- `.canvas-viewport`
- `.canvas-world`
- `.rail-btn`
- `[data-tool]`
- `[data-shape-tool]`
- `[data-pen-tool]`
- `[data-context-action]`
- `[data-image-command]`
- `[data-canvas-command]`
- `[data-add-node]`
- `[data-generator-*]`
- `[data-video-generator-*]`

Chat:

- `#chatFloat`
- `#chatPanel`
- `#chatLog`
- `#promptForm`
- `#promptInput`
- `#chatImagePreview`
- `#chatUploadImage`
- `#chatImageInput`
- `#chatModelSelect`
- `#presetSkill`
- `#newConversation`
- `#conversationHistory`
- `#collapseChat`
- `.chat-panel`
- `.chat-float`
- `.collapsed`

Task log:

- `#taskLogPage`
- `#taskLogRefresh`
- `#taskLogSearch`
- `#taskLogDateFrom`
- `#taskLogDateTo`
- `#taskLogType`
- `#taskLogStatus`
- `#taskLogRows`
- `#taskLogRange`
- `#taskLogPrev`
- `#taskLogNext`
- `#taskLogLimit`
- `#taskLogModal`
- `#taskLogDetailBody`
- `[data-task-log-*]`

Agent and 3D:

- `#aiCore`
- `#aiCoreHint`
- `.ai-core`
- `.node-model`
- `.model-frame`
- `.model-viewer`
- `value="model3d"`
- `data-toolbar-action="generate-3d"`

## Visibility and State Model

Current state controls:

- HTML starts with `body.app-booting`.
- `app-init.js` removes boot state after startup.
- `view-router.js` sets `body.dataset.view`.
- `view-router.js` toggles `.active` on `#homeView`, `#projectLibraryView`,
  `#profileView`, and `#assetsPageView`.
- CSS hides `.canvas-area`, `.chat-panel`, and `.chat-float` unless
  `body[data-view="canvas"]`.
- Dialogs and popovers use mixed strategies:
  - `.hidden`
  - native `hidden`
  - `.open`
  - `.collapsed`
  - `aria-hidden`
  - `body[data-view]`

Risk:

- Visibility is split across HTML defaults, JS state, and CSS selectors.
- A missing CSS file can reveal multiple regions at the same time.
- A template split that changes default classes or ids can break boot, routing,
  auth, task log, canvas, or chat before any visible feature code runs.

## Future Template Ownership Map

| Future area | Candidate DOM ownership | Notes |
| --- | --- | --- |
| `features/home` | `#homeView`, home prompt, history, inspiration feed, home back-top | Keep model selector contract shared with `features/ai`. |
| `features/auth` | `#authEntry`, account popover, `#authDialog`, OAuth/login/register form | Credit dialog may move to `features/credits`. |
| `features/workspace` | App shell, view routing, side nav, brand/project menus, workspace state | Should own composition and feature mounting. |
| `features/canvas` | `#canvasArea`, viewport/world, tool rail, context menu, image/video popovers, text toolbar | Split only after searching all id/data/class references. |
| `features/assets` | `#assetsPageView`, floating library, asset upload/list surfaces | Shared asset rendering currently spans page and canvas panel. |
| `features/projects` | `#projectLibraryView`, `#projectGrid`, project cards/actions | Project actions also appear in brand/project menus. |
| `features/credits` | `#creditDetailDialog`, `[data-credit-*]`, quote badge targets | Interacts with auth entry and generation buttons. |
| `features/agent` | `#aiCore`, AI Core workspace/panels, suggestions | Keep shell placement stable until agent mount/dispose is explicit. |
| `features/model3d` | 3D model viewer/generation concepts, task type, model nodes | Static template has only import map/task signals; most UI is generated. |

## High-Risk Areas

1. Template content is too concentrated.
   `index.html` contains nearly every product surface, including home, auth,
   credits, projects, assets, canvas, chat, task logs, and popovers.

2. CSS failure exposes multiple regions.
   Several regions rely on CSS selectors such as `.app-view.active`,
   `body[data-view]`, `.hidden`, `.collapsed`, and `.open`. If CSS is missing
   or served with the wrong MIME type, canvas/chat/page panels can become
   simultaneously visible.

3. DOM ids and data attributes are strongly coupled to JS.
   Many modules query ids directly. Renaming ids/classes/data attributes without
   a compatibility layer will break runtime initialization.

4. Visibility state is fragmented.
   Some areas use `.hidden`, some use native `hidden`, some use `.collapsed`,
   some use `.open`, and page routing uses `body[data-view]` plus `.active`.

5. Canvas and chat are not isolated template islands.
   Chat, generation, asset, taskbar, and canvas workflows share DOM state and
   selectors such as `#canvasWorld`, `#canvasViewport`, `#chatModelSelect`, and
   `[data-credit-*]`.

6. 3D is mostly dynamic.
   A future 3D extraction cannot be done from `index.html` alone because model
   nodes and viewer DOM are generated in canvas modules.

7. Existing unrelated worktree changes exist.
   `styles/task-log.css` has a pre-existing uncommitted change and must stay out
   of template governance batches unless explicitly requested.

## Recommended Split Order

Phase 1: Documentation only.

- Keep DOM in `index.html`.
- Add structure maps like this file.
- Optionally add comments only in a later, explicit documentation pass.

Phase 2: Behavior-equivalent extraction.

- Move one area at a time.
- Before moving an area, run `rg` for every id, class, and data attribute in
  `src/client`, `styles`, and tests/scripts.
- Preserve the exact rendered DOM or provide a temporary compatibility adapter.
- Run `npm run check` and `npm run build`.
- For visual areas, perform page smoke checks after build.

Suggested extraction sequence:

1. Auth dialog/account popover, because it has clear id/data ownership in
   `features/auth`.
2. Task log template, because it is already strongly grouped under
   `features/workspace/task-log` and `styles/task-log.css`.
3. Project library, because the static shell is small and `#projectGrid` is the
   main render target.
4. Assets page and floating library, only after deciding how shared page/canvas
   asset surfaces should be owned.
5. Home view, after model picker and inspiration feed ownership is explicit.
6. Canvas and chat last, because they have the largest cross-feature coupling.

Guardrails for every split:

- Do not rename ids or data attributes in the same batch as moving markup.
- Do not change layout, UI copy, or interaction behavior.
- Do not delete old DOM until runtime paths prove the replacement is mounted.
- Do not split multiple feature areas in one task.
- Keep rollback simple: one commit per area.
