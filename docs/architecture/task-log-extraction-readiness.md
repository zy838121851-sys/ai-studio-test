# Task Log Extraction Readiness

Date: 2026-06-30

This document defines the readiness gate for a future task-log template
extraction from `index.html`. It is documentation only. It does not authorize a
template split in the current batch and does not change runtime behavior, UI,
CSS, API behavior, database schema, dependencies, or deployment config.

## Current Status

Task log is a reasonable future template extraction candidate because:

- The static markup is grouped in `index.html` under `#profileView` and
  `#taskLogPage`.
- The runtime is already grouped in
  `src/client/features/workspace/task-log/task-log-runtime.js`.
- The API contract is documented in
  `docs/architecture/task-log-api-contract.md`.
- The verification gate is documented in
  `docs/architecture/task-log-verification-checklist.md`.

Task log is not ready to move until all readiness items in this document are
proved in the live checkout.

## Candidate Ownership

Current owner:

```text
src/client/features/workspace/task-log/task-log-runtime.js
```

Likely first extraction owner:

```text
src/client/features/workspace/task-log/
```

Do not create a standalone `features/task-log` ownership boundary in the first
move unless a separate architecture decision proves that task log is no longer
owned by the workspace/profile route.

## Current Template Region

Current static region:

```text
index.html lines 320-423
```

Current top-level roots:

```text
#profileView
#taskLogPage
#taskLogModal
```

Important note:

- `#profileView` is both the routed profile/space view and the task-log host.
- A first extraction should not move `#profileView` away from the workspace view
  router unless the route contract is separately proven.
- A safer first extraction is to keep `#profileView` in `index.html` and only
  move the inner task-log island after a mount plan exists.

## Locked Selectors

These selectors must remain byte-for-byte compatible in the first extraction.

View and visibility:

```text
body[data-view="space"]
#profileView
.profile-view
.app-view
.simple-page-view
.active
```

Task-log roots:

```text
#taskLogPage
#taskLogRows
#taskLogModal
#taskLogDetailBody
```

Controls:

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

Delegated action attributes:

```text
data-task-log-detail
data-task-log-copy
data-task-log-output
data-task-log-close
```

State contracts:

```text
hidden
dataset.taskLogBound
.loading
disabled
```

## First Extraction Must Preserve

The first extraction must preserve:

- The same ids, classes, `data-*` attributes, ARIA attributes, and native
  `hidden` defaults.
- The same DOM order within the task-log region.
- The same `body[data-view="space"]` route visibility behavior.
- The same `#profileView.active` visibility fallback.
- The same `#taskLogPage.dataset.taskLogBound` duplicate-binding guard.
- The same event delegation from `#taskLogRows`.
- The same modal close behavior through `[data-task-log-close]` and Escape.
- The same API calls:
  - `GET /api/ai/jobs`
  - `GET /api/ai/jobs/:jobId`
- The same list/detail/output response field expectations.
- The same CSS selector matching from the existing stylesheet graph.

## Required Evidence Before Moving Markup

Collect and paste or link evidence for each item before any future extraction
commit:

| Item | Evidence required |
| --- | --- |
| DOM range | Exact current `index.html` line range and target extracted markup range. |
| Selector search | `rg` output proving every locked id/class/data attribute reference. |
| Runtime owner | Current `bindTaskLogRuntime()` binding path and one-time guard behavior. |
| View router | Evidence that `body[data-view="space"]` and `#profileView.active` still drive visibility. |
| CSS contract | Evidence that current `styles/task-log.css` selectors still match after the move. |
| API contract | Evidence that list and detail response shapes are unchanged. |
| Smoke path | Browser/API steps from `task-log-verification-checklist.md` executed successfully. |
| Rollback | Exact commit or file restore path that returns the old `index.html` markup. |

If any evidence is missing, do not move markup.

## Required Searches

Run these searches in the live checkout before any extraction:

```bash
rg -n "taskLog|data-task-log|profileView|data-view=\"space\"|dataset\\.view" index.html src/client styles
rg -n "#taskLogPage|#taskLogRows|#taskLogModal|#taskLogDetailBody|#taskLogRefresh|#taskLogSearch|#taskLogType|#taskLogStatus" index.html src/client styles
rg -n "body\\[data-view=\"space\"\\]|\\.profile-view|\\.task-log|\\[hidden\\]|\\.hidden|\\.loading" index.html src/client styles
rg -n "addEventListener\\(|closest\\(|MutationObserver|taskLogBound|openTaskDetail|openTaskOutput|loadJobs" src/client/features/workspace/task-log index.html
```

Search output must be reviewed, not just run.

## Recommended First Move Shape

Do not start by moving the entire `#profileView` region.

Recommended shape for the first actual extraction:

1. Keep `#profileView` as the workspace-routed shell in `index.html`.
2. Extract only the inner task-log template under `#taskLogPage`, including
   `#taskLogModal`, if a mount mechanism can inject the identical DOM before
   `bindTaskLogRuntime()` runs.
3. Preserve all ids/classes/data attributes.
4. Keep the extraction in the existing workspace task-log folder.
5. Do not rename files, selectors, or CSS in the same batch.
6. Do not delete the original markup until replacement mounting is proven in
   browser smoke checks.

Alternative:

- If the mount mechanism would require broad app boot changes, stop and keep
  task-log in `index.html` until a safer workspace template composition seam is
  documented.

## Do Not Combine With Extraction

Do not combine task-log extraction with:

- CSS migration.
- Selector renaming.
- Copy or encoding cleanup.
- API changes.
- Runtime behavior changes.
- Pagination/filter behavior changes.
- Modal behavior changes.
- `styles/task-log.css` cleanup.
- `styles/task-log.css` existing worktree change handling.
- Legacy deletion.
- Framework migration.
- Dependency changes.
- Server changes.

## Verification Required After Extraction

Minimum command gate:

```bash
npm run check
npm run build
git diff --name-only
```

Minimum browser smoke:

- App boots without console errors.
- Navigation to space/task-log sets `body[data-view="space"]`.
- `#profileView` becomes active.
- `#taskLogPage` exists before `bindTaskLogRuntime()` binds.
- Rows load into `#taskLogRows`.
- Filters trigger list refresh.
- Pagination buttons preserve disabled/enabled behavior.
- Detail modal opens from `data-task-log-detail`.
- Output modal opens from `data-task-log-output` when enabled.
- `[data-task-log-close]` and Escape close the modal.
- There are no duplicated event bindings after navigating away and back.

Minimum API smoke:

- Authenticated `GET /api/ai/jobs?limit=10&offset=0` returns `jobs`, `total`,
  `limit`, and `offset`.
- Authenticated `GET /api/ai/jobs/:jobId` for a returned local job id returns
  `job`, `status`, `requestData`, `responseData`, `billing`, and output fields.
- Missing or cross-user job ids do not leak job data.

Minimum style smoke:

- Task-log page layout remains scoped to the space/profile view.
- Task-log filters, table, status badges, pagination, and modal remain styled.
- Other app views do not become visible because CSS failed.
- CSS responses remain `text/css` in production-like checks.

## Stop Conditions

Stop before or during extraction if:

- `#profileView` must be moved to make the extraction work.
- The mount point cannot be available before `bindTaskLogRuntime()` runs.
- Any locked selector would need to be renamed.
- Any CSS selector would need changed specificity to keep the same appearance.
- Any API response shape would need to change.
- Any behavior would change.
- Any browser smoke step cannot be executed.
- `styles/task-log.css` becomes necessary for the batch but was not explicitly
  allowed.
- `git diff --name-only` shows files outside the approved extraction scope.

## Rollback

Before commit:

```bash
git restore -- index.html <new-template-file>
git restore --staged index.html <new-template-file>
```

After commit:

```bash
git revert <commit>
```

Rollback must restore:

- The original static task-log markup in `index.html`.
- The original task-log runtime binding path.
- The original CSS selector matching.
- The original API response expectations.

## Current Recommendation

Do not extract task-log yet.

Recommended next low-risk steps:

1. Add a small API integration test plan document for task-log.
2. Add a future mount-seam design note for feature-owned templates.
3. Only then consider a tiny prototype that injects identical task-log markup in
   a separate branch or clearly isolated commit.

