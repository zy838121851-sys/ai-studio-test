# Task Log Template Contract

Date: 2026-06-30

This document records the current task-log template contract before any future
template extraction. It is documentation only. It does not authorize moving,
renaming, deleting, or restyling the task-log DOM.

## Scope

Current task-log surface:

- Static template: `index.html`
- Runtime: `src/client/features/workspace/task-log/task-log-runtime.js`
- Style entry: `styles.css` imports `styles/task-log.css`
- Routing dependency: workspace view value `space`

Out of scope for this document:

- No changes to `index.html`
- No changes to `src/client`
- No changes to `src/server`
- No changes to `styles`
- No template split
- No selector rename
- No deletion
- No handling of the existing `styles/task-log.css` worktree change

## Static Template Contract

Current task-log template region in `index.html`:

- `#profileView`
- `#taskLogPage`
- `#taskLogRefresh`
- `#taskLogSearch`
- `#taskLogDateFrom`
- `#taskLogDateTo`
- `#taskLogType`
- `#taskLogStatus`
- `#taskLogRows`
- `#taskLogRange`
- `#taskLogPrev`
- `#taskLogNext`
- `#taskLogLimit`
- `#taskLogModal`
- `#taskLogDetailBody`
- `[data-task-log-close]`

Current default state:

- `#profileView` is a routed `.app-view` and starts inactive.
- `#taskLogModal` uses the native `hidden` attribute.
- Task-log row action buttons are generated later by runtime code, not all
  present in the initial HTML.

Do not rename or remove these ids, classes, attributes, or default states in the
first extraction batch.

## Runtime Binding Contract

`bindTaskLogRuntime()` in
`src/client/features/workspace/task-log/task-log-runtime.js` owns the current
behavior.

Important runtime contracts:

- The runtime binds once by setting `#taskLogPage.dataset.taskLogBound`.
- Visibility is determined from `document.body.dataset.view === "space"` or
  `#profileView.classList.contains("active")`.
- A `MutationObserver` watches `body[data-view]` and refreshes the task log when
  the space view becomes visible.
- Auto-refresh starts only while the task-log view is visible and is cleared
  when hidden.
- `#taskLogRows` delegates row actions through:
  - `[data-task-log-copy]`
  - `[data-task-log-detail]`
  - `[data-task-log-output]`
- `#taskLogModal` delegates close/copy actions through:
  - `[data-task-log-close]`
  - `[data-task-log-copy]`
- Escape closes the modal only when the modal exists and is not hidden.
- `destroy()` clears observers/timers and resets `dataset.taskLogBound`.

## CSS Contract

Current style entry:

```text
styles.css -> styles/task-log.css
```

Task-log CSS depends on:

- `body[data-view="space"] .profile-view`
- `#taskLogPage.task-log-page`
- `.task-log-*` classes used by static HTML and runtime-generated markup
- `.task-log-modal[hidden]`
- `.task-log-refresh.loading`
- `.task-log-action:disabled`

`styles/task-log.css` currently has an unrelated uncommitted worktree change.
Do not include that file in template-governance batches unless a separate task
explicitly targets it.

## Generated Markup Contract

`task-log-runtime.js` dynamically renders rows, details, and output previews.
The generated markup includes selectors that CSS and event delegation rely on:

- `.task-log-type`
- `.task-log-task-id`
- `.task-log-icon-button`
- `.task-log-status`
- `.task-log-status-*`
- `.task-log-action`
- `.task-log-detail-loading`
- `.task-log-detail-error`
- `.task-log-detail-section`
- `.task-log-detail-title`
- `.task-log-detail-grid`
- `.task-log-failure`
- `.task-log-muted`
- `.task-log-output-preview`
- `.task-log-output-item`
- `.task-log-output-image`
- `.task-log-output-video`
- `[data-task-log-copy]`
- `[data-task-log-detail]`
- `[data-task-log-output]`

A template split must preserve the static roots before these generated children
are rendered.

## Future Template Extraction Rules

Before moving task-log markup out of `index.html`, complete all items below:

- Re-run selector searches for `taskLog`, `data-task-log`, `profileView`, and
  `body[data-view="space"]` across `index.html`, `src/client`, and `styles`.
- Preserve the exact ids, classes, data attributes, ARIA attributes, native
  `hidden`, and route value `space`.
- Ensure the replacement DOM is mounted before `bindTaskLogRuntime()` runs.
- Preserve `#taskLogPage.dataset.taskLogBound` one-time binding behavior.
- Preserve `#taskLogRows` and `#taskLogModal` as event delegation roots.
- Preserve CSS selector compatibility for `styles/task-log.css`.
- Keep the first extraction behavior-equivalent: no copy changes, no layout
  changes, no selector renames, no interaction changes.
- Keep rollback to a single commit.

## Verification Checklist

Minimum verification after any future task-log template extraction:

- `npm run check`
- `npm run build`
- `git diff --name-only` shows only intended files.
- Static search confirms all task-log ids and data attributes still exist before
  runtime binding.
- Navigate to the space/task-log view.
- Confirm list loading, filters, refresh, pagination, detail modal open/close,
  Escape close, copy buttons, and output preview still work.
- Confirm `styles/task-log.css` was not overwritten unless the task explicitly
  included CSS work.

## Stop Conditions

Stop before extracting if any of these are true:

- The replacement mount timing is uncertain.
- `#profileView`, `#taskLogPage`, `#taskLogRows`, or `#taskLogModal` would need a
  rename.
- Native `hidden` on `#taskLogModal` cannot be preserved.
- CSS compatibility with `styles/task-log.css` is unclear.
- The change would include unrelated `styles/task-log.css` worktree changes.
- Browser smoke cannot confirm task-log behavior after the move.
