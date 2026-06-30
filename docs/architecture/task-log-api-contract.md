# Task Log API Contract

Date: 2026-06-30

This document records the current API contract used by the task log surface. It
is documentation only. It does not change API behavior, UI, styles, routing, or
database schema.

## Scope

Current task log runtime:

- `src/client/features/workspace/task-log/task-log-runtime.js`

Current server entrypoints:

- `src/server/index.js`
- `src/server/routes/ai.routes.js`
- `src/server/services/ai-job.service.js`

Current endpoints used by task log:

- `GET /api/ai/jobs`
- `GET /api/ai/jobs/:jobId`

Out of scope for this document:

- No runtime code changes.
- No UI or copy changes.
- No CSS changes.
- No database schema changes.
- No queue, billing, or provider implementation changes.
- No handling of the existing `styles/task-log.css` worktree change.

## Server Mounting

`src/server/index.js` mounts `createAIRouter()` under `/api`, so routes declared
as `/ai/jobs` and `/ai/jobs/:jobId` are exposed as:

```text
/api/ai/jobs
/api/ai/jobs/:jobId
```

The task log API is part of the current authenticated API surface. The route
handlers read `req.auth.user.id` and pass that user id into service calls.

## Rate Limit

Both task log endpoints use `jobPollLimiter` from `src/server/routes/ai.routes.js`.

Current limiter contract:

```text
namespace: ai-job-poll
windowMs: 60 seconds
max: 120
message: Too many job status requests
```

SaaS governance note:

- The current rate limiter is acceptable as the present local implementation.
- Future multi-instance SaaS deployment should move this backing store behind a
  replaceable `RateLimitStore` contract before scaling beyond one process.

## `GET /api/ai/jobs`

Purpose:

- Load the paginated task log table.
- Refresh the table when the space/task-log view becomes visible.
- Refresh automatically while the task-log view is visible.
- Apply task-log search, type, status, date, and pagination controls.

Frontend caller:

```text
task-log-runtime.js -> loadJobs()
```

Frontend request:

```js
fetch(`/api/ai/jobs?${query.toString()}`, { credentials: "same-origin" })
```

Query parameters sent by the frontend:

| Parameter | Source DOM | Meaning |
| --- | --- | --- |
| `limit` | `#taskLogLimit` / runtime state | Page size. |
| `offset` | runtime state | Zero-based pagination offset. |
| `q` | `#taskLogSearch` | Search text for local job id or remote task id. |
| `type` | `#taskLogType` | Task type filter. |
| `status` | `#taskLogStatus` | Task status filter. |
| `dateFrom` | `#taskLogDateFrom` | Inclusive created-at lower bound. |
| `dateTo` | `#taskLogDateTo` | Inclusive created-at upper bound. |

Server handler:

```text
router.get("/ai/jobs", jobPollLimiter, ...)
```

Server service call:

```text
listAIJobs(req.auth.user.id, filters)
```

Service behavior:

- Always scopes the query with `user_id = ?`.
- Normalizes `limit` with fallback `10` and max `50`.
- Normalizes `offset` to a non-negative integer.
- Applies `q` to `id` and `remote_task_id` with escaped `LIKE`.
- Accepts `type` values: `image`, `video`, `model3d`.
- Accepts status values from terminal statuses plus `queued` and `running`.
- Converts valid date filters into `created_at >=` and `created_at <=`.
- Orders jobs by `created_at DESC`.

Current response shape:

| Field | Source | Notes |
| --- | --- | --- |
| `jobs` | `listAIJobs()` | Array of public jobs. |
| `total` | `listAIJobs()` | Total count after filters. |
| `limit` | `listAIJobs()` | Normalized limit. |
| `offset` | `listAIJobs()` | Normalized offset. |
| `hasMore` | `listAIJobs()` | Whether more rows exist. |
| `serverTime` | route handler | `Date.now()` added by route. |

List job fields currently returned by `toPublicJob()`:

```text
id
userId
vendor
modelId
providerModel
type
status
progress
promptPreview
inputAssetIds
outputAssetIds
outputCount
errorCode
errorMessage
failureCode
failureMessage
creditsReserved
creditsCharged
createdAt
updatedAt
completedAt
durationMs
provider
remoteTaskId
```

Task-log table fields currently consumed:

```text
job.id
job.remoteTaskId
job.createdAt
job.type
job.modelId
job.providerModel
job.creditsCharged
job.creditsReserved
job.durationMs
job.completedAt
job.status
job.failureMessage
job.errorMessage
job.outputCount
job.outputAssetIds
```

## `GET /api/ai/jobs/:jobId`

Purpose:

- Load the detail modal.
- Load the generated output preview modal.
- Refresh non-terminal remote AI job state before returning details when
  applicable.

Frontend callers:

```text
task-log-runtime.js -> openTaskDetail()
task-log-runtime.js -> openTaskOutput()
```

Frontend request:

```js
fetch(`/api/ai/jobs/${encodeURIComponent(jobId)}`, { credentials: "same-origin" })
```

Path parameter:

| Parameter | Meaning |
| --- | --- |
| `jobId` | Local `ai_jobs.id`, not the remote provider task id. |

Server handler:

```text
router.get("/ai/jobs/:jobId", jobPollLimiter, ...)
```

Server behavior:

1. Calls `refreshAIJob(req.auth.user.id, req.params.jobId)`.
2. Returns `404` with `{ message: "Job not found" }` when the user-scoped job is
   missing.
3. Calls `getAIJobDetails(req.auth.user.id, req.params.jobId) || refreshed`.
4. Loads output assets with `getJobOutputAssets(req.auth.user.id, job)`.
5. Returns a combined detail payload.

Current response shape:

| Field | Meaning |
| --- | --- |
| `job` | `toClientJob(job)` public job summary. |
| `jobId` | Local job id. |
| `remoteTaskId` | Provider task id when present. |
| `status` | Current job status. |
| `progress` | Current progress number. |
| `updatedAt` | Last update timestamp. |
| `createdAt` | Creation timestamp. |
| `completedAt` | Completion timestamp or null. |
| `durationMs` | Duration in milliseconds or null. |
| `outputCount` | Number of resolved output assets. |
| `outputs` | Output assets mapped through `toClientAsset()`. |
| `imageUrls` | URLs from image output assets. |
| `videoUrls` | URLs from video output assets. |
| `imageUrl` | First output URL when first asset is image. |
| `videoUrl` | First output URL when first asset is video. |
| `error` | Failure or error message. |
| `errorCode` | Provider/internal error code. |
| `errorMessage` | Error message. |
| `failureCode` | Failure code, falling back to error code. |
| `failureMessage` | Failure message, falling back to error message. |
| `requestData` | Stored request log data. |
| `responseData` | Stored response log data. |
| `billing` | Credits summary for the job. |

`job` fields returned by `toClientJob()`:

```text
id
modelId
providerModel
vendor
type
status
progress
promptPreview
inputAssetIds
outputAssetIds
outputCount
remoteTaskId
errorCode
errorMessage
failureCode
failureMessage
creditsReserved
creditsCharged
createdAt
updatedAt
completedAt
durationMs
```

`outputs` item fields returned by `toClientAsset()`:

```text
assetId
url
mimeType
type
width
height
duration
modelId
prompt
createdAt
```

Detail modal fields currently consumed:

```text
data.remoteTaskId
data.jobId
data.status
data.durationMs
data.createdAt
data.completedAt
data.failureMessage
data.errorMessage
data.requestData
data.responseData
data.billing.creditsCharged
data.billing.creditsReserved
data.outputs
data.imageUrls
data.videoUrls
job.id
job.remoteTaskId
job.modelId
job.providerModel
job.creditsReserved
```

Output preview fields currently consumed:

```text
data.status
data.outputs
data.imageUrls
data.videoUrls
data.remoteTaskId
data.jobId
job.remoteTaskId
job.id
```

## Frontend Error Handling

All task-log API reads use:

```js
fetch(path, { credentials: "same-origin" })
```

The frontend parses JSON and throws:

```text
data.message || Request failed: <status>
```

Current UI handling:

- List load errors replace `#taskLogRows` with one error row.
- Detail load errors render inside `#taskLogDetailBody`.
- Output load errors render inside `#taskLogDetailBody`.

## Task Log DOM/API Coupling

The API contract is tied to the current DOM runtime:

- `#taskLogRows` regenerates rows after list responses.
- Row actions use `data-task-log-detail`, `data-task-log-copy`, and
  `data-task-log-output`.
- Detail and output actions both depend on local `job.id` so the server can
  enforce `req.auth.user.id` ownership.
- `#taskLogModal` uses native `hidden` state and is populated from the detail
  endpoint.

Do not change the response shape during any first template split. Preserve
field names and local `job.id` action routing until a separate API migration is
planned and verified.

## SaaS Governance Notes

This contract is sufficient for current task-log governance, but the following
items should be handled before larger SaaS release hardening:

- Add API integration coverage for authenticated list and detail reads.
- Add an ownership test proving another user's job id returns `404` or an auth
  error.
- Add a pagination/filter test for `limit`, `offset`, `q`, `type`, `status`,
  `dateFrom`, and `dateTo`.
- Add a response-schema guard before changing task-log rendering or moving the
  template.
- Keep the endpoint stable if a future durable `JobQueue` is introduced behind
  the current AI job service.
- Keep credit fields stable if a future `BillingProvider` is introduced behind
  the current credit ledger.
- Keep output URL fields stable if a future `StorageProvider` replaces local
  upload-backed assets.

## Verification Checklist For Future Changes

Before changing this API or moving the task-log template, verify:

- `npm run check`
- `npm run build`
- Authenticated `GET /api/ai/jobs?limit=10&offset=0` returns `jobs`, `total`,
  `limit`, and `offset`.
- Authenticated `GET /api/ai/jobs/:jobId` for a returned local job id returns
  `job`, `status`, `requestData`, `responseData`, `billing`, and output fields.
- Missing or cross-user job ids do not leak job data.
- Task-log navigation still loads rows when `body[data-view="space"]`.
- Detail modal opens and closes without changing `#taskLogModal` native
  `hidden` behavior.
- Output preview still uses `outputs`, `imageUrls`, or `videoUrls`.

