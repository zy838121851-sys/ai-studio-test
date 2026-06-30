# Task Log Template Extraction Plan

This document defines the future no-behavior-change extraction plan for the
task-log template. It is documentation only. It does not move DOM, change
runtime logic, change styles, add features, or authorize deleting files.

## Purpose

Task log is a suitable early template extraction candidate because its static
markup is cohesive and its runtime is already centralized in:

```text
src/client/features/workspace/task-log/task-log-runtime.js
```

The first extraction must be smaller than the whole personal-space route. It
should only move task-log content after selector parity and runtime ordering are
proven.

## Current Boundary

Current static structure:

```text
index.html
  #profileView.profile-view.app-view.simple-page-view
    nav.home-nav
      button.brand-mark[data-brand-menu]
    #taskLogPage.simple-page-shell.task-log-page
      task-log filters, table, pagination
      #taskLogModal.task-log-modal[hidden]
```

Boundary rule:

- Keep `#profileView` in `index.html` for the first extraction.
- Keep the shared `nav.home-nav` and `[data-brand-menu]` in `index.html`.
- Extract only the exact `#taskLogPage` and `#taskLogModal` markup.
- Preserve every id, class, data attribute, ARIA attribute, native attribute,
  select option value, label relationship, and button type.

## Non-Goals

Do not combine the future extraction with any of these:

- UI visual changes.
- Interaction changes.
- Copy changes.
- CSS migration or selector cleanup.
- Changes to `styles/task-log.css`.
- Moving or recreating `#profileView`.
- Moving shared navigation or brand menu markup.
- Changes to `/api/ai/jobs` request timing or query shape.
- Changes to workspace routing or `body[data-view="space"]`.
- New dependencies.
- Deleting legacy files.
- Canvas, chat, generation, video, 3D, asset, or project-library changes.

## Frozen Contracts

These contracts must remain true before `bindTaskLogRuntime(runtime)` runs:

```text
#profileView exists
#taskLogPage exists
#taskLogRows exists
#taskLogModal exists
#taskLogDetailBody exists
```

Route and visibility:

```text
body[data-view="space"]
#profileView.active
#taskLogModal[hidden]
```

Runtime binding:

```text
#taskLogPage.dataset.taskLogBound
MutationObserver on document.body data-view
document keydown Escape close behavior
```

Delegated actions:

```text
[data-task-log-copy]
[data-task-log-detail]
[data-task-log-output]
[data-task-log-close]
```

CSS contract:

```text
styles.css -> styles/task-log.css
body[data-view="space"] .profile-view
#taskLogPage.task-log-page
.task-log-modal[hidden]
.task-log-status-*
.task-log-output-*
```

## Future Allowed Files

The exact file list must be re-proven in the future extraction batch before any
edit. The likely future scope is:

```text
src/client/features/workspace/task-log/<new template module>
one workspace mount/composition file if needed to mount the template before binding
index.html only for removing the moved task-log content after replacement is mounted
```

This current documentation batch does not edit any of those files.

## Future Implementation Steps

1. Re-read the live `index.html` and
   `src/client/features/workspace/task-log/task-log-runtime.js`.
2. Run the required selector searches from
   `docs/architecture/task-log-selector-parity.md`.
3. Capture the exact current `#taskLogPage` and `#taskLogModal` markup.
4. Create a pure template factory or string module that emits identical markup.
5. Mount the emitted markup inside the existing `#profileView` shell before
   `bindTaskLogRuntime(runtime)` is called.
6. Keep `bindTaskLogRuntime(runtime)` unchanged unless the future batch proves a
   minimal binding-order adjustment is required.
7. Remove the original inline task-log content from `index.html` only after the
   replacement mount path is proven.
8. Do not rename selectors in the same batch.
9. Run static parity checks, `npm run check`, and `npm run build`.
10. Run the manual smoke path in `docs/architecture/task-log-smoke-test.md`.

## Required Static Searches

Run before a future extraction:

```bash
rg -n "taskLog|data-task-log|profileView|data-view=\"space\"|dataset\\.view" index.html src/client styles
rg -n "#taskLogPage|#taskLogModal|#taskLogRows|#taskLogRefresh|#taskLogSearch|#taskLogLimit" index.html src/client styles
rg -n "task-log-|task-log|profile-view|simple-page-view|app-view|active|hidden|loading|disabled" index.html src/client styles
rg -n "bindTaskLogRuntime|collectTaskLogElements|taskLogBound|MutationObserver|/api/ai/jobs" src/client
```

Run after a future extraction:

```bash
git diff --name-only
npm run check
npm run build
rg -n "id=\"taskLogPage\"|id=\"taskLogModal\"|data-task-log-close|id=\"taskLogRows\"" index.html src/client
```

## Verification Gates

A future extraction cannot be committed unless all gates pass:

- `npm run check` passes.
- `npm run build` passes.
- `git diff --name-only` contains only the intended extraction files.
- `styles/task-log.css` is absent from the diff unless explicitly in scope.
- `#taskLogPage`, `#taskLogRows`, `#taskLogModal`, and
  `#taskLogDetailBody` exist before runtime binding.
- `#taskLogPage.dataset.taskLogBound` is set once after binding.
- Entering the space route triggers `/api/ai/jobs`.
- Filters, pagination, detail modal, close actions, and output preview follow
  the smoke checklist.
- Home, canvas, chat, project library, and asset page still route normally.

## Stop Conditions

Stop the future extraction without committing if any condition appears:

- A required selector cannot be accounted for.
- Mounting cannot be guaranteed before `bindTaskLogRuntime(runtime)`.
- `#profileView` must be moved to make the extraction work.
- CSS changes are required.
- UI layout, copy, or interaction would change.
- `npm run check` fails.
- `npm run build` fails.
- `git diff --name-only` shows unrelated files.
- Existing `styles/task-log.css` worktree changes would be touched.
- Runtime smoke reveals duplicate binding, missing API requests, broken modal
  close behavior, or route regressions.

## Rollback

The future extraction must be one clear commit. Roll back with:

```bash
git revert <commit>
```

If stopped before commit:

```bash
git restore --staged <intended-files>
git restore <intended-files>
```

Do not use broad restore commands when unrelated worktree changes exist.

## Current Recommendation

Do not split the template yet. The next safest code step is still to prepare an
explicit future extraction batch that moves only `#taskLogPage` and
`#taskLogModal`, keeps `#profileView` stable, and verifies selector parity
immediately before and after the move.
