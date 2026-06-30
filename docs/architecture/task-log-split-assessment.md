# Task Log Split Assessment

This document assesses whether the task-log area can later be split from
`index.html` into a feature template. It is documentation only and does not
change runtime behavior, UI, or interactions.

## Current DOM Area

The static task-log markup currently lives in `index.html` inside the personal
space view:

```text
#profileView.profile-view.app-view.simple-page-view
  nav.home-nav
    button.brand-mark[data-brand-menu]
  #taskLogPage.simple-page-shell.task-log-page
    header.task-log-heading
      #taskLogRefresh.task-log-refresh
    section.task-log-panel
      .task-log-toolbar
      .task-log-table-wrap
      footer.task-log-footer
    #taskLogModal.task-log-modal[hidden]
      .task-log-modal-backdrop[data-task-log-close]
      .task-log-modal-card
        .task-log-modal-header
        #taskLogDetailBody.task-log-detail-body
```

Important boundary:

- `#profileView` is the route-level shell for `view === "space"`.
- `#taskLogPage` and `#taskLogModal` are the task-log-specific content.
- The `nav.home-nav` and `button[data-brand-menu]` are shared navigation/menu
  concerns, not task-log behavior.

## IDs, Classes, and Data Attributes

Static IDs used by the task-log area:

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

Static classes used by the route shell and task-log markup:

```text
.profile-view
.app-view
.simple-page-view
.home-nav
.brand-mark
.simple-page-shell
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
.visually-hidden
```

Static `data-*` and native state attributes:

```text
data-brand-menu
data-task-log-close
hidden
```

Dynamic attributes and classes produced by
`src/client/features/workspace/task-log/task-log-runtime.js`:

```text
data-task-log-bound
data-task-log-copy
data-task-log-detail
data-task-log-output
.loading
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

## Client References

Direct task-log runtime:

- `src/client/features/workspace/task-log/task-log-runtime.js`
  - Queries all task-log IDs listed above.
  - Binds controls once using `#taskLogPage.dataset.taskLogBound`.
  - Watches `document.body.dataset.view` for `"space"`.
  - Uses delegated clicks for `[data-task-log-copy]`,
    `[data-task-log-detail]`, `[data-task-log-output]`, and
    `[data-task-log-close]`.
  - Uses native `hidden` on `#taskLogModal`.
  - Calls `/api/ai/jobs` and `/api/ai/jobs/:jobId` with same-origin
    credentials.

Runtime boot:

- `src/client/features/workspace/runtime/app-runtime-host.js`
  - Imports and calls `bindTaskLogRuntime(runtime)` during workspace startup.

Route and shell references:

- `src/client/features/workspace/routing/view-router.js`
  - Sets `body.dataset.view = view`.
  - Toggles `#profileView.active` when `view === "space"`.
  - Updates `[data-nav-view]` active states.
- `src/client/features/workspace/routing/view-runtime.js`
  - Falls back to `document.querySelector("#profileView")`.
- `src/client/features/workspace/runtime/ui-elements.js`
  - Collects `profileView: root.querySelector("#profileView")`.
- `src/client/features/workspace/runtime/workspace-app-elements.js`
  - Carries `profileView` through workspace runtime element wiring.
- `src/client/features/workspace/runtime/workspace-project-home-runtime.js`
  - Passes `elements.profileView` into shared view flow.
- `src/client/features/projects/workflows/project-workflow.js`
  - Includes `profileView` in view-state changes.

## CSS Dependencies

Primary task-log stylesheet:

- `styles/task-log.css`
  - Imported from `styles.css`.
  - Contains task-log layout, table, status, pagination, modal, detail, and
    output-preview styles.
  - Starts with `body[data-view="space"] .profile-view`, so it depends on the
    global view state.
  - Has an existing unrelated worktree change and must not be overwritten by a
    split assessment or unrelated cleanup.

Shared style dependencies:

- `styles.css`
  - Imports `styles/task-log.css`.
- `styles/workspace-layout.css`
  - Defines shared `.app-view` and `.app-view.active` route visibility.
  - Defines many shared page/auth/home layout utilities used around the route
    shell.
- `styles/legacy-canvas-visual.css`
  - Defines `.simple-page-view` and `.simple-page-view::before`, shared by
    `#profileView` and `#assetsPageView`.
- `styles/globals.css`
  - Defines `.visually-hidden`.

Production build note:

- Vite bundles the CSS import graph into `dist/assets/index-*.css`.
- Source compatibility paths should not be assumed without checking
  `docs/architecture/style-entry-map.md`.

## State Dependencies

Task-log currently depends on these global or native states:

- `body[data-view="space"]`
  - Used by `task-log-runtime.js` to decide when to refresh.
  - Used by `styles/task-log.css` for profile-view display.
- `#profileView.active`
  - Toggled by the global view router.
  - Used by `task-log-runtime.js` as an alternate visibility check.
- `#taskLogModal[hidden]`
  - Controls modal visibility.
  - Used by CSS selector `.task-log-modal[hidden]`.
- `#taskLogRefresh.loading`
  - Controls refresh-button loading state.
- Disabled controls
  - Pagination and unavailable output actions use native `disabled`.
- `#taskLogPage.dataset.taskLogBound`
  - Prevents duplicate event binding and is reset during cleanup.

## Cross-Feature Coupling

Canvas:

- No direct canvas DOM or canvas module dependency was found in the task-log
  runtime.
- Coupling is indirect through shared app startup, shared view routing, and
  global CSS visibility.

Chat:

- No direct chat DOM dependency was found.
- Task-log records AI jobs that may originate from chat or generation flows,
  but it reads them through `/api/ai/jobs` rather than chat runtime state.

Assets:

- No direct asset library DOM dependency was found.
- Generated output URLs can be opened from task-log details, but they are not
  inserted into the asset library by this runtime.

Projects:

- `project-workflow.js` participates in global view switching and carries
  `profileView`.
- This is route-shell coupling, not task-log table/modal coupling.

Auth/API:

- API calls use same-origin credentials and will depend on the current auth
  behavior of `/api/ai/jobs`.

Conclusion on coupling:

- `#taskLogPage` plus `#taskLogModal` has low direct coupling to canvas, chat,
  assets, and projects.
- `#profileView` has medium coupling because it is a global route shell used by
  workspace routing and shared view-state code.

## Split Risk

Recommended risk level:

- Splitting only `#taskLogPage` and `#taskLogModal`: Medium-low.
- Moving or recreating all of `#profileView`: Medium-high.

Reasons:

- The task-log runtime is already centralized in one feature module.
- Selectors are explicit and stable, mostly IDs.
- Event binding is delegated and self-contained.
- The page still relies on global route state, shared `.app-view.active`
  behavior, shared `.simple-page-view` styling, and the `#profileView` shell.
- Any missing ID will silently break a control or prevent initial binding.

## Minimum Safe Split Steps

If this area is split later, use the smallest safe path:

1. Keep `#profileView` in `index.html` for the first split.
2. Extract only the exact inner task-log template for `#taskLogPage` and
   `#taskLogModal`.
3. Preserve every ID, class, `data-*`, native `hidden`, label, button type,
   table structure, and select option value exactly.
4. Mount the extracted template before `bindTaskLogRuntime(runtime)` runs.
5. Do not rename selectors or change CSS in the same step.
6. Do not change `/api/ai/jobs` call timing or refresh behavior.
7. Run static selector checks before and after the split.
8. Run `npm run check` and `npm run build`.
9. Smoke test the route, filters, pagination, modal, copy actions, and output
   preview.
10. Only after that succeeds, consider whether the route shell `#profileView`
    should move into a route-level template in a separate phase.

## Smoke Test Checklist

After any future task-log template split, verify:

- Navigating to personal space sets `body[data-view="space"]`.
- `#profileView` receives `.active`.
- `#taskLogPage` exists before task-log runtime binding.
- `#taskLogPage.dataset.taskLogBound` is set only once.
- Initial visibility triggers `/api/ai/jobs`.
- Refresh button enters and leaves `.loading`.
- Search filters by task ID.
- Date range, type, status, and page-size controls refresh the list.
- Previous and next buttons update page state and disabled state correctly.
- Rows render type, task ID, model, status, credits, duration, and actions.
- Copy task ID works from the row.
- Detail modal opens from `[data-task-log-detail]`.
- Detail modal closes from backdrop, close button, and Escape.
- Copy buttons inside detail modal work.
- Successful output opens through `[data-task-log-output]`.
- Image, video, and model output previews render with the existing classes.
- Failed, queued, running, timeout, cancelled, and save-failed states still map
  to their existing status classes.
- No console errors appear for missing selectors.
- Home, canvas, project library, asset page, chat, upload, and generation flows
  still route normally.
- The task-log layout still receives styles from the bundled CSS output.

## Current Conclusion

Task-log is suitable as the first trial split candidate if the first split is
limited to the task-log content template and keeps the `#profileView` route
shell stable.

It should not start by moving the whole `#profileView` shell. The shell is part
of global view routing and shared page styling, while the task-log content is a
cleaner and safer boundary.

Recommended next step:

- Prepare a no-behavior-change template extraction plan for `#taskLogPage` and
  `#taskLogModal`, with exact selector parity checks before any code change.
