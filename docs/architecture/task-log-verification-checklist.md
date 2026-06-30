# Task Log Verification Checklist

Date: 2026-06-30

This checklist defines the verification gate for future task-log governance
work. It is documentation only. It does not change task-log behavior, API
behavior, UI, styles, database schema, dependencies, or deployment config.

## Scope

Use this checklist before and after any future change that touches:

- `index.html` task-log markup under `#profileView` / `#taskLogPage`
- `src/client/features/workspace/task-log/task-log-runtime.js`
- `styles/task-log.css`
- `GET /api/ai/jobs`
- `GET /api/ai/jobs/:jobId`
- task-log template extraction plans
- task-log API response shape, filtering, pagination, or ownership checks

This checklist depends on:

- `docs/architecture/index-template-map.md`
- `docs/architecture/dom-dependency-map.md`
- `docs/architecture/runtime-event-map.md`
- `docs/architecture/style-entry-map.md`
- `docs/architecture/feature-template-split-checklist.md`
- `docs/architecture/task-log-api-contract.md`

## Non-Negotiable Guardrails

Do not proceed if a task requires any of the following:

- Renaming task-log ids, classes, or `data-*` attributes in the same batch as a
  move.
- Moving task-log DOM without proving the same selectors are still present
  before `bindTaskLogRuntime()` runs.
- Changing task-log UI layout, copy, or interaction behavior.
- Changing `styles/task-log.css` as part of a documentation or template-only
  task.
- Touching the existing unrelated `styles/task-log.css` worktree change unless
  the task explicitly allows it.
- Changing server route behavior without updating
  `docs/architecture/task-log-api-contract.md`.
- Changing database schema.
- Deleting files.
- Using `git add .`.

## Static Preflight

Run these checks before any task-log code, markup, or style change:

```bash
git status --short --branch
git diff --name-only
```

Expected baseline at the current governance stage:

- Only the intended task files should be modified by the new work.
- `styles/task-log.css` may appear as an existing unrelated worktree change.
- Do not stage or commit `styles/task-log.css` unless the current task explicitly
  allows it.

Required selector searches before moving task-log markup:

```bash
rg -n "taskLog|data-task-log|profileView|data-view=\"space\"|dataset\\.view" index.html src/client styles
rg -n "#taskLogPage|#taskLogRows|#taskLogModal|#taskLogDetailBody|#taskLogRefresh|#taskLogSearch|#taskLogType|#taskLogStatus" index.html src/client styles
rg -n "body\\[data-view=\"space\"\\]|\\.profile-view|\\.task-log|\\[hidden\\]|\\.hidden|\\.loading" index.html src/client styles
```

Stop if any selector dependency is unclear.

## DOM Contract Checks

Task-log DOM must keep these roots:

```text
#profileView
#taskLogPage
#taskLogRows
#taskLogModal
#taskLogDetailBody
```

Task-log controls must keep these ids:

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

Task-log delegated actions must keep these attributes:

```text
data-task-log-detail
data-task-log-copy
data-task-log-output
data-task-log-close
```

State contract:

- `#profileView` remains a routed `.app-view`.
- Task-log visibility remains tied to `body[data-view="space"]` and
  `#profileView.active`.
- `#taskLogModal` keeps native `hidden` as the modal closed state.
- `#taskLogPage.dataset.taskLogBound` remains the duplicate-binding guard.

## API Contract Checks

Before changing API behavior or response shape, compare against
`docs/architecture/task-log-api-contract.md`.

Minimum authenticated list request:

```text
GET /api/ai/jobs?limit=10&offset=0
```

Expected list response fields:

```text
jobs
total
limit
offset
```

Recommended list filter checks:

```text
GET /api/ai/jobs?limit=1&offset=0
GET /api/ai/jobs?type=image
GET /api/ai/jobs?type=video
GET /api/ai/jobs?type=model3d
GET /api/ai/jobs?status=queued
GET /api/ai/jobs?status=running
GET /api/ai/jobs?status=succeeded
GET /api/ai/jobs?q=<local-or-remote-task-id-fragment>
GET /api/ai/jobs?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
```

Minimum authenticated detail request:

```text
GET /api/ai/jobs/:jobId
```

Expected detail response fields:

```text
job
jobId
remoteTaskId
status
createdAt
updatedAt
completedAt
durationMs
outputCount
outputs
imageUrls
videoUrls
requestData
responseData
billing
```

Ownership checks:

- Detail reads must use local `job.id`, not only remote provider task id.
- Missing job ids must not return another user's job data.
- Cross-user job ids must return `404` or an auth error.
- List reads must stay scoped to `req.auth.user.id`.

## Browser Smoke Checks

Use these after task-log markup, runtime, API, or style work.

Task-log navigation:

- Open the app with a signed-in session.
- Navigate to the profile/space/task-log view.
- Confirm `body[data-view="space"]` is set.
- Confirm `#profileView` is active.
- Confirm rows load or an intentional empty/error state is shown inside
  `#taskLogRows`.

Filters and pagination:

- Change search text in `#taskLogSearch`.
- Change `#taskLogType`.
- Change `#taskLogStatus`.
- Change `#taskLogDateFrom` and `#taskLogDateTo`.
- Change `#taskLogLimit`.
- Click `#taskLogPrev` and `#taskLogNext` when enabled.
- Confirm no console errors and no duplicated requests caused by duplicate
  bindings.

Detail modal:

- Click a row task id button using `data-task-log-detail`.
- Confirm `#taskLogModal.hidden` becomes false.
- Confirm `#taskLogDetailBody` renders request/response data or an error.
- Click `[data-task-log-close]`.
- Press Escape.
- Confirm native `hidden` closes the modal.

Output preview:

- For a succeeded job with outputs, click the `data-task-log-output` action.
- Confirm image, video, or model links render from `outputs`, `imageUrls`, or
  `videoUrls`.
- For a job without output, confirm the action is disabled or renders the
  documented empty state.

## Style Smoke Checks

Run these only when task-log CSS or template structure changes:

- Task-log page remains scoped to the space/profile view.
- Other app views do not become visible because task-log CSS failed.
- Filters, refresh button, table rows, status badges, pagination, and modal
  still fit at desktop width.
- Task-log layout remains usable at narrow/mobile width.
- CSS responses are `text/css`, not `text/html`, in production-like checks.
- Existing unrelated `styles/task-log.css` worktree changes are not overwritten
  or mixed into unrelated commits.

## Build And Repository Gate

Every task-log governance batch must run:

```bash
npm run check
npm run build
git diff --name-only
```

Expected:

- `npm run check` passes.
- `npm run build` passes.
- `git diff --name-only` shows only files allowed for the current task plus any
  explicitly known unrelated worktree change.
- If `styles/task-log.css` appears and the task did not allow it, do not stage
  it.

Stage only the intended files:

```bash
git add <explicit-task-file>
git diff --cached --name-only
```

Do not use:

```bash
git add .
```

## Stop Conditions

Stop the task immediately if:

- `npm run check` fails.
- `npm run build` fails.
- Any forbidden file becomes necessary.
- Any selector dependency cannot be proven.
- The task requires a UI visual change.
- The task requires a core interaction change.
- The task requires a database schema change.
- The task requires deleting files.
- `git diff --name-only` shows unexpected files.
- The task-log API shape would change without a dedicated API migration plan.

## Rollback

Before commit:

```bash
git restore -- <intended-file>
git restore --staged <intended-file>
```

After commit:

```bash
git revert <commit>
```

For deployment rollback, follow `docs/deployment/railway.md` and prefer rolling
back to the previous known-good Railway deployment while keeping the same
mounted database/upload volume unless data corruption is suspected.

## Recommended Next Task After This Checklist

The next safe task-log governance step is documentation or annotation only:

1. Add a task-log extraction readiness note that maps exact `index.html` line
   ranges to future ownership.
2. Or add a tiny test-plan document for future API integration tests.

Do not start a task-log template extraction until the selector searches and
browser smoke path above can be executed cleanly.

