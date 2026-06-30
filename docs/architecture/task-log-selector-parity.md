# Task Log Selector Parity Checklist

This document records the selector parity contract for a future task-log
template split. It is documentation only. It does not move DOM, change runtime
logic, change styles, add features, or authorize deleting files.

## Purpose

The first task-log template split must preserve the exact selector contract that
currently exists between `index.html`,
`src/client/features/workspace/task-log/task-log-runtime.js`, workspace routing,
and `styles/task-log.css`.

Use this checklist immediately before and after any future move of
`#taskLogPage` or `#taskLogModal`.

## Current Boundary

Current static area:

```text
index.html
  #profileView.profile-view.app-view.simple-page-view
    nav.home-nav
      button.brand-mark[data-brand-menu]
    #taskLogPage.simple-page-shell.task-log-page
      .task-log-heading
      .task-log-panel
      #taskLogModal.task-log-modal[hidden]
```

Boundary rule:

- Keep `#profileView` stable as the workspace `space` route shell.
- Treat `#taskLogPage` and `#taskLogModal` as the first future template
  candidates.
- Do not move the `nav.home-nav` / `[data-brand-menu]` shell in the first
  task-log split.

## Static IDs To Preserve

These IDs are queried by `task-log-runtime.js` or workspace routing and must
exist before `bindTaskLogRuntime(runtime)` runs:

```text
#profileView
#taskLogPage
#taskLogRefresh
#taskLogSearch
#taskLogDateFrom
#taskLogDateTo
#taskLogType
#taskLogStatus
#taskLogRows
#taskLogRange
#taskLogPrev
#taskLogNext
#taskLogLimit
#taskLogModal
#taskLogDetailBody
```

Additional modal header query contract:

```text
#taskLogModal .task-log-modal-header p
#taskLogModal .task-log-modal-header h2
```

Parity requirement:

- Do not rename any ID in the same batch as a template move.
- Do not delay mounting these nodes until after `bindTaskLogRuntime(runtime)`.
- If the template is mounted dynamically later, it must be mounted before
  workspace runtime binding.

## Static Classes To Preserve

Route shell and shared layout classes:

```text
.profile-view
.app-view
.simple-page-view
.home-nav
.brand-mark
.simple-page-shell
.visually-hidden
```

Task-log static classes:

```text
.task-log-page
.task-log-heading
.task-log-refresh
.task-log-panel
.task-log-toolbar
.task-log-control
.task-log-search
.task-log-table-wrap
.task-log-table
.task-log-footer
.task-log-pagination
.task-log-modal
.task-log-modal-backdrop
.task-log-modal-card
.task-log-modal-header
.task-log-detail-body
```

Parity requirement:

- Preserve class names and class combinations exactly for the first split.
- Do not replace CSS classes with new component names in the same batch.
- Do not remove `.app-view` or `.simple-page-view` from `#profileView`.

## Static Data And Native Attributes

Static `data-*` attributes:

```text
data-brand-menu
data-task-log-close
```

Native and ARIA attributes that must stay equivalent:

```text
type="button"
type="search"
type="date"
role="dialog"
aria-modal="true"
aria-label
scope="col"
autocomplete="off"
hidden
```

Select option values that must remain stable:

```text
#taskLogType: "", "image", "video", "model3d"
#taskLogStatus: "", "queued", "running", "succeeded", "failed", "timeout", "save_failed", "cancelled"
#taskLogLimit: "10", "20", "50"
```

Parity requirement:

- Preserve native `hidden` on `#taskLogModal`.
- Preserve button `type="button"` so controls do not accidentally submit a form.
- Preserve select values because runtime query parameters use these values.

## Runtime-Generated Selectors

Generated row/action attributes:

```text
data-task-log-bound
data-task-log-copy
data-task-log-detail
data-task-log-output
```

Generated row/action classes:

```text
.task-log-type
.task-log-task-id
.task-log-icon-button
.task-log-action
.task-log-status
.task-log-status-succeeded
.task-log-status-failed
.task-log-status-timeout
.task-log-status-save_failed
.task-log-status-cancelled
.task-log-status-running
.task-log-status-queued
```

Generated modal/detail classes:

```text
.task-log-detail-loading
.task-log-detail-error
.task-log-detail-section
.task-log-detail-title
.task-log-detail-grid
.task-log-failure
.task-log-muted
.task-log-output-preview
.task-log-output-item
.task-log-output-image
.task-log-output-video
.task-log-output-model
```

Parity requirement:

- Preserve `#taskLogPage.dataset.taskLogBound` behavior. It prevents duplicate
  task-log event binding.
- Preserve delegated click targets under `#taskLogRows` and `#taskLogModal`.
- Preserve generated status classes because `styles/task-log.css` styles each
  status family.

## State Contract

Global route state:

```text
body[data-view="space"]
#profileView.active
.app.view-space
```

Task-log local state:

```text
#taskLogRefresh.loading
#taskLogModal[hidden]
button[disabled]
button[aria-disabled="true"]
```

Runtime behavior tied to state:

- `task-log-runtime.js` refreshes only when `body.dataset.view === "space"` or
  `#profileView` contains `.active`.
- A `MutationObserver` watches `document.body` for `data-view` changes.
- Auto-refresh starts when the task-log route is visible and stops when hidden.
- `Escape` closes the modal only when `#taskLogModal.hidden` is false.
- Previous/next buttons use native `disabled` state.

Parity requirement:

- Do not change the `space` route value.
- Do not replace native `hidden` with `.hidden` for the modal.
- Do not replace native disabled state with visual-only classes.

## Event Roots

Runtime event bindings from `task-log-runtime.js`:

```text
#taskLogRefresh: click
#taskLogSearch: input
#taskLogDateFrom: change
#taskLogDateTo: change
#taskLogType: change
#taskLogStatus: change
#taskLogLimit: change
#taskLogPrev: click
#taskLogNext: click
#taskLogRows: click delegation
#taskLogModal: click delegation
document: keydown Escape
document.body: MutationObserver for data-view
```

Delegated selectors:

```text
[data-task-log-copy]
[data-task-log-detail]
[data-task-log-output]
[data-task-log-close]
```

Parity requirement:

- Keep generated action buttons inside `#taskLogRows` or another root that the
  runtime explicitly binds.
- Keep close/copy buttons inside `#taskLogModal`.
- Do not add a second binding path in the same batch.

## CSS Contract

CSS source entry:

```text
styles.css -> styles/task-log.css
```

Primary task-log selectors in `styles/task-log.css`:

```text
body[data-view="space"] .profile-view
#taskLogPage.task-log-page
.task-log-refresh.loading
.task-log-action:disabled
.task-log-pagination button:disabled
.task-log-modal[hidden]
.task-log-status-*
.task-log-output-*
```

Shared CSS dependencies:

```text
styles/workspace-layout.css: .app-view and .app-view.active
styles/legacy-canvas-visual.css: .simple-page-view
styles/globals.css: .visually-hidden
```

Parity requirement:

- Do not change task-log CSS in the same batch as a template move.
- Do not include the existing `styles/task-log.css` worktree change unless a
  separate task explicitly asks for it.
- After any future split, verify the built CSS bundle still styles task-log.

## Required Static Searches

Run these before a future task-log template split:

```bash
rg -n "taskLog|data-task-log|profileView|data-view=\"space\"|dataset\\.view" index.html src/client styles
rg -n "#taskLogPage|#taskLogModal|#taskLogRows|#taskLogRefresh|#taskLogSearch|#taskLogLimit" index.html src/client styles
rg -n "task-log-|task-log|profile-view|simple-page-view|app-view|active|hidden|loading|disabled" index.html src/client styles
rg -n "bindTaskLogRuntime|collectTaskLogElements|taskLogBound|MutationObserver|/api/ai/jobs" src/client
```

Run these after a future split:

```bash
git diff --name-only
npm run check
npm run build
rg -n "id=\"taskLogPage\"|id=\"taskLogModal\"|data-task-log-close|id=\"taskLogRows\"" index.html src/client
```

Expected post-split evidence:

- The intended template file contains the moved task-log markup.
- `index.html` or the workspace mount path still guarantees the markup exists
  before `bindTaskLogRuntime(runtime)`.
- `git diff --name-only` contains only the intended template/runtime files for
  that future batch.

## Future Smoke Checklist

Use this after a future task-log split:

- Navigate to the task-log route and confirm `body[data-view="space"]`.
- Confirm `#profileView.active` is applied.
- Confirm `#taskLogPage` exists before binding and has `data-task-log-bound`
  after binding.
- Confirm `/api/ai/jobs` is requested on first visible load.
- Refresh button enters and exits `.loading`.
- Search, date range, type, status, and page-size controls refresh the list.
- Previous/next buttons update disabled state correctly.
- Row copy works from `[data-task-log-copy]`.
- Detail opens from `[data-task-log-detail]`.
- Output opens from `[data-task-log-output]` for succeeded jobs.
- Modal closes by backdrop, close button, and Escape.
- Image, video, and model output previews keep their existing classes.
- No console error appears for missing task-log selectors.
- Home, canvas, chat, project library, and asset page still switch routes.

## Current Recommendation

Do not split task-log yet in the next code batch unless selector parity checks
are automated or manually verified immediately before the move.

The safest next code step remains a behavior-equivalent extraction of only
`#taskLogPage` and `#taskLogModal`, while leaving `#profileView` in
`index.html`.
