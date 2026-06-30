# Feature Template Split Checklist

Date: 2026-06-30

This checklist must be used before moving any `index.html` region into a
feature-owned template. It is documentation only. It does not authorize a split,
rename, deletion, UI change, or behavior change.

## Purpose

The current `index.html` contains most product surfaces and many runtime
contracts. A feature template split is safe only when the target region's DOM
contract, event roots, CSS visibility, and rollback path are known before the
move.

Default rule:

- Move one feature area per batch.
- Preserve exact ids, classes, `data-*` attributes, ARIA attributes, default
  classes, and DOM order in the first extraction.
- Do not rename selectors in the same batch as moving markup.
- Do not delete old DOM until replacement mounting is proven.
- Do not change UI, copy, layout, or interactions.

## Preflight

Complete these checks before choosing a feature area:

- Confirm the batch is only one feature area.
- Confirm no unrelated worktree changes will be touched, especially
  `styles/task-log.css`.
- Read the current maps:
  - `docs/architecture/index-template-map.md`
  - `docs/architecture/dom-dependency-map.md`
  - `docs/architecture/runtime-event-map.md`
  - `docs/architecture/style-entry-map.md`
- Identify whether the target area is a view root, runtime mount point, event
  delegation root, popover/dialog, generated node template, or CSS-only surface.
- Write down the exact rollback command or commit to revert before editing.

## Required Evidence Before Split

For the target DOM region, collect evidence for each item:

| Item | Evidence required |
| --- | --- |
| DOM ownership | Exact `index.html` line range and intended future feature owner. |
| Static selectors | All ids, classes, and `data-*` attributes in the region. |
| JS references | `src/client` files that query, write, or listen to the region. |
| Event roots | Containers with `click`, `submit`, `change`, `input`, pointer, drag, drop, keyboard, or custom-event listeners. |
| State contract | Default `.active`, `.hidden`, `.collapsed`, `.open`, `.selected`, `.loading`, `hidden`, `aria-hidden`, and `body[data-view]` behavior. |
| CSS contract | Source CSS files that style the region and any `body[data-view]` or ancestor selector dependency. |
| Runtime initialization | File that mounts/binds/syncs the area and whether it uses `collectWorkspaceUiElements`. |
| Dynamic DOM | Any children generated later by JS that depend on this static root. |
| Cross-feature links | Other features that read or mutate this DOM. |
| Verification path | Minimal smoke path that proves current behavior survived. |

If any item is unknown, do not split the template yet.

## Required Searches

Run targeted searches before moving a region. Replace placeholders with the
real selector names.

### IDs

```bash
rg -n "#<id>|getElementById\\(\"<id>|querySelector\\(\"#<id>|querySelectorAll\\(\"#<id>|<id>" index.html src/client styles
```

### Classes

```bash
rg -n "\\.<class>|classList\\.(add|remove|toggle|contains)\\(\"<class>|querySelector(All)?\\(\"\\.<class>|closest\\(\"\\.<class>" index.html src/client styles
```

### Data Attributes

```bash
rg -n "data-<name>|dataset\\.<camelName>|\\[data-<name>|closest\\(\"\\[data-<name>" index.html src/client styles
```

### Runtime Events

```bash
rg -n "addEventListener\\(|closest\\(|dispatchEvent\\(|CustomEvent\\(|MutationObserver|dataset\\.view|body\\.dataset\\.view" index.html src/client
```

### CSS Visibility

```bash
rg -n "body\\[data-view|\\.app-view|\\.active|\\.hidden|\\.collapsed|\\.open|\\.selected|\\.loading|aria-hidden|\\[hidden\\]" index.html styles src/client
```

## Feature-Specific Checks

### Auth

Use for `#authEntry`, `#authAccountPopover`, `#authDialog`, and credit entry
integration.

- Preserve `#authEntry`, `#authEntryButton`, `#authAccountPopover`,
  `#authDialog`, `#authForm`, input ids, and all `[data-auth-*]` attributes.
- Preserve `[data-auth-logout]` as the only logout action.
- Preserve hover/focus behavior around account popover.
- Preserve `.hidden`, `.active`, `aria-expanded`, and `aria-hidden` defaults.
- Search `auth-entry.js`, credit quote code, and style selectors before moving.
- Smoke check: signed-out login dialog opens/closes; signed-in account popover
  opens; logout still happens from the popover action.

### Credits

Use for `#creditDetailDialog` and credit quote badge targets.

- Preserve `#creditDetailDialog` and `[data-credit-*]`.
- Confirm whether the moved DOM is owned by `features/auth` or future
  `features/credits`.
- Preserve tab/panel `.active` behavior.
- Preserve generation quote hooks such as `[data-credit-quote]`,
  `[data-credit-model-source]`, and `[data-credit-count-source]` if included.
- Smoke check: credit dialog opens from account popover and tabs switch.

### Task Log

Use for `#profileView`, `#taskLogPage`, and `#taskLogModal`.

- Preserve `body[data-view="space"]`, `#profileView`, `#taskLogPage`,
  `#taskLogRows`, `#taskLogModal`, and `[data-task-log-*]`.
- Preserve native `hidden` on the modal.
- Preserve `data-task-log-bound` one-time binding behavior.
- Do not include unrelated `styles/task-log.css` worktree changes unless a
  separate task explicitly asks for them.
- Smoke check: navigate to space/task log, filters work, detail modal opens and
  closes.

### Project Library

Use for `#projectLibraryView` and `#projectGrid`.

- Preserve `#projectLibraryView`, `#projectGrid`, `.app-view`, and route value
  `library`.
- Search `[data-open-project]`, `[data-new-project]`, `[data-save-project]`,
  and `[data-nav-view]`.
- Confirm project card actions are generated separately and are not assumed to
  live in static `index.html`.
- Smoke check: project library view opens, project cards render, opening a
  project still works.

### Assets

Use for `#assetsPageView`, `#floatingLibrary`, `#assetList`,
`#assetsPageAssetList`, and upload controls.

- Note that active asset runtime is currently under
  `src/client/features/workspace/asset-library/`; there is no
  `src/client/features/assets/` directory at this baseline.
- Preserve `#assetsPageView`, `#floatingLibrary`, `#assetList`,
  `#assetsPageAssetList`, `#assetUploadInput`, and `data-asset-*`.
- Preserve `dataset.uploadIntent`, `data-asset-runtime-bound`, and
  `data-asset-scroll-bound` behavior.
- Search drag/drop paths from asset list into `#canvasViewport`.
- Smoke check: asset page renders, floating library opens, upload works, asset
  insert/drag to canvas still works.

### Home

Use for `#homeView` and home composer/history/feed.

- Preserve `#homeView`, `#homePromptForm`, `#homePromptInput`,
  `#homeModelSelect`, `#homeModelPicker`, `#homeModelButton`,
  `#homeModelMenu`, `#homeHistory`, `#homeBackTop`, and `[data-channel]`.
- Preserve the initial `.app-view.active` home state.
- Confirm home-to-canvas handoff through `generateHomeProject`.
- Confirm model picker ownership with `features/ai/model-catalog.js`.
- Smoke check: home model picker works, prompt submit enters canvas, home
  upload preview works, inspiration feed/back-to-top still work.

### Canvas

Use for canvas area, tool rail, viewport, world, context menus, popovers, and
node templates.

- Do not split canvas early. It is a last-phase candidate.
- Preserve `#canvasViewport`, `#canvasWorld`, `#toolRail`,
  `#canvasContextMenu`, `#addNodeMenu`, `#imageEditPopover`,
  `#imageGeneratorPopover`, `#videoGeneratorPopover`, `#textFormatToolbar`.
- Preserve `.rail-btn[data-tool]`, `[data-shape-tool]`, `[data-pen-tool]`,
  `[data-context-action]`, `[data-add-node]`, `[data-generator-*]`,
  `[data-video-generator-*]`, `.node-card`, `.canvas-object`, `.selected`,
  `data-node-id`, and `data-active-selection`.
- Preserve stop-propagation behavior for popovers/menus.
- Search canvas, chat, AI, agent, asset, taskbar, and model3d references before
  moving.
- Smoke check: pan/zoom, selection, context menu, add node, draw/text/eraser,
  image/video popovers, and asset drop.

### Chat

Use for `#chatPanel`, `#chatFloat`, composer, chat log, conversation controls,
and model select.

- Do not split chat before canvas boundaries are stable.
- Preserve `#chatPanel`, `#chatFloat`, `#chatLog`, `#promptForm`,
  `#promptInput`, `#chatModelSelect`, `#chatImagePreview`, `#chatUploadImage`,
  `#chatImageInput`, `#presetSkill`, `#newConversation`,
  `#conversationHistory`, and `#collapseChat`.
- Preserve `.collapsed`, `.has-chat`, `.loading`, and drag-over behavior.
- Search `prompt-workflow.js`, `task-bar.js`, chat components, model catalog,
  and canvas generator workflows.
- Smoke check: chat opens/collapses, prompt submit generates, attachments
  preview/remove, conversation controls work.

### AI / Model Selectors

Use for model picker/select controls shared by home, chat, image edit, image
generator, and video generator.

- Preserve `#homeModelSelect`, `#homeModelMenu`, `#homeModelButton`,
  `#chatModelSelect`, `#imageEditModel`, `[data-generator-model]`,
  `[data-video-generator-model]`, and `[data-model-value]`.
- Preserve model dataset fields:
  `data-selected-model-id`, `data-model-user-selected`, `data-model-auto`,
  `data-model-type`, `data-selected-modality`, `data-selected-provider`.
- Confirm credit quote hooks still point to the correct model/count selectors.
- Smoke check: model menus hydrate and selected model survives submit paths.

### Agent / AI Core

Use for `#aiCore`, `#aiCoreHint`, and agent-facing workspace signals.

- Preserve `#aiCore`, `#aiCoreHint`, `.ai-core`, `.ai-core-awake`,
  `data-product-*`, `data-ai-core-analysis-*`, and `data-node-id`.
- Confirm whether the agent is enabled by runtime state, not just whether code
  exists.
- Do not move shell placement until agent mount/dispose is explicit.
- Smoke check: AI Core visual state and canvas drop/nearby state remain stable.

### Model3D

Use for Three import map, 3D generated nodes, model viewer, and 3D task signals.

- Preserve the Three import map unless a separate bundling plan proves dynamic
  imports cover the same behavior.
- Preserve task type `model3d`, model upload accepted formats, `.node-model`,
  `.model-frame`, `.model-viewer`, and generated `data-toolbar-action`
  contracts.
- Remember most 3D DOM is generated dynamically, not present as a static
  `index.html` island.
- Smoke check: existing 3D preview/model node path still loads.

## First Extraction Contract

The first template extraction for any feature must satisfy these rules:

- The rendered DOM tree for the moved region is behavior-equivalent.
- The same ids, classes, data attributes, ARIA attributes, and default state
  are present before binding code runs.
- The feature exposes one clear mount/bind function or uses the existing
  workspace runtime without adding new product behavior.
- Event listeners still bind once.
- Existing CSS selectors still match.
- Existing public boot path still starts from
  `app.js -> src/main.js -> src/client/main.js -> src/client/core/app-init.js`.
- `npm run check` and `npm run build` pass.

## Do Not Combine With Template Split

Do not combine any of these with a template extraction:

- Selector renaming.
- CSS migration or specificity cleanup.
- Legacy file deletion.
- Feature behavior changes.
- UI redesign, copy changes, animation changes, or interaction changes.
- Framework migration to React, Vue, or Next.js.
- New dependencies.
- Server/provider changes.

## Verification Checklist

Minimum verification after a template split:

- `npm run check`
- `npm run build`
- `git diff --name-only` shows only intended files.
- Static search confirms old and new selectors are still covered.
- Browser smoke for the moved feature.
- Browser smoke for any cross-feature dependency listed in
  `runtime-event-map.md`.
- Confirm console has no new boot, selector, module, or event binding errors.
- Confirm rollback is one commit or one clearly documented file restoration.

## Recommended Split Order

Use this order unless new evidence changes risk:

1. Auth dialog/account popover.
2. Task log.
3. Project library.
4. Assets page and floating library.
5. Home view.
6. Model selectors only after their shared contract is explicit.
7. Canvas and chat last.

Do not start with canvas/chat. They have the broadest runtime coupling and the
largest chance of cross-feature regression.
