# Runtime Event Map

Date: 2026-06-30

This document records the current frontend runtime mount points, event
delegation roots, state-switching nodes, and high-risk interaction chains. It is
documentation only. It does not authorize moving, renaming, deleting, or
splitting DOM.

## Scope

Sources inspected in this pass:

- `index.html`
- `src/client/core/app-init.js`
- `src/client/features/workspace/`
- `src/client/features/canvas/`
- `src/client/features/ai/`
- `src/client/features/auth/`

Notes:

- `src/client/features/assets/` does not currently exist. The active asset
  runtime is under `src/client/features/workspace/asset-library/`.
- This pass did not scan the whole project, did not analyze all styles, and did
  not modify runtime code.
- Existing unrelated `styles/task-log.css` worktree changes remain out of
  scope.

## Runtime Mount Points

| Mount / root | Current DOM | Main initializer | Runtime role | Risk |
| --- | --- | --- | --- | --- |
| App boot state | `document.body`, `.app` | `src/client/core/app-init.js` | Removes `app-booting`, sets `app-ready` or `app-boot-failed`, then exposes `window.AIStudio`. | Critical. Body classes and `.app` are runtime state. |
| Workspace app | `document`, `.app`, collected elements | `app-init.js` -> `mountWorkspaceApp()` -> `startWorkspaceApp()` | Builds workspace runtime, routes views, bridges compatibility layer, initializes home helpers. | Critical. This is the main client composition root. |
| Workspace DOM registry | `collectWorkspaceUiElements(document)` | `src/client/features/workspace/runtime/ui-elements.js` | Collects home, project, asset, canvas, chat, popover, and control elements. | Critical. Many modules receive these handles rather than re-querying. |
| View router | `#homeView`, `#projectLibraryView`, `#profileView`, `#assetsPageView`, `.home-side-menu [data-nav-view]`, `body[data-view]` | `src/client/features/workspace/routing/view-router.js` and `view-runtime.js` | Sets `body.dataset.view`, toggles `.active` and `.view-*` classes. | Critical. Moving view roots can break routing and CSS visibility. |
| Canvas surface | `#canvasViewport`, `#canvasWorld`, `#emptyState`, `#toolRail`, `#canvasContextMenu`, `#addNodeMenu` | `src/client/features/canvas/*`, workspace canvas composition/runtime | Canvas pan/zoom, drop, selection, node lifecycle, context menus, tools. | Critical. Shared by canvas, chat, AI, assets, agent, taskbar. |
| Chat | `#chatPanel`, `#chatFloat`, `#chatLog`, `#promptForm`, `#promptInput`, `#chatModelSelect` | `src/client/features/workspace/chat/runtime/*`, `prompt-workflow.js`, `task-bar.js` | Chat panel state, prompt submit, generation result rendering, conversation controls. | Critical. Prompt submit has multiple bindings/entry paths. |
| Asset library | `#floatingLibrary`, `#assetList`, `#assetsPageView`, `#assetsPageAssetList`, `#assetUploadInput` | `src/client/features/workspace/asset-library/asset-panel.js`, `asset-library-runtime.js` | Floating library, full asset page, upload, drag-to-canvas, insert/preview/context actions. | High. Asset feature is physically under workspace today. |
| Auth and credits | `#authEntry`, `#authEntryButton`, `#authAccountPopover`, `#authDialog`, `#creditDetailDialog` | `src/client/features/auth/auth-entry.js` | Current user entry, login/register/OAuth, account popover, credit detail dialog. | Critical. Visibility, logout, credits, and auth state share this root. |
| AI/model selectors | `#homeModelSelect`, `#homeModelMenu`, `#homeModelButton`, `#chatModelSelect`, `#imageEditModel`, `[data-generator-model]` | `src/client/features/ai/model-catalog.js`, `model-preference-menu.js` | Hydrates model options and stores selected model metadata on select datasets. | High. Cross-surface model state. |
| Image/video generator popovers | `#imageGeneratorPopover`, `#videoGeneratorPopover`, `#imageEditPopover` | `image-generator-workflow.js`, `video-generator-workflow.js`, `image-edit-workflow.js` | Popover control roots for generation/editing and mutual close behavior. | Critical. Popovers are positioned relative to selected canvas nodes. |
| Task log | `#profileView`, `#taskLogPage`, `#taskLogRows`, `#taskLogModal` | `src/client/features/workspace/task-log/task-log-runtime.js` | Lazy load when `body[data-view="space"]` or profile view is active; modal row actions. | High. Watches body `data-view` with `MutationObserver`. |

## Event Delegation Roots

| Event root | Event types | Trigger selectors / data | Main handler files | Notes |
| --- | --- | --- | --- | --- |
| `document` / root document | `keydown`, `pointerdown`, custom events, resize-adjacent events | Escape close behavior, `canvas:*`, `ai-studio-*` | `auth-entry.js`, `prompt-workflow.js`, `image-generator-workflow.js`, `video-generator-workflow.js`, `asset-library-runtime.js`, `task-log-runtime.js` | Global events close menus/popovers and sync auth/model/task state. |
| `.app` / app root | `click`, `dragover`, `drop` | `[data-brand-menu]`, model/tool buttons, drag upload paths | `global-interactions.js`, `footer-events.js`, `app-interactions.js` | Some interaction modules are compatibility-style wrappers and overlap taskbar/canvas behavior. |
| `#canvasViewport` | `pointerdown`, `pointermove`, `pointerup`, `pointercancel`, `wheel`, `contextmenu`, `dblclick`, `auxclick`, `dragover`, `dragenter`, `dragleave`, `drop` | `.node-card`, `.canvas-object`, `.model-viewer`, `.image-edit-popover`, `[data-image-generator-form]` | `canvas-viewport-events.js` | Highest-risk event surface. Handles pan/zoom, selection box, drawing, eraser, context menu, external/asset drops, AI Core drop routing. |
| `#canvasWorld` | `dblclick`, `pointerdown`, `dragover`, `dragleave`, `drop`, custom selection events | `.node-image-generator`, `.node-video`, `.node-card`, `data-node-id` | `image-generator-workflow.js`, `video-generator-workflow.js`, `node-drag-workflow.js`, selection workflows | Node-level delegation and generated node state live here. |
| `#canvasContextMenu` | `pointerdown`, `click` | `[data-context-action]`, `[data-canvas-command]`, `[data-image-command]`, `[data-export-scope]` | `canvas-menu-actions.js`, `canvas-menu-workflow.js` | Context action routing. Moving menu children without preserving data attributes breaks commands. |
| `#addNodeMenu` | `pointerdown`, `click` | `[data-add-node]` | `canvas-menu-actions.js` | Add/upload/model node entry point. Uses `assetUploadInput.dataset.uploadIntent = "canvas"` for upload ownership. |
| `#toolRail` and rail buttons | `click` | `.rail-btn[data-tool]`, `.rail-btn[data-panel]`, `[data-shape-tool]`, `[data-pen-tool]` | `canvas-toolbar.js`, `tool-bindings.js`, `task-bar.js`, compatibility interaction modules | Tool state and asset panel open are coupled through classes and data attributes. |
| `#promptForm` | `submit`, `dragenter`, `dragover`, `dragleave`, `drop` | submitter id/class/data, chat attachments, pending home attachments | `prompt-workflow.js`, `task-bar.js`, `home-library-interactions.js` | Critical generation chain. Also stores `__pendingHomeGenerationFiles` and `__pendingHomeGenerationModel`. |
| `#homePromptForm` | `submit` | home prompt and selected files/model | `home-workflow.js` | Home-to-canvas generation path. Calls `generateHomeProject`. |
| `#homeModelMenu` | `click`, `wheel` | `[data-model-value]` | `home-workflow.js`, `model-catalog.js`, `global-interactions.js` | Custom picker depends on `#homeModelPicker.open` and model select dataset fields. |
| `#imageGeneratorPopover` | `pointerdown`, `dblclick`, `wheel`, `click`, `change`, `submit` | `[data-generator-*]`, `[data-image-generator-form]`, `[data-image-generator-prompt]` | `image-generator-workflow.js` | Controls prompt, references, ratio, count, model, submit/cancel/expand. |
| `#videoGeneratorPopover` | `pointerdown`, `dblclick`, `wheel`, `click`, `change`, `submit` | `[data-video-generator-*]`, `[data-video-option]` | `video-generator-workflow.js` | Opens on video node selection and closes on image generator selection/context close. |
| `#imageEditPopover` | `pointerdown`, `dblclick`, `wheel`, button/input events | `#editAddRef`, `#editReferenceInput`, `#imageEditPrompt`, `#imageEditSubmit`, `#imageEditCancel` | `image-edit-workflow.js`, `canvas-menu-actions.js`, compatibility interaction modules | Must stay isolated from canvas pointer propagation. |
| `#assetList` / `#assetsPageAssetList` | `click`, `contextmenu`, `scroll`, `dragstart` | `[data-asset-*]`, `.asset-item[data-id]`, `[data-asset-context-menu]` | `asset-library-runtime.js`, `asset-panel.js` | Delegated asset insert, preview, bulk select, move, delete, context menu, drag-to-canvas. |
| `#assetsPageView` | `wheel` | `body[data-view="assetsPage"]`, `data-asset-scroll-bound` | `asset-library-runtime.js` | Page scroll fallback is bound once by dataset guard. |
| `#assetUploadInput` | `change` | `dataset.uploadIntent`, `dataset.uploadHandledByLibrary` | `asset-library-runtime.js`, `canvas-menu-actions.js`, home/chat upload handlers | Upload ownership is inferred from dataset flags. |
| `#authEntry` / `#authEntryButton` | `click`, `mouseenter`, `mouseleave`, `focusin`, `focusout` | auth entry user state | `auth-entry.js` | Hover/focus opens account popover; click opens auth dialog or toggles account menu. |
| `#authAccountPopover` | `click` | `[data-auth-credits-open]`, `[data-auth-logout]` | `auth-entry.js` | Logout is only delegated through `[data-auth-logout]`. |
| `#authDialog` / `#authForm` | `click`, `submit`, Escape from root | `[data-auth-close]`, `[data-auth-method]`, `[data-auth-mode]`, `[data-auth-oauth]` | `auth-entry.js` | Login/register/OAuth method switching depends on data attributes and `.hidden`/`.active`. |
| `#creditDetailDialog` | `click` | `[data-credit-detail-close]`, `[data-credit-tab]`, `[data-credit-copy-id]` | `auth-entry.js` | Credit tab visibility uses `[data-credit-panel]` plus `.active`. |
| `#taskLogPage` / `#taskLogRows` / `#taskLogModal` | `click`, `input`, `change`, Escape | `[data-task-log-detail]`, `[data-task-log-copy]`, `[data-task-log-output]`, `[data-task-log-close]` | `task-log-runtime.js` | Runtime binds once with `data-task-log-bound` and refreshes when space view becomes visible. |

## State Switching Nodes

### Global and routing state

- `body.classList`: `app-booting`, `app-ready`, `app-boot-failed`,
  `canvas-has-multi-selection`, `canvas-has-compare-selection`.
- `body.dataset.view`: `home`, `canvas`, `library`, `space`, `assetsPage`.
- `.app`: toggles `view-home`, `view-canvas`, `view-library`, `view-space`,
  `view-assets-page`, and runtime states such as `ai-core-awake` and
  `upload-choosing`.
- `.app-view.active`: controls home/library/space/assets page routed surfaces.

### Common state classes

- `.active`: routed view, nav button, credit tab/panel, auth method/mode,
  selected model/channel/tool/thinking step.
- `.hidden`: auth/account/credit dialogs, auth form fields, empty state,
  hidden canvas nodes.
- `.collapsed`: chat panel/floating chat and tool rail.
- `.open`: brand/project menus, home model picker, asset panel, popovers,
  overlays, generator custom selects, lightboxes.
- `.selected`: canvas nodes, model options, video options, asset selection.
- `.loading`: chat/task progress, task log refresh, image text panel,
  generation previews.
- `disabled` / `.disabled`: auth submit/code buttons, generation controls,
  task output buttons, async command guards.

### Canvas-specific state

- `#canvasViewport`: `dragging`, `selecting`, `drawing`, `erasing`,
  `tool-draw`, `tool-text`, `tool-eraser`.
- Canvas nodes: `.selected`, `.generation-failed`, `.has-generator-result`,
  `.generator-busy`, `.generator-drop-active`, `.canvas-shape`, `.canvas-text`,
  `.node-image`, `.node-video`, `.node-model`, `.node-image-generator`.
- Node datasets: `data-node-id`, `data-active-selection`, `data-generator-*`,
  `data-video-generator-*`, `data-asset-*`, `data-source-*`.

### One-time binding guards

- `#taskLogPage.dataset.taskLogBound`.
- `#assetsPageView.dataset.assetScrollBound`.
- Asset list `dataset.assetRuntimeBound`.
- Model selects `dataset.modelCatalogBound`.
- Generator selects `dataset.generatorCustomReady`.

These dataset flags are behavior guards. Removing them during template
extraction can double-bind handlers.

## High-Risk Interaction Chains

### Home enters canvas

1. `#homePromptForm` submits in `home-workflow.js`.
2. Home files come from `#homeFileInput`; model comes from `#homeModelSelect`
   and `[data-model-value]`.
3. `generateHomeProject(prompt, model, files)` is called through workspace
   actions.
4. Runtime records a `prompt_submitted` canvas event and later switches view to
   canvas through workspace routing/composition.

Risk:

- `#homePromptForm`, `#homePromptInput`, `#homeModelSelect`,
  `#homeModelPicker`, `#homeModelMenu`, and `[data-model-value]` are not safe to
  rename or move until the home generation handoff is explicitly abstracted.

### Chat prompt submit generation

1. `#promptForm` submit is bound in `prompt-workflow.js`; `task-bar.js` can also
   bind prompt submit when configured.
2. `#promptInput`, `#chatModelSelect`, chat image preview attachments, and
   pending home-generation fields are read.
3. The workflow creates chat/progress blocks, canvas previews, calls AI APIs,
   replaces previews with image/video/model nodes, saves project state, and
   refreshes credits.

Risk:

- `#promptForm`, `#promptInput`, `#chatModelSelect`, `#chatLog`,
  `#canvasViewport`, and `#canvasWorld` form one chain. Do not move any one of
  them independently.

### Image, video, and 3D generation popovers

1. `#imageGeneratorPopover` binds click/change/submit to `[data-generator-*]`.
2. `#videoGeneratorPopover` binds click/change/submit to
   `[data-video-generator-*]` and opens from `.node-video` selection.
3. `#imageEditPopover` uses stop-propagation handlers and edit controls.
4. 3D generation requests are dispatched through
   `canvas:image-to-3d-requested` and handled in `prompt-workflow.js`.

Risk:

- Popovers are moved to `document.body` or positioned relative to selected
  nodes. Their ids, `.open`, and data attributes are runtime contracts.

### Canvas node selection

1. `#canvasViewport` pointer events create selection boxes, pan, draw, erase,
   and context menu behavior.
2. `canvas-selection.js` toggles `.selected` and `data-active-selection` on
   `.node-card` / `.canvas-object`.
3. Selection changes drive image generator/video popovers, taskbar behavior,
   source badges, keyboard shortcuts, and generated node actions.

Risk:

- `#canvasWorld`, `#canvasViewport`, `.node-card`, `.canvas-object`,
  `.selected`, `data-node-id`, and `data-active-selection` must be treated as
  locked.

### Asset library open and insert

1. Rail buttons with `.rail-btn[data-panel]` open `#floatingLibrary`.
2. `asset-library-runtime.js` binds `#assetList` and `#assetsPageAssetList`.
3. Delegated `[data-asset-*]` buttons insert, preview, delete, move, select, or
   drag assets.
4. Canvas drop reads `event.dataTransfer.getData("text/plain")` and maps asset
   ids to canvas nodes.

Risk:

- `#floatingLibrary`, `#assetList`, `#assetsPageAssetList`, `.asset-item[data-id]`,
  and `data-asset-*` are coupled to both page and canvas flows.

### Login dialog and account popover

1. `#authEntryButton` opens `#authDialog` when signed out.
2. When signed in, hover/focus/click around `#authEntry` and
   `#authAccountPopover` controls the account menu.
3. `[data-auth-logout]` is the logout action.
4. `[data-auth-credits-open]` opens `#creditDetailDialog`.

Risk:

- Do not move account popover away from `#authEntry` without preserving
  hover/focus leave timing and `aria-expanded`/`aria-hidden` updates.

### Task log open

1. Navigation sets `body.dataset.view = "space"` and activates `#profileView`.
2. `task-log-runtime.js` observes `body[data-view]`.
3. When visible, it loads jobs, starts auto-refresh, and binds row/modal actions.
4. `#taskLogRows` delegates `[data-task-log-detail]`,
   `[data-task-log-copy]`, and `[data-task-log-output]`.

Risk:

- `#profileView`, `#taskLogPage`, `#taskLogRows`, `#taskLogModal`, and
  `body[data-view="space"]` must stay stable.

## DOM Temporarily Not Safe To Move Or Rename

Highest-risk set only:

1. `body[data-view]`
2. `.app`
3. `.app-view`
4. `.home-side-menu [data-nav-view]`
5. `#homeView`
6. `#homePromptForm`
7. `#homePromptInput`
8. `#homeModelSelect`
9. `#homeModelMenu`
10. `#projectLibraryView`
11. `#profileView`
12. `#assetsPageView`
13. `#authEntry`
14. `#authEntryButton`
15. `#authAccountPopover`
16. `#authDialog`
17. `#creditDetailDialog`
18. `#floatingLibrary`
19. `#assetList`
20. `#assetsPageAssetList`
21. `#assetUploadInput`
22. `#canvasViewport`
23. `#canvasWorld`
24. `#canvasContextMenu`
25. `#addNodeMenu`
26. `#toolRail`
27. `.rail-btn[data-tool]`
28. `[data-shape-tool]`
29. `[data-pen-tool]`
30. `[data-context-action]`
31. `[data-add-node]`
32. `#imageEditPopover`
33. `#imageGeneratorPopover`
34. `#videoGeneratorPopover`
35. `#chatPanel`
36. `#chatFloat`
37. `#chatLog`
38. `#promptForm`
39. `#promptInput`
40. `#chatModelSelect`

Runtime-generated selectors also locked:

- `.node-card`
- `.canvas-object`
- `.selected`
- `data-node-id`
- `data-active-selection`
- `data-generator-*`
- `data-video-generator-*`
- `data-asset-*`
- `data-task-log-*`

## Governance Recommendations

### Safe to annotate first

- Top-level view roots: `#homeView`, `#projectLibraryView`, `#profileView`,
  `#assetsPageView`, `#canvasArea`.
- Runtime roots: `.app`, `#canvasViewport`, `#canvasWorld`, `#chatPanel`,
  `#promptForm`.
- Dialog/popover roots: `#authDialog`, `#creditDetailDialog`,
  `#taskLogModal`, `#imageEditPopover`, `#imageGeneratorPopover`,
  `#videoGeneratorPopover`.

Comments should explain ownership and runtime role only. Do not rename or move
markup in the same pass.

### Future template split candidates

Split only after a separate behavior-equivalent plan and runtime verification:

1. Auth dialog/account popover: clear owner in `features/auth`, but hover/focus
   and logout delegation must be preserved.
2. Task log: cohesive DOM and runtime under workspace task-log, but depends on
   `body[data-view="space"]`.
3. Project library: small shell, mostly `#projectGrid` render target and routing
   view root.
4. Asset page/floating library: possible after deciding whether assets are a
   top-level feature or remain workspace-owned.
5. Home: possible after model picker and home-to-canvas handoff are isolated.

### Must be split last

- Canvas viewport/world, node templates, context menu, tool rail, selection
  state, image/video generator popovers, chat prompt form, and chat model select.
- These areas have cross-feature runtime coupling and many event roots.

### Required search before any later split

Use targeted searches before moving a DOM area:

```bash
rg -n "idName|#idName|data-name|dataset\\.name|className|classList" index.html src/client/features/workspace src/client/features/canvas src/client/features/ai src/client/features/auth
rg -n "addEventListener\\(|closest\\(|querySelector|querySelectorAll|getElementById" index.html src/client/features/workspace src/client/features/canvas src/client/features/ai src/client/features/auth
rg -n "body\\.dataset\\.view|data-view|app-view|active|hidden|collapsed|open|selected|loading" index.html src/client/features/workspace src/client/features/canvas src/client/features/ai src/client/features/auth
```

For asset work, include the real path:

```bash
rg -n "assetList|floatingLibrary|assetsPage|data-asset|uploadIntent|assetRuntimeBound" src/client/features/workspace/asset-library index.html
```

For canvas/chat work, include:

```bash
rg -n "canvasViewport|canvasWorld|promptForm|promptInput|chatModelSelect|data-node-id|data-active-selection|context-action|generator" src/client/features/workspace src/client/features/canvas src/client/features/ai index.html
```
