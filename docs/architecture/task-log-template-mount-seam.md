# Task Log Template Mount Seam

Date: 2026-06-30

This document defines the future mount seam for a behavior-equivalent task-log
template extraction. It is documentation only. It does not authorize moving DOM,
renaming selectors, changing runtime code, changing UI, changing CSS, changing
API behavior, or deleting files.

## Purpose

The task-log markup is a reasonable future template extraction candidate, but
the current routed host and runtime binding are still coupled to `index.html`.
This document records the safest first seam before any implementation work:

- Keep `#profileView` in `index.html`.
- Keep the workspace view routing contract unchanged.
- Only consider the inner task-log island under `#taskLogPage`.
- Inject or preserve the same task-log DOM before `bindTaskLogRuntime()` runs.
- Preserve every existing id, class, data attribute, ARIA attribute, and default
  state in the first extraction.

This seam exists to avoid a broad frontend rewrite while moving toward
feature-owned templates over time.

## Current Runtime Contract

Current static host:

```text
index.html lines 320-423
```

Current routed shell:

```text
#profileView
.profile-view
.app-view
.simple-page-view
```

Current task-log island:

```text
#taskLogPage
#taskLogRows
#taskLogModal
#taskLogDetailBody
```

Current owner:

```text
src/client/features/workspace/task-log/task-log-runtime.js
```

Current visibility contract:

- Workspace routing sets `body.dataset.view = "space"`.
- The view router activates `#profileView`.
- Task-log runtime treats `body[data-view="space"]` and `#profileView.active`
  as visibility signals.
- Task-log runtime binds once through `#taskLogPage.dataset.taskLogBound`.

## Proposed First Mount Seam

The first extraction, if it happens later, should introduce a mount seam inside
the existing profile view:

```text
index.html
  #profileView
    task-log mount target
      #taskLogPage
        task-log controls
        #taskLogRows
        #taskLogModal
```

The seam should not move `#profileView`.

The seam should not change the route value `space`.

The seam should not change how `body[data-view="space"]` scopes CSS.

The seam should not change the task-log API calls:

```text
GET /api/ai/jobs
GET /api/ai/jobs/:jobId
```

## Mount Timing Requirement

The task-log DOM must exist before task-log runtime binding happens.

Future implementation must prove one of these approaches:

1. The extracted template is synchronously mounted before
   `bindTaskLogRuntime()` queries `#taskLogPage`.
2. Or the task-log runtime explicitly owns mounting and binding in one ordered
   function, without changing visible behavior.

Do not use a delayed or async mount unless the runtime is changed in the same
small task with proof that:

- The route can open before the DOM exists without throwing.
- Binding still happens exactly once.
- Auto-refresh starts only after the DOM exists.
- The empty/loading state is preserved.

If mount timing cannot be proven, keep the task-log markup in `index.html`.

## Locked DOM Contract

The first implementation must preserve these roots:

```text
#profileView
#taskLogPage
#taskLogRows
#taskLogModal
#taskLogDetailBody
```

The first implementation must preserve these controls:

```text
#taskLogRefresh
#taskLogSearch
#taskLogDateFrom
#taskLogDateTo
#taskLogType
#taskLogStatus
#taskLogRange
#taskLogPrev
#taskLogNext
#taskLogLimit
```

The first implementation must preserve these action attributes:

```text
data-task-log-detail
data-task-log-copy
data-task-log-output
data-task-log-close
```

The first implementation must preserve these state contracts:

```text
body[data-view="space"]
.profile-view
.app-view
.simple-page-view
.active
.loading
disabled
hidden
dataset.taskLogBound
```

No selector rename is allowed in the first extraction.

## Recommended Future File Shape

If a later task implements this seam, the safest target ownership is still under
workspace task-log:

```text
src/client/features/workspace/task-log/
  task-log-runtime.js
  task-log-template.js
```

Recommended future public function shape:

```text
mountTaskLogTemplate(root)
bindTaskLogRuntime(options)
```

Constraints:

- `mountTaskLogTemplate(root)` must be deterministic and behavior-equivalent.
- `bindTaskLogRuntime()` must continue to bind once.
- The first implementation should not add a new framework, template engine, or
  dependency.
- The first implementation should not introduce a generic component system.
- The first implementation should not move any other view.

This file shape is a recommendation only. It is not permission to implement it
in this documentation task.

## Do Not Move In The First Seam

Do not move:

- `#profileView`.
- The workspace side navigation.
- `body[data-view]` routing logic.
- Any canvas, chat, image generation, video generation, model3d, asset library,
  auth, project library, or credit markup.
- Any CSS selectors.
- Any server API code.

Do not combine task-log mounting with:

- CSS migration.
- Encoding or copy cleanup.
- API schema changes.
- Runtime refresh behavior changes.
- Pagination or filter behavior changes.
- Modal behavior changes.
- `styles/task-log.css` cleanup.
- Legacy deletion.
- Dependency changes.

## Required Evidence Before Implementation

Before a future implementation commit, collect evidence for each item:

| Item | Required evidence |
| --- | --- |
| DOM range | Current `index.html` task-log range and exact extracted template content. |
| Mount point | Exact element that receives the task-log island while keeping `#profileView`. |
| Bind order | Evidence that mount happens before `bindTaskLogRuntime()` reads DOM nodes. |
| Selector parity | Search output proving every locked selector remains present. |
| CSS parity | Evidence that `styles/task-log.css` selectors still match the rendered DOM. |
| Event parity | Evidence that row and modal delegation still use the same `data-task-log-*` attributes. |
| API parity | Evidence that list/detail endpoints and response shapes are unchanged. |
| Browser smoke | Task-log navigation, filters, pagination, detail modal, output modal, and Escape close pass. |
| Rollback | One commit revert or one explicit file restore path returns to static markup. |

## Required Searches Before Implementation

Run and review:

```bash
rg -n "taskLog|data-task-log|profileView|data-view=\"space\"|dataset\\.view" index.html src/client styles
rg -n "#taskLogPage|#taskLogRows|#taskLogModal|#taskLogDetailBody|#taskLogRefresh|#taskLogSearch|#taskLogType|#taskLogStatus" index.html src/client styles
rg -n "body\\[data-view=\"space\"\\]|\\.profile-view|\\.task-log|\\[hidden\\]|\\.hidden|\\.loading" index.html src/client styles
rg -n "addEventListener\\(|closest\\(|MutationObserver|taskLogBound|openTaskDetail|openTaskOutput|loadJobs" src/client/features/workspace/task-log index.html
```

Stop if any result implies a selector rename, CSS specificity change, or routing
change is required.

## Verification Gate For Future Implementation

Minimum command gate:

```bash
npm run check
npm run build
git diff --name-only
```

Minimum DOM gate:

- `#profileView` remains in `index.html`.
- `#taskLogPage` exists before task-log runtime binding.
- `#taskLogRows` exists before list rendering.
- `#taskLogModal` keeps native `hidden`.
- `[data-task-log-close]` still closes the modal.
- `dataset.taskLogBound` still prevents duplicate binding.

Minimum browser smoke:

- App boots without console errors.
- Navigating to task log sets `body[data-view="space"]`.
- `#profileView` becomes active.
- Rows load or an intentional empty/error state appears inside `#taskLogRows`.
- Filters trigger refresh.
- Pagination preserves enabled/disabled behavior.
- Detail modal opens from `data-task-log-detail`.
- Output modal opens from `data-task-log-output` when enabled.
- Backdrop, close button, and Escape close the modal.
- Navigating away and back does not duplicate event bindings or requests.

Minimum API smoke:

- Authenticated `GET /api/ai/jobs?limit=10&offset=0` returns `jobs`, `total`,
  `limit`, and `offset`.
- Authenticated `GET /api/ai/jobs/:jobId` for a returned local job id returns
  `job`, `status`, `requestData`, `responseData`, `billing`, and output fields.
- Missing or cross-user job ids do not leak data.

## Stop Conditions

Stop a future implementation if:

- `#profileView` must be moved.
- The mount target cannot be available before binding.
- Any locked id, class, or `data-*` attribute would need to change.
- Any task-log CSS selector would need to change to preserve appearance.
- Any runtime behavior would change.
- Any task-log API response shape would change.
- `styles/task-log.css` becomes necessary but is not explicitly in scope.
- Browser smoke cannot be run or cannot pass.
- `git diff --name-only` shows unrelated files.

## Rollback

Before a future implementation commit:

```bash
git restore -- index.html src/client/features/workspace/task-log/<new-or-edited-files>
git restore --staged index.html src/client/features/workspace/task-log/<new-or-edited-files>
```

After commit:

```bash
git revert <commit>
```

For this documentation-only task:

```bash
git restore -- docs/architecture/task-log-template-mount-seam.md
git restore --staged docs/architecture/task-log-template-mount-seam.md
```

## Current Recommendation

Do not implement the template mount seam yet.

The next safer step after this document is to add a static evidence checklist
or a small selector search snapshot for the task-log region. Only after that
should a separate branch or explicit task prototype the mount seam.
