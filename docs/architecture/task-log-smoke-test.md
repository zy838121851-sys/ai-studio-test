# Task Log Smoke Test

This document records the manual smoke test path for future task-log governance
batches. It is documentation only. It does not add test code, change UI, move
DOM, update styles, or modify runtime behavior.

Use this checklist after any future change that touches task-log template
ownership, task-log runtime binding, task-log route wiring, or task-log styles.

## Scope

Primary surface:

```text
index.html -> #profileView -> #taskLogPage / #taskLogModal
src/client/features/workspace/task-log/task-log-runtime.js
GET /api/ai/jobs
GET /api/ai/jobs/:jobId
```

Out of scope for this smoke test:

- Creating new AI jobs.
- Editing project, asset, canvas, chat, image, video, or 3D behavior.
- Modifying database schema or seed data.
- Changing `styles/task-log.css`.
- Proving every generated output type when the local database does not contain
  matching task data.

## Preconditions

Before running the manual smoke test:

1. Run `npm run check`.
2. Run `npm run build`.
3. Confirm `git diff --name-only` contains only the intended files for the
   current batch.
4. Confirm `styles/task-log.css` is not included unless the current batch
   explicitly owns that file.
5. Start the app in the mode being validated.

Development mode example:

```powershell
npm run dev
```

Production-like local smoke example:

```powershell
npm run build
$env:NODE_ENV="production"
$env:HOST="127.0.0.1"
$env:PORT="3000"
$env:APP_BASE_URL="https://example.test"
$env:DB_PATH="$PWD\data\ai-studio.sqlite"
$env:UPLOAD_DIR="$PWD\uploads"
$env:APIMART_MOCK="false"
npm start
```

Use an authenticated session when checking task data. The task-log API is
scoped to the current user through the authenticated server request.

## Static Route Checks

Open the app and navigate to the task-log route.

Expected DOM state:

```text
document.body.dataset.view === "space"
document.querySelector("#profileView")?.classList.contains("active") === true
document.querySelector("#taskLogPage") !== null
document.querySelector("#taskLogRows") !== null
document.querySelector("#taskLogModal") !== null
document.querySelector("#taskLogModal")?.hidden === true
```

Expected runtime binding:

```text
document.querySelector("#taskLogPage")?.dataset.taskLogBound === "true"
```

Failure meaning:

- Missing `#profileView` or missing `.active` means route shell wiring changed.
- Missing task-log IDs means template mounting happened too late or selector
  parity broke.
- Missing `data-task-log-bound` means `bindTaskLogRuntime(runtime)` did not bind
  the page.

## API And Loading Checks

Open the Network panel before entering the route.

Expected first request:

```text
GET /api/ai/jobs?limit=<limit>&offset=<offset>...
```

Expected response:

- `200` for an authenticated user.
- JSON containing a `jobs` array and pagination fields such as `total`,
  `limit`, and `offset`.
- `401` or an auth redirect behavior only when the user is not authenticated.

Expected UI state:

- `#taskLogRefresh` briefly receives `.loading`.
- `#taskLogRefresh` loses `.loading` after the request finishes.
- `#taskLogRows` renders either task rows or the empty-state row.
- `#taskLogRange` updates to match the returned total and visible range.

Failure meaning:

- No `/api/ai/jobs` request means route visibility or binding did not fire.
- Repeated duplicate requests immediately after one route entry can indicate
  duplicate binding or an auto-refresh timer leak.
- A persistent `.loading` class indicates the request path did not settle.

## Filter Checks

Run these against any available task-log dataset. If the local database has no
jobs, still verify that each control triggers a request and the empty state
remains stable.

Search:

1. Type into `#taskLogSearch`.
2. Wait for debounce.
3. Confirm the next `/api/ai/jobs` request includes `q=<typed value>`.

Date range:

1. Set `#taskLogDateFrom`.
2. Set `#taskLogDateTo`.
3. Confirm requests include `dateFrom` and `dateTo`.

Type filter:

1. Set `#taskLogType` to `image`, `video`, and `model3d`.
2. Confirm requests include `type=image`, `type=video`, or `type=model3d`.

Status filter:

1. Set `#taskLogStatus` to `queued`, `running`, `succeeded`, `failed`,
   `timeout`, `save_failed`, and `cancelled` as needed.
2. Confirm requests include the selected `status`.

Page size:

1. Set `#taskLogLimit` to `10`, `20`, and `50`.
2. Confirm the request includes the selected `limit`.
3. Confirm pagination resets to the first page.

Failure meaning:

- A control that changes visually but does not trigger a request has lost its
  event binding.
- A request that lacks the expected query parameter means the runtime no longer
  reads that control.

## Pagination Checks

When enough jobs exist:

1. Confirm `#taskLogPrev` starts disabled on the first page.
2. Click `#taskLogNext`.
3. Confirm the next request increments `offset`.
4. Confirm `#taskLogPrev` becomes enabled.
5. Click `#taskLogPrev`.
6. Confirm the request returns to the previous `offset`.

When not enough jobs exist:

- Confirm `#taskLogNext` is disabled.
- Confirm clicking disabled pagination does not change the table unexpectedly.

Failure meaning:

- Incorrect disabled state means `state.total`, `state.offset`, or `state.limit`
  handling changed.
- Pagination request without matching UI range means `#taskLogRange` update
  broke.

## Row Action Checks

When at least one row exists:

1. Confirm each row shows type, model, credits, task ID, duration, status, and
   action cells.
2. Click the task ID button with `[data-task-log-detail]`.
3. Confirm `GET /api/ai/jobs/:jobId` is requested.
4. Confirm `#taskLogModal.hidden === false`.
5. Confirm `#taskLogDetailBody` renders detail sections.
6. Click a `[data-task-log-copy]` button and confirm no visible error occurs.

When no rows exist:

- Confirm the empty-state row remains inside `#taskLogRows`.
- Do not treat missing row actions as a failure when the API returns no jobs.

Failure meaning:

- Clicking a task ID without a detail request means delegated row handling broke.
- Modal opening without detail content means the detail API or render path broke.

## Output Preview Checks

When a succeeded job with output exists:

1. Click the enabled `[data-task-log-output]` action.
2. Confirm `GET /api/ai/jobs/:jobId` is requested.
3. Confirm `#taskLogModal.hidden === false`.
4. Confirm output preview uses the existing class family:

```text
.task-log-output-preview
.task-log-output-item
.task-log-output-image
.task-log-output-video
.task-log-output-model
```

When a job has no saved output:

- Confirm the action is disabled or the modal shows the no-output state.

Failure meaning:

- Enabled output action on a job without output means `canViewOutput(job)`
  behavior changed.
- Missing preview classes means CSS selector parity may be broken.

## Modal Close Checks

Open a task detail or output modal, then verify:

1. Backdrop click on `[data-task-log-close]` closes the modal.
2. Close button click on `[data-task-log-close]` closes the modal.
3. Escape closes the modal.
4. After close, `#taskLogModal.hidden === true`.

Failure meaning:

- Backdrop or close button failure means modal click delegation changed.
- Escape failure means document-level keydown handling changed.
- `.hidden` toggling instead of native `hidden` is a contract break for current
  CSS.

## Cross-Route Regression Checks

After task-log smoke checks, switch away from the task-log route.

Expected:

- Leaving the route changes `document.body.dataset.view`.
- `#profileView.active` is removed.
- Task-log modal is not visibly stuck over other routes.
- Home route still shows `#homeView.active`.
- Project library route still shows `#projectLibraryView.active`.
- Asset page route still shows `#assetsPageView.active`.
- Canvas route still shows canvas/chat surfaces according to existing behavior.

Failure meaning:

- Task-log remaining visible outside `space` suggests route CSS or active state
  changed.
- Other routes failing after task-log work suggests shared view routing was
  unintentionally affected.

## Console And Network Checks

No new browser Console errors should appear for:

```text
missing task-log selector
cannot read properties of null
failed to fetch /api/ai/jobs
CSS MIME type text/html
module load failure
```

Network expectations:

- Built production CSS should load from `dist/assets/index-*.css`.
- CSS responses must be `text/css`, not `text/html`.
- `/api/ai/jobs` and `/api/ai/jobs/:jobId` should return JSON.

## Pass Criteria

A future task-log governance batch passes smoke when:

- `npm run check` passes.
- `npm run build` passes.
- Static route checks pass.
- Task-log API request fires exactly as expected when entering the route.
- Filters and pagination either update the dataset or preserve the empty state.
- Detail modal opens and closes through all close paths.
- Output preview works when output data exists, or the no-output state is stable
  when no data exists.
- No unrelated route regression is observed.
- `git diff --name-only` contains only the intended files.

## Stop Conditions

Stop the future batch and do not commit if:

- `npm run check` fails.
- `npm run build` fails.
- Task-log route cannot be reached.
- `#profileView`, `#taskLogPage`, `#taskLogRows`, or `#taskLogModal` is missing.
- `/api/ai/jobs` no longer fires when entering `space`.
- Modal close behavior changes.
- Other app routes stop switching normally.
- `styles/task-log.css` appears in the diff without being explicitly in scope.
