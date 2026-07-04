# DOM Dependency Map

Date: 2026-06-30

This document records the current dependency relationship between important
`index.html` DOM ids/classes/data attributes and `src/client` JavaScript. It is
documentation only. It does not authorize renaming, moving, deleting, or
splitting DOM.

## Scope

Sources inspected:

- `index.html`
- `src/client/**/*.js`
- `docs/architecture/index-template-map.md`
- Current CSS visibility notes from `docs/architecture/style-entry-map.md`

Out of scope:

- No changes to `index.html`
- No changes to `src/client`
- No changes to `src/server`
- No changes to `styles`
- No deletion or dependency changes
- No handling of the existing `styles/task-log.css` worktree change

## Summary

The current frontend relies heavily on DOM ids and `data-*` attributes as runtime
contracts. Many nodes in `index.html` are not just markup; they are mount points,
state targets, event delegation anchors, or selectors used by multiple feature
modules.

Practical rule:

- Treat listed ids, classes, and data attributes as locked until a separate
  migration proves a replacement binding.
- Do not rename a DOM id in the same batch as moving markup.
- Do not move a DOM subtree until all event delegation selectors are searched.

## Important DOM IDs

| DOM id | Area | Referenced by `src/client` | Purpose | Risk / rename |
| --- | --- | --- | --- | --- |
| `#homeView` | home/routing | `features/workspace/runtime/ui-elements.js`, `features/workspace/routing/view-runtime.js`, `features/workspace/home/components/home-back-top.js`, `features/workspace/home/components/home-inspiration-feed.js` | Home view root, scroll host, routed view | High. Do not rename. |
| `#projectLibraryView` | projects/routing | `features/workspace/runtime/ui-elements.js`, `features/workspace/routing/view-runtime.js` | Project library routed view | High. Do not rename before routing extraction. |
| `#profileView` | workspace/task-log | `features/workspace/runtime/ui-elements.js`, `features/workspace/routing/view-runtime.js`, `features/workspace/task-log/task-log-runtime.js` | Profile/space routed view and task log visibility host | High. Do not rename. |
| `#assetsPageView` | assets/routing | `features/workspace/runtime/ui-elements.js`, `features/workspace/routing/view-runtime.js`, `features/workspace/asset-library/asset-library-runtime.js` | Asset page routed view | High. Do not rename. |
| `#authEntry` | auth | `features/auth/auth-entry.js` | Auth entry mount/root | High. Do not rename. |
| `#authEntryButton` | auth | `features/auth/auth-entry.js` | Login/register entry button | High. Rename breaks auth entry. |
| `#authAccountPopover` | auth | `features/auth/auth-entry.js` | Account popover visibility and hover/focus behavior | High. Rename breaks account menu. |
| `#authDialog` | auth | `features/auth/auth-entry.js` | Login/register modal | High. Rename breaks login flow. |
| `#creditDetailDialog` | auth/credits | `features/auth/auth-entry.js` | Credit/account detail dialog | High. Rename breaks credit detail entry. |
| `#homePromptForm` | home | `features/workspace/runtime/ui-elements.js` | Home prompt form binding | Medium-high. Used through runtime elements. |
| `#homePromptInput` | home | `features/workspace/runtime/ui-elements.js` | Home prompt input | Medium-high. |
| `#homeModelSelect` | home/ai | `features/ai/model-catalog.js`, `features/workspace/runtime/ui-elements.js` | Home model select hydration and selected model state | High. Cross-feature. |
| `#homeModelButton` | home/ai | `features/ai/model-catalog.js`, `features/workspace/interactions/global-interactions.js`, `features/workspace/runtime/ui-elements.js` | Custom home model picker trigger | High. |
| `#homeModelMenu` | home/ai | `features/ai/model-catalog.js`, `features/workspace/interactions/global-interactions.js`, `features/workspace/runtime/ui-elements.js` | Custom model menu/options | High. |
| `#homeHistory` | home/projects | `features/workspace/runtime/ui-elements.js` | Recent projects render target | Medium-high. |
| `#projectGrid` | projects | `features/workspace/runtime/ui-elements.js` | Project library render target | High. Rename breaks project library rendering. |
| `#assetList` | assets/workspace | `features/workspace/asset-library/asset-panel.js`, `features/workspace/runtime/ui-elements.js` | Floating asset library list | High. |
| `#floatingLibrary` | assets/workspace | `features/workspace/asset-library/asset-panel.js`, `features/workspace/runtime/ui-elements.js` | Floating asset panel visibility | High. |
| `#assetsPageAssetList` | assets | `features/workspace/runtime/ui-elements.js` | Asset page list render target | Medium-high. |
| `#assetsPageUploadAsset` | assets | `features/workspace/runtime/ui-elements.js` | Asset page upload action | Medium-high. |
| `#canvasViewport` | canvas/workspace/chat/ai | `features/workspace/runtime/ui-elements.js`, `features/canvas/canvas-viewport-events.js`, `features/canvas/keyboard-shortcuts.js`, `features/canvas/workflows/image-generator-workflow.js`, `features/workspace/chat/workflows/prompt-workflow.js`, `features/ai/image-edit-actions.js` | Canvas event surface, coordinate host, fallback selector for workflows | Critical. Do not rename or move casually. |
| `#canvasWorld` | canvas/workspace/chat/agent | `features/workspace/runtime/ui-elements.js`, `features/agent/agent-actions.js`, `features/canvas/keyboard-shortcuts.js`, `features/canvas/workflows/canvas-menu-actions.js`, `features/canvas/workflows/image-generator-workflow.js`, `features/canvas/workflows/video-generator-workflow.js`, `features/workspace/chat/workflows/prompt-workflow.js`, `features/workspace/taskbar/task-bar.js` | Node container and cross-feature canvas query root | Critical. Do not rename. |
| `#emptyState` | canvas/projects | `features/workspace/runtime/ui-elements.js`, plus canvas/project workflows via runtime element | Empty canvas prompt state | High. Class toggles depend on it. |
| `#toolRail` | canvas | `features/workspace/runtime/ui-elements.js`, canvas toolbar runtime via elements | Tool rail root | High. |
| `#toggleToolRail` | canvas | `features/workspace/runtime/ui-elements.js` | Tool rail collapse button | High. |
| `#canvasContextMenu` | canvas | `features/workspace/runtime/ui-elements.js`, menu workflows through runtime | Canvas context menu root | High. Data actions inside are critical. |
| `#addNodeMenu` | canvas | `features/workspace/runtime/ui-elements.js` | Add-node menu root | High. |
| `#imageEditPopover` | canvas/ai | `features/workspace/runtime/ui-elements.js`, `features/canvas/keyboard-shortcuts.js`, `features/canvas/workflows/image-generator-workflow.js` | Image edit popover, keyboard scope, mutual exclusion with generator | Critical. |
| `#imageGeneratorPopover` | canvas/ai | `features/canvas/workflows/image-generator-workflow.js`, `features/canvas/workflows/video-generator-workflow.js` | Image generator popover and cross-popover closing | Critical. |
| `#videoGeneratorPopover` | canvas/model/video | `features/canvas/workflows/video-generator-workflow.js` | Video generator popover | High. |
| `#textFormatToolbar` | canvas | `features/workspace/runtime/ui-elements.js`, canvas text/shape workflows via runtime | Text formatting toolbar | High. |
| `#zoomText`, `#zoomRange` | canvas | `features/workspace/runtime/ui-elements.js`, `features/canvas/runtime/canvas-view-state.js` | Canvas zoom display/input | High. |
| `#undoButton`, `#redoButton` | canvas | `features/workspace/runtime/ui-elements.js`, workspace canvas composition via runtime | History controls | High. |
| `#chatFloat` | chat/workspace | `features/workspace/runtime/ui-elements.js`, chat collapse through runtime | Floating chat launcher | High. |
| `#chatPanel` | chat/workspace | `features/workspace/runtime/ui-elements.js`, chat collapse/log modules via runtime | Chat panel root and state host | Critical. |
| `#chatLog` | chat | `features/workspace/runtime/ui-elements.js`, `features/workspace/chat/workflows/prompt-workflow.js` | Chat message render target | Critical. |
| `#promptForm` | chat | `features/workspace/runtime/ui-elements.js`, `features/workspace/chat/workflows/prompt-workflow.js` | Chat composer form and submit source | Critical. |
| `#promptInput` | chat | `features/workspace/runtime/ui-elements.js`, `features/workspace/chat/workflows/prompt-workflow.js` | Chat prompt textarea | Critical. |
| `#chatImagePreview` | chat | `features/workspace/runtime/ui-elements.js` | Chat attachment preview container | High. |
| `#chatUploadImage`, `#chatImageInput` | chat | `features/workspace/runtime/ui-elements.js` | Chat image upload controls | High. |
| `#chatModelSelect` | chat/ai/canvas | `features/workspace/runtime/ui-elements.js`, `features/ai/model-catalog.js`, `features/canvas/workflows/image-generator-workflow.js`, `features/workspace/chat/workflows/prompt-workflow.js` | Chat model selection and generator fallback model source | Critical. Cross-feature. |
| `#presetSkill` | chat | `features/workspace/runtime/ui-elements.js`, `features/workspace/chat/workflows/prompt-workflow.js` | Chat submitter mode detection | High. |
| `#newConversation`, `#conversationHistory` | chat | `features/workspace/chat/workflows/prompt-workflow.js` | Conversation controls | High. |
| `#collapseChat` | chat | `features/workspace/runtime/ui-elements.js` | Chat collapse button | High. |
| `#taskLogPage` | task-log | `features/workspace/task-log/task-log-runtime.js` | Task log page root | Critical for task-log runtime. |
| `#taskLogRefresh` | task-log | `features/workspace/task-log/task-log-runtime.js` | Refresh button and loading state | High. |
| `#taskLogSearch`, `#taskLogDateFrom`, `#taskLogDateTo`, `#taskLogType`, `#taskLogStatus` | task-log | `features/workspace/task-log/task-log-runtime.js` | Task log filters | High. |
| `#taskLogRows`, `#taskLogRange` | task-log | `features/workspace/task-log/task-log-runtime.js` | Task rows and range display | High. |
| `#taskLogPrev`, `#taskLogNext`, `#taskLogLimit` | task-log | `features/workspace/task-log/task-log-runtime.js` | Pagination controls | High. |
| `#taskLogModal`, `#taskLogDetailBody` | task-log | `features/workspace/task-log/task-log-runtime.js` | Task detail modal and detail body | High. |

## Important Class Dependencies

These classes are runtime state, not only CSS.

| Class | JS usage | Purpose | Risk |
| --- | --- | --- | --- |
| `.active` | `view-router.js`, `auth-entry.js`, `model-catalog.js`, `model-preference-menu.js`, `canvas-toolbar.js`, `home-inspiration-feed.js`, `chat-log.js` | Routed view state, selected tab, selected model/channel/tool/thinking step | Critical. Rename breaks many UI states. |
| `.hidden` | `auth-entry.js`, `project-workflow.js`, `node-creation.js`, `canvas-drawing-workflow.js`, `node-query.js` | Hide/show auth dialogs, form fields, empty state, hidden nodes | Critical. Mixed with native `hidden`. |
| `.collapsed` | `chat-collapse.js`, `canvas-toolbar.js` | Chat panel/floating button collapse and tool rail collapse | High. |
| `.open` | `menu-position.js`, `compact-select.js`, `home-workflow.js`, `task-bar.js`, `asset-library-runtime.js`, `image-lightbox.js`, `generation-choice-overlay.js`, `text-tool.js`, `image-generator-workflow.js` | Generic open state for menus, popovers, overlays, pickers | Critical. Very overloaded. |
| `.selected` | `canvas-selection.js`, `canvas-menu-actions.js`, `keyboard-shortcuts.js`, `shape-tool.js`, `model-catalog.js`, `model-preference-menu.js`, `projects/snapshot.js` | Canvas active objects, selected models/options, restored selections | Critical. |
| `.loading` | `task-log-runtime.js`, `prompt-workflow.js`, `task-bar.js`, `image-edit-actions.js`, `chat-log.js` | Async progress/loading display | High. |
| `.disabled` / `disabled` property | `auth-entry.js`, `task-log-runtime.js`, `image-generator-workflow.js`, `canvas-menu-actions.js`, `canvas-expand-workflow.js`, `workspace-canvas-composition.js` | Button/control disabled state | High. Do not replace with visual-only class. |
| `.show` | `home-back-top.js`, `home-inspiration-feed.js`, `project-library.js` | Revealed transient UI such as back-to-top/loading/save status | Medium-high. |
| `.has-chat` | `chat-log.js` | Chat panel mode after messages exist | High for chat layout. |
| `.drag-over` | `home-library-interactions.js`, `chat-image-preview.js` | Drag/drop visual and prompt attachment state | Medium-high. |
| `.canvas-entering`, `.home-transitioning`, `.canvas-restoring` | `project-workflow.js` | Navigation/restore transition state | High during project open/generation. |
| `.upload-choosing` | `upload-choice-bubbles.js` | Upload choice overlay mode | High for canvas upload flow. |
| `.generation-failed` | `prompt-workflow.js`, `task-bar.js`, `image-edit-actions.js` | Failed generation preview state | Medium-high. |
| `.mode-upscale`, `.menu-open` | `image-toolbar.js`, `node-controls.js` | Image toolbar upscale submenu mode | High for image node toolbar behavior. |
| `.is-saved` | `node-controls.js` | Asset save/unsave button state | Medium-high. |
| `.is-removing`, `.is-success`, `.is-error`, `.is-pending` | `home-library-interactions.js`, `project-library.js`, `quote-badges.js` | Project card removal and status/quote tones | Medium-high. |

Guardrail:

- Do not treat these classes as replaceable presentation tokens. Many of them
  are behavior flags.

## Important `data-*` Dependencies

Note: current markup and runtime code do not use one generic `data-action`
contract. Action behavior is split across action-family attributes such as
`data-context-action`, `data-toolbar-action`, `data-auth-menu-action`,
`data-core-action`, `data-director-action`, `data-asset-menu-action`,
`data-expand-action`, and `data-selection-action`. Search the whole
`data-*-action` family before changing action buttons.

### Template-level data attributes

| Attribute | Referenced by `src/client` | Purpose | Risk |
| --- | --- | --- | --- |
| `body.dataset.view` / `data-view` | `features/workspace/routing/view-router.js`, `features/workspace/task-log/task-log-runtime.js`, export markup in `features/canvas/workflows/canvas-menu-actions.js` | Active routed surface and CSS scope | Critical. |
| `[data-nav-view]` | `features/workspace/routing/view-router.js`, `features/workspace/taskbar/task-bar.js`, `features/workspace/home/home-library-interactions.js`, `features/projects/components/project-library.js` | View navigation delegation | Critical. Rename breaks navigation. |
| `[data-brand-menu]` | `features/workspace/taskbar/task-bar.js`, `features/workspace/interactions/global-interactions.js`, `features/workspace/interactions/footer-events.js` | Brand menu trigger delegation | High. |
| `[data-new-project]` | `features/workspace/taskbar/task-bar.js`, `features/workspace/home/home-library-interactions.js`, `features/projects/components/project-library.js` | New project action | High. |
| `[data-save-project]` | `features/workspace/taskbar/task-bar.js`, `features/workspace/home/home-library-interactions.js`, `features/canvas/workflows/canvas-menu-actions.js` | Save current project action | Critical. |
| `[data-auth-close]` | `features/auth/auth-entry.js` | Auth dialog close delegation | High. |
| `[data-auth-credits-open]` | `features/auth/auth-entry.js` | Open credit detail dialog | High. |
| `[data-auth-logout]` | `features/auth/auth-entry.js` | Logout action | Critical. |
| `[data-auth-method]`, `[data-auth-mode]`, `[data-auth-oauth]` | `features/auth/auth-entry.js` | Login/register method/mode/OAuth selection | Critical for auth. |
| `[data-credit-*]` | `features/auth/auth-entry.js`, `features/credits/quote-badges.js` | Credit dialog fields and generation quote badges | Critical. Cross-feature. |
| `[data-model-value]` | `features/ai/model-catalog.js`, `features/workspace/home/components/home-composer.js`, `features/workspace/home/workflows/home-workflow.js`, `features/workspace/interactions/global-interactions.js` | Custom model picker options | High. |
| `[data-channel]` | `features/workspace/home/components/home-inspiration-feed.js` | Home inspiration channel filtering | Medium-high. |
| `[data-tool]` on `.rail-btn` | `features/canvas/canvas-toolbar.js`, `features/canvas/tool-bindings.js`, workspace interaction modules | Canvas tool selection | Critical. |
| `[data-shape-tool]`, `[data-pen-tool]` | `features/canvas/canvas-toolbar.js`, `features/canvas/tool-bindings.js`, `features/workspace/interactions/global-interactions.js` | Shape/pen subtool selection | High. |
| `[data-context-action]` | `features/canvas/workflows/canvas-menu-actions.js`, `features/canvas/workflows/canvas-menu-workflow.js` | Canvas context menu commands | Critical. |
| `[data-add-node]` | `features/canvas/workflows/canvas-menu-actions.js` | Add node menu command | High. |
| `[data-image-generator-form]`, `[data-image-generator-prompt]` | `features/canvas/canvas-viewport-events.js`, `features/canvas/workflows/image-generator-workflow.js`, `features/canvas/workflows/node-drag-workflow.js` | Generator popover form and prompt | Critical. |
| `[data-generator-*]` | `features/ai/model-catalog.js`, `features/canvas/workflows/image-generator-workflow.js`, `features/canvas/workflows/node-drag-workflow.js` | Image generator references, model, ratio, count, submit/cancel/expand | Critical. |
| `[data-video-generator-*]`, `[data-video-option-group]` | `features/canvas/workflows/video-generator-workflow.js` | Video generator controls and option groups | High. |
| `[data-task-log-close]` | `features/workspace/task-log/task-log-runtime.js` | Task detail modal close | High. |

### Runtime-generated data attributes

These are not all in `index.html`, but they are part of the DOM contract that a
template split must preserve:

| Attribute family | Main users | Purpose | Risk |
| --- | --- | --- | --- |
| `data-node-id` / `node.dataset.nodeId` | canvas, agent, chat, taskbar | Canvas node identity and action routing | Critical. |
| `data-active-selection` / `node.dataset.activeSelection` | canvas selection, keyboard shortcuts, chat context, taskbar | Active selected node inside multi-selection | Critical. |
| `data-kind`, `data-created-by`, `data-source-mode`, `data-asset-type` | canvas, agent, AI generation | Node type/source metadata | High. |
| `data-generation-prompt`, `data-generation-model`, `data-edit-prompt`, `data-edit-model` | AI/chat/canvas workflows | Generation/edit provenance and model fallback | High. |
| `data-selected-model-id`, `data-model-user-selected`, `data-model-auto`, `data-model-type`, `data-selected-modality`, `data-selected-provider` | `features/ai/model-catalog.js`, model preference menu, chat/home/generator workflows | Model catalog state stored on `<select>` nodes | Critical. |
| `data-task-log-detail`, `data-task-log-copy`, `data-task-log-output` | task log runtime | Runtime row action buttons | High. |
| `data-open-project`, `data-project-select-*`, `data-asset-*` | project/asset renderers and runtimes | Runtime list/card actions | High. |

## Feature Classification

### auth

Locked DOM:

- `#authEntry`
- `#authEntryButton`
- `#authAccountPopover`
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
- `[data-auth-*]`
- `#creditDetailDialog` integration points

Primary files:

- `src/client/features/auth/auth-entry.js`

Do not move:

- Auth dialog and account popover until the hover/focus/click behavior is
  preserved and `[data-auth-logout]` remains the only logout trigger.

### home

Locked DOM:

- `#homeView`
- `#homePromptForm`
- `#homePromptInput`
- `#homeModelSelect`
- `#homeModelButton`
- `#homeModelMenu`
- `#homeHistory`
- `#homeBackTop`
- `#homeInspirationFeed`
- `#homeInspirationLoading`
- `[data-model-value]`
- `[data-channel]`

Primary files:

- `src/client/features/workspace/runtime/ui-elements.js`
- `src/client/features/workspace/home/components/home-back-top.js`
- `src/client/features/workspace/home/components/home-inspiration-feed.js`
- `src/client/features/workspace/home/workflows/home-workflow.js`
- `src/client/features/ai/model-catalog.js`

### workspace

Locked DOM:

- `body.dataset.view`
- `.app-view`
- `.active`
- `[data-nav-view]`
- `[data-brand-menu]`
- `[data-new-project]`
- `[data-save-project]`
- Runtime element collection in `ui-elements.js`

Primary files:

- `src/client/features/workspace/runtime/ui-elements.js`
- `src/client/features/workspace/routing/view-router.js`
- `src/client/features/workspace/routing/view-runtime.js`
- `src/client/features/workspace/taskbar/task-bar.js`

### canvas

Locked DOM:

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
- `[data-tool]`
- `[data-shape-tool]`
- `[data-pen-tool]`
- `[data-context-action]`
- `[data-image-command]`
- `[data-canvas-command]`
- `[data-add-node]`
- `[data-generator-*]`
- `[data-video-generator-*]`
- `.selected`
- `data-node-id`
- `data-active-selection`

Primary files:

- `src/client/features/canvas/canvas-viewport-events.js`
- `src/client/features/canvas/canvas-selection.js`
- `src/client/features/canvas/canvas-toolbar.js`
- `src/client/features/canvas/tool-bindings.js`
- `src/client/features/canvas/workflows/canvas-menu-actions.js`
- `src/client/features/canvas/workflows/image-generator-workflow.js`
- `src/client/features/canvas/workflows/video-generator-workflow.js`
- `src/client/features/canvas/node-controls.js`

### chat

Locked DOM:

- `#chatPanel`
- `#chatFloat`
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
- `.collapsed`
- `.has-chat`

Primary files:

- `src/client/features/workspace/chat/workflows/prompt-workflow.js`
- `src/client/features/workspace/chat/chat-collapse.js`
- `src/client/features/workspace/chat/components/chat-log.js`
- `src/client/features/workspace/runtime/ui-elements.js`

### ai

Locked DOM/data:

- `#homeModelSelect`
- `#chatModelSelect`
- `#imageEditModel`
- `[data-generator-model]`
- `[data-model-value]`
- model dataset fields such as `data-selected-model-id`
- `[data-credit-model-source]`

Primary files:

- `src/client/features/ai/model-catalog.js`
- `src/client/features/ai/model-preference-menu.js`
- `src/client/features/ai/image-edit-actions.js`

### assets

Locked DOM:

- `#assetsPageView`
- `#assetsPageAssetList`
- `#assetsPageUploadAsset`
- `#floatingLibrary`
- `#assetList`
- `#uploadAsset`
- `#assetUploadInput`
- `.asset-list`
- `.assets-page-list`

Primary files:

- `src/client/features/workspace/asset-library/asset-panel.js`
- `src/client/features/workspace/asset-library/asset-library-runtime.js`
- `src/client/features/workspace/runtime/ui-elements.js`

### projects

Locked DOM/data:

- `#projectLibraryView`
- `#projectGrid`
- `[data-new-project]`
- `[data-save-project]`
- `[data-open-project]` generated by project cards

Primary files:

- `src/client/features/projects/components/project-library.js`
- `src/client/features/projects/workflows/project-workflow.js`
- `src/client/features/workspace/home/home-library-interactions.js`

### credits

Locked DOM/data:

- `#creditDetailDialog`
- `[data-credit-*]`
- `[data-credit-quote]`
- `[data-credit-task]`
- `[data-credit-model-source]`
- `[data-credit-count]`

Primary files:

- `src/client/features/auth/auth-entry.js`
- `src/client/features/credits/quote-badges.js`

### task-log

Locked DOM:

- `#profileView`
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

Primary files:

- `src/client/features/workspace/task-log/task-log-runtime.js`

### model3d

Locked DOM/data:

- Three import map in `index.html`
- Task type `model3d`
- Asset upload accepting model formats
- Runtime classes `.node-model`, `.model-frame`, `.model-viewer`
- Toolbar action `data-toolbar-action="generate-3d"` generated by
  `src/client/features/canvas/image-toolbar.js`

Primary files:

- `src/client/features/canvas/model-viewer.js`
- `src/client/features/canvas/node-template.js`
- `src/client/features/canvas/node-controls.js`
- `src/client/features/workspace/chat/workflows/prompt-workflow.js`
- `src/client/features/workspace/task-log/task-log-runtime.js`

## High-Risk DOM List

### Rename breaks buttons or controls

- `[data-nav-view]`
- `[data-brand-menu]`
- `[data-new-project]`
- `[data-save-project]`
- `[data-auth-logout]`
- `[data-auth-method]`
- `[data-auth-oauth]`
- `[data-credit-quote]`
- `[data-model-value]`
- `[data-tool]`
- `[data-shape-tool]`
- `[data-pen-tool]`
- `[data-context-action]`
- `[data-add-node]`
- `[data-generator-submit]`
- `[data-video-generator-submit]`
- `[data-task-log-close]`

### Rename breaks render targets or runtime mounts

- `#homeView`
- `#projectLibraryView`
- `#profileView`
- `#assetsPageView`
- `#projectGrid`
- `#assetList`
- `#assetsPageAssetList`
- `#canvasViewport`
- `#canvasWorld`
- `#chatPanel`
- `#chatLog`
- `#promptForm`
- `#promptInput`
- `#taskLogRows`
- `#taskLogModal`

### Structural move can break event delegation

- `.home-side-menu [data-nav-view]`
- `#homeModelMenu [data-model-value]`
- `.rail-btn[data-tool]`
- `[data-shape-tool]`
- `[data-pen-tool]`
- `#canvasContextMenu [data-context-action]`
- `[data-image-generator-form]` and child `[data-generator-*]`
- `[data-video-generator-form]` and child `[data-video-generator-*]`
- `#authDialog [data-auth-*]`
- `#creditDetailDialog [data-credit-*]`
- `#taskLogModal [data-task-log-close]`

### Shared across multiple features

- `#canvasWorld`: canvas, chat, agent, taskbar, generation workflows.
- `#canvasViewport`: canvas events, AI image edit actions, chat/generator flows.
- `#chatModelSelect`: chat, AI model catalog, image generator fallback model.
- `[data-credit-*]`: auth, credits, generation buttons.
- `[data-nav-view]`: workspace routing, taskbar, home/project cards.
- `data-node-id`: canvas, agent, chat, project snapshots.
- `.selected`: canvas selection, model selection, project snapshot restore.
- `.open`: menus, popovers, asset overlays, compact selects.

### Depends on CSS state switching

- `.app-view.active`
- `body[data-view]`
- `.hidden`
- native `hidden`
- `.collapsed`
- `.open`
- `.selected`
- `.loading`
- `.has-chat`
- `.canvas-entering`
- `.upload-choosing`

## Safe Documentation-Only Next Steps

DOM that can be annotated first, without moving markup:

- Top-level view roots: `#homeView`, `#projectLibraryView`, `#profileView`,
  `#assetsPageView`, `#canvasArea`.
- Dialog roots: `#authDialog`, `#creditDetailDialog`, `#taskLogModal`.
- Canvas root group: `#canvasViewport`, `#canvasWorld`, `#canvasContextMenu`,
  `#imageEditPopover`, `#imageGeneratorPopover`, `#videoGeneratorPopover`.
- Chat root group: `#chatPanel`, `#promptForm`, `#chatLog`.

DOM that can later move to feature templates after proof:

- Auth dialog and account popover to `features/auth`.
- Credit dialog to `features/credits`.
- Task log page/modal to task-log ownership.
- Project library shell to `features/projects`.
- Asset page/floating library to `features/assets`.
- Home view after model picker ownership is explicit.

DOM that should not move yet:

- `#canvasWorld`
- `#canvasViewport`
- `#chatPanel`
- `#promptForm`
- `#chatModelSelect`
- `#imageGeneratorPopover`
- `#imageEditPopover`
- `#videoGeneratorPopover`
- `.rail-btn[data-tool]`
- `#canvasContextMenu [data-context-action]`
- Any node or markup carrying `data-node-id` or `data-active-selection`

## Required Search Keywords Before Any Split

Before moving or renaming a DOM area, search:

```bash
rg -n "#<id>|getElementById\\(\"<id>|querySelector\\(\"#<id>|querySelectorAll\\(\"#<id>" src/client styles index.html
rg -n "\\.<class>|classList\\.(add|remove|toggle|contains)\\(\"<class>|querySelector(All)?\\(\"\\.<class>" src/client styles index.html
rg -n "data-<name>|dataset\\.<camelName>|\\[data-<name>" src/client styles index.html
```

For routing and visibility, always include:

```bash
rg -n "body\\.dataset\\.view|dataset\\.view|data-view|app-view|active|hidden|collapsed|open" src/client styles index.html
```

For canvas and chat, always include:

```bash
rg -n "canvasWorld|canvasViewport|chatModelSelect|promptForm|promptInput|data-node-id|data-active-selection|selected|context-action|generator" src/client styles index.html
```

For auth and credits, always include:

```bash
rg -n "authEntry|authDialog|authAccountPopover|data-auth|creditDetailDialog|data-credit" src/client styles index.html
```

For task log, always include:

```bash
rg -n "taskLog|data-task-log|profileView|data-view=\"space\"|dataset\\.view" src/client styles index.html
```

## Governance Recommendation

Use this order:

1. Add structural comments or docs only.
2. Extract one template area at a time.
3. Preserve exact ids/classes/data attributes in the first extraction.
4. Keep old and new binding contracts equivalent until runtime checks pass.
5. Only rename selectors in a separate follow-up after search evidence and
   browser/API checks.

Do not start with canvas/chat. They have the most shared selectors and the
highest chance of cross-feature regressions.
