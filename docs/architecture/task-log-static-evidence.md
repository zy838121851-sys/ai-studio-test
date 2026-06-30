# Task Log Static Evidence

This document records the current static evidence for the task-log surface
before any future template extraction. It is documentation only. It does not
move DOM, change runtime logic, change styles, add features, or authorize
deleting files.

## Evidence Date

Date: 2026-06-30

Last refreshed: 2026-06-30 after task-log template contract comments were added
to `index.html`.

Branch at capture:

```text
codex/saas-governance-baseline
```

Known unrelated worktree change:

```text
styles/task-log.css
```

That existing style change remains out of scope for task-log template
governance unless a future batch explicitly owns it.

## Source Files Inspected

Primary files:

```text
index.html
src/client/features/workspace/task-log/task-log-runtime.js
src/client/features/workspace/runtime/app-runtime-host.js
src/client/features/workspace/runtime/ui-elements.js
src/client/features/workspace/routing/view-router.js
src/client/features/workspace/routing/view-runtime.js
styles.css
styles/task-log.css
styles/workspace-layout.css
styles/legacy-canvas-visual.css
styles/globals.css
src/server/routes/ai.routes.js
src/server/services/ai-job.service.js
```

Supporting governance docs:

```text
docs/architecture/index-template-map.md
docs/architecture/dom-dependency-map.md
docs/architecture/runtime-event-map.md
docs/architecture/feature-template-split-checklist.md
docs/architecture/task-log-split-assessment.md
docs/architecture/task-log-selector-parity.md
docs/architecture/task-log-smoke-test.md
docs/architecture/task-log-template-extraction-plan.md
docs/architecture/task-log-governance-index.md
```

## Current DOM Evidence

Current static task-log area in `index.html`:

| Line | Evidence |
| ---: | --- |
| 320 | Existing structure comment for the task-log route shell. |
| 321 | `#profileView.profile-view.app-view.simple-page-view`. |
| 325 | Existing structure comment for the task-log template candidate. |
| 326 | `#taskLogPage.simple-page-shell.task-log-page`. |
| 333 | `#taskLogRefresh.task-log-refresh`. |
| 337 | Filter controls contract comment. |
| 341 | `#taskLogSearch`. |
| 345 | `#taskLogDateFrom`. |
| 349 | `#taskLogDateTo`. |
| 353 | `#taskLogType`. |
| 362 | `#taskLogStatus`. |
| 375 | Table shell contract comment. |
| 390 | Runtime rows root comment. |
| 391 | `#taskLogRows`. |
| 397 | Pagination contract comment. |
| 399 | `#taskLogRange`. |
| 401 | `#taskLogPrev`. |
| 402 | `#taskLogNext`. |
| 405 | `#taskLogLimit`. |
| 415 | `#taskLogModal.task-log-modal[hidden]`. |
| 416 | Detail modal contract comment. |
| 417 | `.task-log-modal-backdrop[data-task-log-close]`. |
| 424 | Close button with `[data-task-log-close]`. |
| 426 | `#taskLogDetailBody.task-log-detail-body`. |
| 430 | Existing closing comment for the task-log template candidate. |

Boundary conclusion:

- `#profileView` is the route shell and should stay in `index.html` for the
  first future extraction.
- `#taskLogPage` and `#taskLogModal` are the only intended first template
  candidates.
- The shared `nav.home-nav` and `[data-brand-menu]` shell must not be moved in
  the first task-log extraction.
- The current `index.html` comments define route shell, template candidate,
  filter controls, table shell, row root, pagination, and modal contract
  boundaries. They are documentation only and do not authorize moving DOM.

## Runtime Binding Evidence

Task-log runtime entry:

```text
src/client/features/workspace/task-log/task-log-runtime.js:14
export function bindTaskLogRuntime(runtime = {}) { ... }
```

Workspace startup calls task-log binding:

```text
src/client/features/workspace/runtime/app-runtime-host.js:12
src/client/features/workspace/runtime/app-runtime-host.js:21
```

One-time binding guard:

```text
task-log-runtime.js:19-20
elements.page.dataset.taskLogBound === "true"
elements.page.dataset.taskLogBound = "true"
```

Visibility trigger:

```text
task-log-runtime.js:44
documentRoot.body?.dataset.view === "space"
elements.profileView?.classList.contains("active")
```

Route-state observer:

```text
task-log-runtime.js:101
new MutationObserver(syncVisibility)
```

Cleanup resets the binding guard:

```text
task-log-runtime.js:111
elements.page.dataset.taskLogBound = ""
```

## Runtime Query Evidence

`collectTaskLogElements(root)` currently queries:

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
#taskLogModal .task-log-modal-header p
#taskLogModal .task-log-modal-header h2
#taskLogDetailBody
```

Evidence location:

```text
src/client/features/workspace/task-log/task-log-runtime.js:117-135
```

All of those nodes must exist before `bindTaskLogRuntime(runtime)` runs in a
future extraction.

## Event Evidence

Direct control bindings in `task-log-runtime.js`:

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
```

Delegated row actions:

```text
#taskLogRows click -> [data-task-log-copy]
#taskLogRows click -> [data-task-log-detail]
#taskLogRows click -> [data-task-log-output]
```

Delegated modal actions:

```text
#taskLogModal click -> [data-task-log-close]
#taskLogModal click -> [data-task-log-copy]
```

Document-level behavior:

```text
document keydown Escape closes #taskLogModal when modal.hidden is false
document.body data-view MutationObserver triggers route visibility sync
```

Evidence location:

```text
src/client/features/workspace/task-log/task-log-runtime.js:57-101
```

## Route Shell Evidence

`#profileView` is also used outside the task-log runtime:

```text
src/client/features/workspace/routing/view-router.js:15
src/client/features/workspace/routing/view-router.js:20
src/client/features/workspace/routing/view-router.js:23
src/client/features/workspace/routing/view-runtime.js:16
src/client/features/workspace/runtime/ui-elements.js:5
src/client/features/workspace/runtime/workspace-app-elements.js:8
src/client/features/workspace/runtime/workspace-app-elements.js:82
src/client/features/workspace/runtime/workspace-project-home-runtime.js:39
src/client/features/projects/workflows/project-workflow.js:42
src/client/features/projects/workflows/project-workflow.js:182
```

Route conclusion:

- Moving `#profileView` is not part of the first task-log extraction.
- Any first extraction must mount task-log content inside the existing
  `#profileView` shell.

## API Evidence

Client requests:

```text
GET /api/ai/jobs?limit=<limit>&offset=<offset>&...
GET /api/ai/jobs/:jobId
```

Client evidence:

```text
task-log-runtime.js:153
task-log-runtime.js:228
task-log-runtime.js:241
```

Server route evidence:

```text
src/server/routes/ai.routes.js:412
router.get("/ai/jobs", ...)

src/server/routes/ai.routes.js:428
router.get("/ai/jobs/:jobId", ...)
```

Server service evidence:

```text
src/server/services/ai-job.service.js:70
getAIJobDetails(userId, id)

src/server/services/ai-job.service.js:90
listAIJobs(userId, filters = {})

src/server/services/ai-job.service.js:116
refreshAIJob(userId, id)
```

API conclusion:

- Task-log reads server truth through authenticated same-origin API calls.
- A template extraction must not change request timing, query keys, or
  credential behavior.

## CSS Evidence

Source CSS import chain:

```text
styles.css -> styles/task-log.css
```

Primary task-log selectors:

```text
styles/task-log.css:1
body[data-view="space"] .profile-view

styles/task-log.css:7
#taskLogPage.task-log-page

styles/task-log.css:54
.task-log-refresh.loading

styles/task-log.css:173-197
.task-log-status*

styles/task-log.css:405-443
.task-log-output*

styles/task-log.css:443
responsive #taskLogPage.task-log-page rule
```

Shared style dependencies:

```text
styles/globals.css:48
.visually-hidden

styles/legacy-canvas-visual.css:826
.simple-page-view

styles/legacy-canvas-visual.css:834
.simple-page-view::before
```

CSS conclusion:

- A future task-log template extraction must not change classes or selector
  specificity.
- `styles/task-log.css` must stay out of the extraction batch unless explicitly
  requested.
- Built production CSS is still bundled through Vite into `dist/assets`.

## Dynamic Selector Evidence

Runtime-generated row/action selectors:

```text
data-task-log-copy
data-task-log-detail
data-task-log-output
task-log-task-id
task-log-icon-button
task-log-action
task-log-status task-log-status-<status>
```

Runtime-generated detail/output selectors:

```text
task-log-detail-loading
task-log-detail-error
task-log-detail-section
task-log-detail-title
task-log-detail-grid
task-log-failure
task-log-muted
task-log-output-preview
task-log-output-item
task-log-output-image
task-log-output-video
task-log-output-model
```

Evidence location:

```text
src/client/features/workspace/task-log/task-log-runtime.js
```

Dynamic selector conclusion:

- A future static template extraction does not own these generated selectors,
  but it must preserve the roots that delegate to them:
  `#taskLogRows` and `#taskLogModal`.

## Known Out-Of-Scope Findings

`src/client/features/workspace/task-log/task-log-runtime.js` still contains
visible mojibake in several Chinese strings when read in the current console.
This document records that evidence but does not repair it.

Do not fix those strings in a template extraction batch. If fixed later, it must
be a separate high-confidence copy restoration task with its own verification.

## Future Extraction Gate

Before any future task-log extraction, rerun:

```bash
rg -n "taskLog|data-task-log|profileView|dataset\\.view|bindTaskLogRuntime|taskLogBound|MutationObserver|/api/ai/jobs" index.html src/client/features/workspace/task-log src/client/features/workspace/routing src/client/features/workspace/runtime src/client/features/projects/workflows/project-workflow.js
rg -n "body\\[data-view=\"space\"\\]|#taskLogPage|#taskLogModal|task-log-refresh|task-log-status|task-log-output|profile-view|simple-page-view|visually-hidden" styles.css styles/task-log.css styles/workspace-layout.css styles/legacy-canvas-visual.css styles/globals.css
rg -n "profileView|taskLogPage|taskLogRefresh|taskLogSearch|taskLogDateFrom|taskLogDateTo|taskLogType|taskLogStatus|taskLogRows|taskLogRange|taskLogPrev|taskLogNext|taskLogLimit|taskLogModal|taskLogDetailBody|data-task-log-close" index.html
rg -n "listAIJobs|getAIJobDetails|refreshAIJob|getJobOutputAssets|router\\.get\\(\"/ai/jobs" src/server/routes/ai.routes.js src/server/services/ai-job.service.js
```

Stop if the search evidence no longer matches this document.

## Current Recommendation

The next code batch can only be considered after this evidence is refreshed
against the live worktree. The safest future code path remains:

1. Keep `#profileView` in `index.html`.
2. Mount an identical `#taskLogPage` and `#taskLogModal` template before
   `bindTaskLogRuntime(runtime)`.
3. Keep task-log runtime, CSS, route value, API calls, ids, classes, and
   `data-*` attributes unchanged.
