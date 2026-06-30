# Task Log Governance Index

Date: 2026-06-30

This document is a navigation index for task-log governance work. It does not
authorize template extraction, selector renaming, CSS migration, file deletion,
or behavior changes. Treat it as the first document to read before any future
task-log change.

## Scope

Current task-log governance is bounded to:

- `index.html` task-log/profile-space region.
- `src/client/features/workspace/task-log/task-log-runtime.js`.
- `styles/task-log.css`, which currently has an unrelated uncommitted worktree
  change and must not be touched unless explicitly requested.
- Server AI job list/detail endpoints that feed the task log.

Out of scope for this index:

- Moving DOM out of `index.html`.
- Editing task-log runtime behavior.
- Editing task-log CSS.
- Changing API response shape.
- Renaming ids, classes, or `data-*` attributes.

## Required Reading Order

Use this order before any task-log implementation batch.

| Step | Document | Use |
| --- | --- | --- |
| 1 | `docs/architecture/task-log-governance-index.md` | Choose the right evidence documents and guardrails. |
| 2 | `docs/architecture/task-log-template-contract.md` | Confirm frozen static DOM, runtime, CSS, and generated markup contracts. |
| 3 | `docs/architecture/task-log-runtime-map.md` | Confirm binding, visibility, refresh, event, and API flow. |
| 4 | `docs/architecture/task-log-static-evidence.md` | Review latest static proof for DOM/runtime coupling. Refresh if stale. |
| 5 | `docs/architecture/task-log-selector-evidence.md` | Run selector evidence commands before any split or selector-sensitive edit. |
| 6 | `docs/architecture/task-log-verification-checklist.md` | Use as the gate before considering task-log work complete. |

If a future task involves API behavior, also read:

- `docs/architecture/task-log-api-contract.md`
- `docs/architecture/task-log-api-test-plan.md`

If a future task involves template extraction, also read:

- `docs/architecture/task-log-extraction-readiness.md`
- `docs/architecture/task-log-template-extraction-plan.md`
- `docs/architecture/task-log-template-mount-seam.md`
- `docs/architecture/task-log-selector-parity.md`
- `docs/architecture/task-log-split-assessment.md`

## Document Inventory

| Document | Status | Primary purpose |
| --- | --- | --- |
| `task-log-api-contract.md` | Current contract doc | Describes list/detail API shape, rate limit, frontend error handling, and DOM/API coupling. |
| `task-log-api-test-plan.md` | Future test plan | Lists API cases that should become automated tests before SaaS release confidence. |
| `task-log-copy-audit.md` | Copy audit | Records task-log text/copy findings and what not to fix without new evidence. |
| `task-log-extraction-readiness.md` | Pre-split readiness | Summarizes locked selectors and required evidence before moving markup. |
| `task-log-runtime-map.md` | Runtime map | Describes mount path, binding preconditions, visibility refresh flow, events, and rendering contract. |
| `task-log-selector-evidence.md` | Evidence template | Provides commands and review checklist for selector-sensitive changes. |
| `task-log-selector-parity.md` | Parity checklist | Lists static and generated selectors that must stay equivalent across extraction. |
| `task-log-smoke-test.md` | Manual smoke plan | Covers route, API, filters, pagination, row actions, modal, and style smoke checks. |
| `task-log-split-assessment.md` | Risk assessment | Captures DOM area, references, CSS/state dependencies, coupling, and split risk. |
| `task-log-static-evidence.md` | Static proof | Records static DOM, runtime binding, runtime query, event, and route shell evidence. |
| `task-log-template-contract.md` | Frozen contract | Defines static template, runtime binding, CSS, generated markup, and extraction rules. |
| `task-log-template-extraction-plan.md` | Future plan | Describes non-goals, frozen contracts, future files, searches, and implementation steps. |
| `task-log-template-mount-seam.md` | Future seam | Proposes a first mount seam while preserving current DOM timing and selectors. |
| `task-log-verification-checklist.md` | Completion gate | Lists guardrails, static preflight, DOM/API/browser/style checks. |

## Current Use Matrix

Use this matrix to decide whether a document can be treated as current evidence
or only as a planning aid.

| Document type | Current source | Use as evidence? | Notes |
| --- | --- | --- | --- |
| Static DOM/runtime proof | `task-log-static-evidence.md` | Yes, if unchanged since its refresh date | Refresh when `index.html`, task-log runtime, task-log CSS, or AI job routes/services change. |
| Frozen selector/template contract | `task-log-template-contract.md` | Yes, for guardrails | It defines what must remain stable, but does not authorize a split. |
| Runtime flow map | `task-log-runtime-map.md` | Yes, for flow review | Use with static proof before any runtime comment or code batch. |
| Selector evidence | `task-log-selector-evidence.md` | No, template only | It currently defines commands and review gates. Run and capture fresh output before selector-sensitive work. |
| Selector parity | `task-log-selector-parity.md` | Checklist only | Use after selector evidence is refreshed; do not treat it as proof by itself. |
| Smoke plan | `task-log-smoke-test.md` | Manual verification guide | Required for future template split or behavior-equivalent code movement. |
| Extraction plan / mount seam | `task-log-template-extraction-plan.md`, `task-log-template-mount-seam.md` | Planning only | They are future implementation guides and still require live evidence before edits. |
| API contract/test plan | `task-log-api-contract.md`, `task-log-api-test-plan.md` | Contract and future test plan | Use before backend/API task-log work; not needed for selector-only documentation. |

## Current Guardrails

- Keep `#profileView`, `#taskLogPage`, `#taskLogRows`, `#taskLogModal`, and
  `[data-task-log-*]` stable.
- Keep `body[data-view="space"]` and `.app-view.active` behavior stable.
- Preserve native `hidden` on `#taskLogModal`.
- Preserve `data-task-log-bound` one-time binding behavior.
- Preserve generated row action attributes:
  `data-task-log-detail`, `data-task-log-copy`, and `data-task-log-output`.
- Do not edit or stage `styles/task-log.css` while it has unrelated worktree
  changes, unless the user explicitly makes it the task.
- Do not split the template until selector evidence, static proof, runtime
  verification, and rollback are all documented for that exact batch.

## Freshness Rules

Some existing task-log documents are evidence snapshots. Before using them to
justify a code change, refresh the evidence when any of these are true:

- `index.html` task-log lines changed after the evidence date.
- `task-log-runtime.js` changed after the evidence date.
- `styles/task-log.css` changed after the evidence date.
- API job routes or AI job service mappings changed after the evidence date.
- The batch would move markup, change selectors, change event roots, or touch
  CSS.

For low-risk documentation-only updates, cite existing documents and run
`npm run check` and `npm run build` before commit.

## Recommended Next Atomic Tasks

Use this order unless new evidence changes risk:

1. Documentation-only: convert `task-log-selector-evidence.md` from template
   into a dated selector snapshot for the current worktree.
2. Documentation-only: refresh `task-log-verification-checklist.md` with the
   current gates from the latest static evidence and selector snapshot.
3. Comment-only: add missing structural comments to task-log runtime functions,
   without changing code flow.
4. Verification-only: add or refine task-log smoke instructions without editing
   runtime code.
5. Only after the above: consider a no-behavior mount seam, with exact selector
   parity and browser smoke verification.

Do not start with CSS cleanup or template extraction while `styles/task-log.css`
has unrelated uncommitted changes.

## Stop Conditions

Stop the task-log batch if:

- `npm run check` fails.
- `npm run build` fails.
- `git diff --name-only` shows files outside the planned scope.
- A selector dependency cannot be proven.
- The change requires editing `styles/task-log.css` without explicit approval.
- The change requires moving DOM, changing UI, changing interaction behavior, or
  changing API shape.

## Rollback

For this index only:

```bash
git restore -- docs/architecture/task-log-governance-index.md
git restore --staged docs/architecture/task-log-governance-index.md
```

After commit, revert the commit that added this file.
