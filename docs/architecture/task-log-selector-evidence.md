# Task Log Selector Evidence

Date: 2026-06-30

This document defines the selector evidence that must be refreshed before any
future task-log template extraction or runtime cleanup. It is documentation
only. It does not change DOM, CSS, JavaScript, API behavior, database schema, or
deployment config.

## Purpose

Task-log is a future template extraction candidate, but its DOM is tied to
workspace routing, CSS visibility, and runtime event delegation. Before moving
or rewriting any task-log markup, the current selector dependencies must be
proved from the live checkout.

This document is an evidence template, not a current-state proof. Search output
must be regenerated in the implementation branch immediately before any future
task-log DOM, CSS, or runtime change.

## Scope

This evidence gate applies before changes to:

- `index.html` task-log markup under `#profileView` / `#taskLogPage`
- `src/client/features/workspace/task-log/task-log-runtime.js`
- `styles/task-log.css`
- task-log template mount or extraction files
- task-log selector names, state classes, and `data-*` action attributes

Out of scope for this document:

- No template split.
- No runtime refactor.
- No CSS migration.
- No selector rename.
- No API behavior change.
- No database schema change.
- No dependency change.
- No handling of the existing `styles/task-log.css` worktree change.

## Required Baseline Before Running Searches

Before collecting evidence, run:

```bash
git status --short --branch
git diff --name-only
```

Expected:

- Only files intentionally in the future task should be modified.
- `styles/task-log.css` may appear as an existing unrelated worktree change.
- Do not stage or commit `styles/task-log.css` unless that future task
  explicitly includes it.

Stop if unexpected files appear.

## Locked Selector Inventory

These selectors must remain stable through the first task-log extraction.

### View And Routing

```text
body[data-view="space"]
#profileView
.profile-view
.app-view
.simple-page-view
.active
```

### Task Log Roots

```text
#taskLogPage
#taskLogRows
#taskLogModal
#taskLogDetailBody
```

### Controls

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

### Delegated Actions

```text
data-task-log-detail
data-task-log-copy
data-task-log-output
data-task-log-close
```

### State Contracts

```text
hidden
dataset.taskLogBound
.loading
disabled
```

## Evidence Commands

Run and review every command below before a future task-log split.

### Broad Task Log References

```bash
rg -n "taskLog|data-task-log|profileView|data-view=\"space\"|dataset\\.view" index.html src/client styles
```

Evidence to capture:

```text
Command:
Result summary:
Relevant files:
Risk notes:
Reviewer:
Date:
```

Pass criteria:

- All references are understood.
- No reference requires renaming selectors.
- No reference requires moving `#profileView`.

### Root And Control IDs

```bash
rg -n "#taskLogPage|#taskLogRows|#taskLogModal|#taskLogDetailBody|#taskLogRefresh|#taskLogSearch|#taskLogDateFrom|#taskLogDateTo|#taskLogType|#taskLogStatus|#taskLogRange|#taskLogPrev|#taskLogNext|#taskLogLimit" index.html src/client styles
```

Evidence to capture:

```text
Command:
Result summary:
IDs with direct JS reads:
IDs with CSS selectors:
IDs only present in template:
Risk notes:
Reviewer:
Date:
```

Pass criteria:

- Every locked id remains present after any proposed move.
- Every JS query still resolves before binding.
- Every CSS selector still matches the same rendered DOM.

### Visibility And State Selectors

```bash
rg -n "body\\[data-view=\"space\"\\]|\\.profile-view|\\.task-log|\\[hidden\\]|\\.hidden|\\.loading|disabled|taskLogBound" index.html src/client styles
```

Evidence to capture:

```text
Command:
Result summary:
Visibility dependencies:
State dependencies:
CSS dependencies:
Risk notes:
Reviewer:
Date:
```

Pass criteria:

- `body[data-view="space"]` remains the task-log route scope.
- `#profileView.active` remains compatible with routing.
- `#taskLogModal` keeps native `hidden`.
- `dataset.taskLogBound` remains the duplicate-binding guard.

### Runtime Binding And Event Delegation

```bash
rg -n "addEventListener\\(|closest\\(|MutationObserver|taskLogBound|openTaskDetail|openTaskOutput|loadJobs|startAutoRefresh|stopAutoRefresh" src/client/features/workspace/task-log index.html
```

Evidence to capture:

```text
Command:
Result summary:
Binding roots:
Delegated actions:
Auto-refresh dependencies:
Modal close dependencies:
Risk notes:
Reviewer:
Date:
```

Pass criteria:

- Binding still happens exactly once.
- Row actions still delegate from `#taskLogRows`.
- Modal close actions still use `[data-task-log-close]`.
- Auto-refresh still depends on the same visibility contract.

### CSS Contract

```bash
rg -n "task-log|profile-view|data-view=\"space\"|taskLog" styles index.html src/client/features/workspace/task-log
```

Evidence to capture:

```text
Command:
Result summary:
CSS files involved:
Ancestor selector dependencies:
Responsive or modal selectors:
Risk notes:
Reviewer:
Date:
```

Pass criteria:

- Existing task-log selectors still match without specificity changes.
- No CSS migration is needed in the same task.
- `styles/task-log.css` is not touched unless explicitly in scope.

### API Coupling Check

```bash
rg -n "/api/ai/jobs|jobId|remoteTaskId|outputs|imageUrls|videoUrls|billing|requestData|responseData" src/client/features/workspace/task-log src/server/routes src/server/services docs/architecture
```

Evidence to capture:

```text
Command:
Result summary:
Frontend fields consumed:
Server fields returned:
Docs that must stay aligned:
Risk notes:
Reviewer:
Date:
```

Pass criteria:

- Task-log rendering still uses local `job.id` for detail/output actions.
- API response shape remains aligned with
  `docs/architecture/task-log-api-contract.md`.
- No API migration is required in the same template task.

## Evidence Review Checklist

Before approving a future task-log template change, confirm:

- `#profileView` remains the workspace-routed shell.
- The proposed move only affects the inner task-log island.
- `#taskLogPage` exists before `bindTaskLogRuntime()` runs.
- `#taskLogRows` remains the delegated row-action root.
- `#taskLogModal` keeps native `hidden`.
- `[data-task-log-close]` still closes the modal.
- No task-log id is renamed.
- No task-log class is renamed.
- No task-log `data-*` attribute is renamed.
- No CSS selector needs a specificity change.
- No task-log API response shape changes.
- No unrelated view, canvas, chat, asset, auth, project, credit, video, image,
  or model3d selector is touched.
- `styles/task-log.css` is not staged unless explicitly allowed.

## Evidence Table Template

Use this table in the future implementation PR or commit notes.

| Evidence item | Command or check | Result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| Worktree preflight | `git status --short --branch` |  |  |  |
| Diff preflight | `git diff --name-only` |  |  |  |
| Broad references | task-log broad `rg` |  |  |  |
| Root/control ids | root/control `rg` |  |  |  |
| Visibility/state | visibility `rg` |  |  |  |
| Runtime binding | binding `rg` |  |  |  |
| CSS contract | CSS `rg` |  |  |  |
| API coupling | API `rg` |  |  |  |
| Browser smoke | task-log smoke path |  |  |  |
| Rollback | restore or revert path |  |  |  |

## Stop Conditions

Stop future work if:

- Any search result is not understood.
- `#profileView` would need to move.
- Any locked id/class/data attribute would need to change.
- `#taskLogPage` cannot be mounted before binding.
- `dataset.taskLogBound` behavior would change.
- Native `hidden` on `#taskLogModal` would change.
- CSS changes are needed to preserve the same appearance.
- API response shape changes are needed.
- Browser smoke cannot be run.
- `git diff --name-only` shows unrelated files.
- The existing `styles/task-log.css` worktree change would need to be handled
  without explicit approval.

## Rollback

Before committing a future task-log selector or template task:

```bash
git restore -- <intended-files>
git restore --staged <intended-files>
```

After commit:

```bash
git revert <commit>
```

For this documentation-only task:

```bash
git restore -- docs/architecture/task-log-selector-evidence.md
git restore --staged docs/architecture/task-log-selector-evidence.md
```

## Current Recommendation

Do not split the task-log template yet.

The next safe step after this evidence template is either:

1. Run a documentation-only selector evidence snapshot in a separate commit.
2. Or start a very small, behavior-equivalent task-log runtime annotation pass
   that does not move DOM and does not change behavior.
