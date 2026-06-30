# Task Log API Test Plan

Date: 2026-06-30

This document defines the future API integration test plan for the task log
surface. It is documentation only. It does not add tests, change runtime code,
change API behavior, change UI, change CSS, change database schema, or add
dependencies.

## Scope

Future tests should cover the authenticated task-log API contract:

- `GET /api/ai/jobs`
- `GET /api/ai/jobs/:jobId`

This plan depends on:

- `docs/architecture/task-log-api-contract.md`
- `docs/architecture/task-log-verification-checklist.md`
- `docs/architecture/task-log-extraction-readiness.md`

Out of scope for this document:

- No server route changes.
- No service changes.
- No client runtime changes.
- No `index.html` changes.
- No CSS changes.
- No database schema changes.
- No provider, queue, billing, or storage implementation changes.
- No handling of the existing `styles/task-log.css` worktree change.

## Test Goals

Future API tests should prove:

- Auth is required before task-log API data is returned.
- List and detail reads are scoped to `req.auth.user.id`.
- Cross-user job ids do not leak data.
- Pagination and filters match the documented service behavior.
- List responses keep the fields consumed by the task-log table.
- Detail responses keep the fields consumed by the detail and output modals.
- Output asset URL fields stay stable for image, video, and model outputs.
- Error responses stay compatible with current frontend error handling.
- The current rate-limit contract is known and does not make tests flaky.

## Test Environment Assumptions

Future tests should run against an isolated test environment:

- Use a temporary SQLite database, not the local development database.
- Use isolated upload/output directories.
- Seed deterministic users, sessions, jobs, and output assets.
- Avoid provider network calls.
- Stub or disable remote provider refresh paths when testing detail reads.
- Do not rely on existing files under `data/` or `uploads/`.
- Do not mutate Railway, production, or developer-local persistent data.

If the current test harness cannot create isolated auth sessions and seeded
jobs, stop and add that harness in a separate explicit task before implementing
these API tests.

## Fixture Plan

Minimum fixtures:

- User A with a valid authenticated session.
- User B with a valid authenticated session.
- At least one unauthenticated request context.
- User A jobs:
  - `image` job with `queued` status.
  - `image` job with `running` status.
  - `image` job with `succeeded` status and image output assets.
  - `image` job with `failed` status and failure fields.
  - `video` job with `succeeded` status and video output assets.
  - `model3d` job with `succeeded` status and model output assets.
- User B job with a known local job id.
- A missing local job id that does not exist for any user.

Seeded jobs should include:

- Local `id`.
- `remoteTaskId` when applicable.
- `vendor`, `modelId`, `providerModel`, and `type`.
- `status`, `progress`, and timestamps across more than one date.
- `promptPreview`.
- `inputAssetIds`, `outputAssetIds`, and `outputCount`.
- `creditsReserved` and `creditsCharged`.
- Failure fields for failed jobs.
- Stored `requestData` and `responseData` for detail reads.

## List Endpoint Cases

Endpoint:

```text
GET /api/ai/jobs
```

Required cases:

| Case | Request | Expected result |
| --- | --- | --- |
| unauthenticated list | `GET /api/ai/jobs?limit=10&offset=0` without session | Auth error according to the current auth middleware contract. |
| basic list | `GET /api/ai/jobs?limit=10&offset=0` as User A | Returns only User A jobs with `jobs`, `total`, `limit`, `offset`, `hasMore`, and `serverTime`. |
| ordering | same as basic list | Jobs are ordered by `createdAt` descending. |
| pagination limit | `limit=1&offset=0` | Returns one job and the normalized pagination fields. |
| pagination offset | `limit=1&offset=1` | Returns the next job without changing `total`. |
| max limit normalization | `limit=999` | Confirms the current service max limit behavior documented in the contract. |
| invalid or low limit normalization | invalid or low `limit` values | Confirms the current service normalization behavior before depending on it. |
| search local id | `q=<local-id-fragment>` | Finds matching User A local job ids only. |
| search remote id | `q=<remote-id-fragment>` | Finds matching User A remote task ids only. |
| type image | `type=image` | Returns image jobs only. |
| type video | `type=video` | Returns video jobs only. |
| type model3d | `type=model3d` | Returns model3d jobs only. |
| invalid type | unsupported `type` | Confirms current ignored-filter behavior. |
| status queued | `status=queued` | Returns queued jobs only. |
| status running | `status=running` | Returns running jobs only. |
| status succeeded | `status=succeeded` | Returns succeeded jobs only. |
| status failed | `status=failed` | Returns failed jobs only. |
| terminal statuses | terminal statuses accepted by the current service | Confirms each accepted terminal status remains filterable. |
| invalid status | unsupported `status` | Confirms current ignored-filter behavior. |
| date lower bound | `dateFrom=YYYY-MM-DD` | Returns jobs created on or after the lower bound. |
| date upper bound | `dateTo=YYYY-MM-DD` | Returns jobs created on or before the upper bound. |
| date range | `dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` | Returns only jobs inside the inclusive created-at range. |
| user isolation | User A list with User B seeded job present | User B job never appears. |

List response schema should include every field currently documented in
`task-log-api-contract.md` under `toPublicJob()`.

## Detail Endpoint Cases

Endpoint:

```text
GET /api/ai/jobs/:jobId
```

Required cases:

| Case | Request | Expected result |
| --- | --- | --- |
| unauthenticated detail | User A job id without session | Auth error according to the current auth middleware contract. |
| own queued job | User A queued job id | Returns User A job detail without leaking provider data beyond documented fields. |
| own running job | User A running job id | Returns current status/progress and documented timestamps. |
| own succeeded image job | User A image succeeded job id | Returns `outputs`, `imageUrls`, optional `imageUrl`, `billing`, and `job`. |
| own succeeded video job | User A video succeeded job id | Returns `outputs`, `videoUrls`, optional `videoUrl`, `billing`, and `job`. |
| own succeeded model3d job | User A model3d succeeded job id | Returns model output assets through `outputs` with stable asset fields. |
| own failed job | User A failed job id | Returns failure/error fields and stored request/response data. |
| missing job | unknown local job id | Returns `404` with `{ message: "Job not found" }` unless the auth layer fails first. |
| cross-user job | User B local job id requested as User A | Returns `404` or an auth error and never returns User B data. |
| local id contract | request uses local `job.id` | Confirms remote provider task id alone is not the detail route key. |

Detail response schema should include:

```text
job
jobId
remoteTaskId
status
progress
createdAt
updatedAt
completedAt
durationMs
outputCount
outputs
imageUrls
videoUrls
imageUrl
videoUrl
error
errorCode
errorMessage
failureCode
failureMessage
requestData
responseData
billing
```

`outputs` items should include:

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

## Provider Refresh Guard

The detail endpoint currently refreshes non-terminal remote AI job state before
returning details when applicable. Future tests must avoid accidental external
provider calls.

Acceptable approaches:

- Seed terminal jobs for detail schema tests.
- Seed non-terminal jobs without a remote task id when testing non-terminal
  display behavior.
- Stub provider refresh explicitly in a later test implementation task.

Stop if a test would require live APIMart, DashScope, Volcengine, Tripo, or any
other external provider network call.

## Frontend Compatibility Checks

These API tests do not replace browser smoke checks. They should support the
current task-log runtime by proving the fields consumed by:

- Table rendering in `#taskLogRows`.
- Detail modal rendering in `#taskLogDetailBody`.
- Output preview rendering from `outputs`, `imageUrls`, and `videoUrls`.
- Frontend error handling that reads `data.message || Request failed: <status>`.

Future browser smoke remains required before moving the task-log template or
changing task-log runtime behavior.

## Future Implementation Shape

Recommended implementation constraints for a later task:

- Prefer existing project dependencies and scripts.
- Do not add a new test framework unless separately approved.
- Keep the test harness isolated from developer and production databases.
- Make the command deterministic and suitable for CI.
- Either integrate the final test command into `npm run check` or document it as
  a required pre-release gate before SaaS release.
- Keep the first implementation focused only on task-log AI job reads.

Do not combine the first API test implementation with:

- Template extraction.
- CSS migration.
- Runtime refactor.
- API behavior changes.
- Database schema changes.
- Provider, queue, billing, or storage changes.

## Acceptance Criteria For Future Tests

The future implemented test suite is acceptable when:

- It runs without external provider network calls.
- It uses an isolated temporary database and upload/output paths.
- It proves unauthenticated requests cannot read task-log data.
- It proves User A cannot read User B jobs through list or detail endpoints.
- It proves list pagination and filters match the documented current behavior.
- It proves list/detail response fields required by the task-log runtime remain
  present.
- It is deterministic enough to run in local checks and CI.
- It has a clear rollback path.

## Stop Conditions

Stop future implementation if:

- Isolated database setup is not available.
- Auth session setup is unclear.
- Tests would mutate local development or production data.
- Tests require external AI provider calls.
- A response shape differs from `task-log-api-contract.md` and no dedicated API
  migration has been planned.
- Implementing tests requires touching task-log UI, CSS, template markup, or
  unrelated server behavior.
- The existing `styles/task-log.css` worktree change would need to be handled.

## Rollback

Before committing a future test implementation:

```bash
git restore -- <test-files>
git restore --staged <test-files>
```

After commit:

```bash
git revert <commit>
```

For this documentation-only plan, rollback is:

```bash
git restore -- docs/architecture/task-log-api-test-plan.md
git restore --staged docs/architecture/task-log-api-test-plan.md
```
