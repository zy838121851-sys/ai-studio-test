# React/NestJS Goal Mode Execution Runbook

更新日期：2026-07-11

## Goal Objective

Use the following objective when the user explicitly starts Goal mode:

将 AI Studio 在保持现有功能、UI 和交互等价的前提下，从 legacy Express/Vite/native ESM 系统重建为 React + TypeScript + React Router SPA 与 NestJS + Fastify + PostgreSQL + Redis/BullMQ + OSS 的模块化单体；完成微信支付、支付宝、自动续费、积分、国内合规、生产运维和一次性切流；每次只执行 react-nest-migration-state.json 指定的一个工作包，验证并提交后自动继续，直到所有发布门禁完成。

Do not create the goal automatically. The user must explicitly start Goal mode.

## Required Context

Read in this order:

1. AGENTS.md
2. current-state.md
3. saas-governance-prd.md
4. react-nest-target-architecture.md
5. react-nest-migration-state.json
6. react-nest-work-packages.json

Read react-nest-parity-matrix.md and react-visual-delta-allowlist.json for frontend or behavior work.

Only open legacy maps relevant to the active work package.

## Work Package Loop

1. Run git status --short --branch.
2. Confirm the branch is codex/react-nest-rewrite or an explicitly approved successor.
3. Read nextWorkPackage from the migration state.
4. Locate that work package in the work-package catalog and verify its prerequisites.
5. Inspect the live legacy code and new code required for the package.
6. Implement only that package.
7. Add targeted tests and parity evidence.
8. Update parity matrix entries affected by the package.
9. Prepare the migration-state completion record and next package.
10. Stage explicit paths.
11. Run `npm run governance:verify -- <work-package-id>`.
12. For stage-gate and release-gate packages, confirm the full root check/build and required E2E evidence ran.
13. Create one scoped commit with a `Work-Package: <id>` trailer.
14. Confirm the worktree is clean or contains only unrelated user changes.
15. Continue to the catalogued successor when Goal mode remains active.

## State Rules

react-nest-migration-state.json is authoritative for progress.

- activeStage identifies the current PRD stage.
- activeWorkPackage identifies work currently in progress or null between packages.
- nextWorkPackage must contain exactly one package.
- completedWorkPackages is append-only.
- lastCompletedWorkPackage records the latest completed catalog ID.
- lastVerification records the commands and results for the latest completed package.
- Git commit trailers, not a self-referential JSON hash, identify the package commit.
- blockers records conditions that prevent a later stage.
- cutoverAllowed remains false until all release blockers are cleared.

Never:

- mark a package complete before its catalogued verification tier passes;
- remove a blocker because code was refactored;
- set cutoverAllowed true without Stage 11 evidence;
- rewrite completed history to make progress appear cleaner.

## Package Size

A package has one responsibility and normally changes:

- one feature or one infrastructure boundary;
- its tests;
- migration state;
- parity evidence when relevant.

Large lockfile or generated OpenAPI changes may accompany the package.

Do not combine:

- frontend migration and unrelated backend cleanup;
- payment and canvas;
- CSS cleanup and feature migration;
- legacy deletion and rewrite implementation;
- multiple PRD stages.

Do not split, merge, skip, or widen catalogued packages during execution. Change the catalog only in a dedicated governance package.

## Legacy Comparison

Before rebuilding a surface:

1. identify its HTML/template ownership;
2. identify active CSS entry and cascade;
3. identify events and keyboard behavior;
4. identify API calls and persisted fields;
5. capture desktop/mobile screenshots;
6. capture the happy path and at least one failure path.

React parity is measured against rendered behavior, not similarity of source code.

## Rewrite Visual Policy

The rewrite may receive one concentrated polish pass before Stage 3.5 and narrowly approved corrections in later packages. The machine-readable allowlist is authoritative.

- Use lucide-react as the only rewrite icon library and import icons individually.
- Keep the existing surface hierarchy, content order, routes, controls, breakpoints, and behavior.
- Use the existing light neutral palette, system blue, thin separators, restrained shadows, and light blur only on overlays or top bars.
- Limit animation to transform and opacity, with reduced-motion support.
- Keep pointer-driven canvas tools bound to real pointer sampling and engine state.
- Capture 1440x1000 and 390x844 evidence for approved UI packages.
- Treat any delta outside the package visualDeltaIds as a stop condition.

## Dependency Policy

Dependencies listed in the PRD are pre-approved for their stage. Install the smallest required set and pin through package-lock.json.

Pause for:

- a dependency outside the allowlist;
- a second framework or state library;
- an experimental package required in production;
- a native dependency with unclear SAE support;
- a package that changes the visual system.

## Verification Layers

Layer 1: static

- TypeScript;
- ESLint;
- governance state;
- OpenAPI generation;
- import boundaries;
- legacy reachability and style checks.

Layer 2: unit

- canvas engine;
- domain rules;
- DTO and normalization;
- billing and job state machines.

Layer 3: integration

- PostgreSQL repositories;
- auth and workspace isolation;
- Redis/BullMQ;
- storage providers;
- payment callbacks.

Layer 4: browser

- visual parity;
- keyboard and pointer behavior;
- upload/generation/project flows;
- mobile layout.

Layer 5: production-like

- staging providers;
- failure recovery;
- backup/restore;
- monitoring and rollback.

## Verification Tiers

`npm run governance:verify -- <work-package-id>` is the single verification entry point. It validates staged scope, reads the catalog tier, derives affected workspaces from staged paths, expands local dependents, de-duplicates commands, and stops on the first failure.

- docs: governance, UTF-8/JSON, staged scope, and staged diff checks.
- workspace: typecheck, test, lint, and build for affected workspaces.
- multi-workspace: the affected workspace graph plus package-specific contract, schema, transaction, or worker checks.
- stage-gate: full `npm run check`, full `npm run build`, stage E2E, and acceptance evidence.
- release-gate: full checks plus release, security, failure, and rollback evidence.

Full root check/build is not repeated for every low-risk package. It remains mandatory at every stage boundary, throughout Stages 11-13, before Legacy deletion, and before a user-requested mid-stage push. A failing command cannot be removed, skipped, or reclassified to obtain a pass.

## Commit Policy

- Use explicit git add paths.
- Never use git add .
- One commit per completed package.
- Every program commit must include `Work-Package: <id>` in its message body.
- Run the package verification entry point against the staged diff before commit.
- Do not push without explicit user instruction.
- Do not amend unrelated history.
- Include generated files only when they are outputs required by the package.

## Stop Conditions

Stop and report if:

- the worktree contains conflicting user changes;
- a package requires changing an existing UI or interaction without parity evidence;
- a rewrite UI delta is outside react-visual-delta-allowlist.json or the package visualDeltaIds;
- a new dependency is outside the allowlist;
- auth, tenant, payment, credits, file access or data integrity is uncertain;
- an external credential or merchant approval is required;
- checks fail for an unclear reason;
- production cutover is requested while cutoverAllowed is false.

## Goal Completion

Do not mark the program complete until Stage 13 is complete and the PRD Program Definition Of Done is satisfied.

If all technical work is complete but the cross-border policy remains unresolved, report the exact blocker and keep the program incomplete.
