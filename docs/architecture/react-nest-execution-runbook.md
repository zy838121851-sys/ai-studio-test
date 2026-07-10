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

Read react-nest-parity-matrix.md for frontend or behavior work.

Only open legacy maps relevant to the active work package.

## Work Package Loop

1. Run git status --short --branch.
2. Confirm the branch is codex/react-nest-rewrite or an explicitly approved successor.
3. Read nextWorkPackage from the migration state.
4. Locate that work package in the work-package catalog and verify its prerequisites.
5. Inspect the live legacy code and new code required for the package.
6. Implement only that package.
7. Add targeted tests and parity evidence.
8. Run targeted checks.
9. Run npm run check.
10. Run npm run build.
11. Update parity matrix entries affected by the package.
12. Update migration state with verification and the next package.
13. Stage explicit paths.
14. Run `npm run governance:scope -- <work-package-id> --cached`.
15. Create one scoped commit with a `Work-Package: <id>` trailer.
16. Confirm the worktree is clean or contains only unrelated user changes.
17. Continue to the catalogued successor when Goal mode remains active.

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

- mark a package complete before check and build pass;
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

## Commit Policy

- Use explicit git add paths.
- Never use git add .
- One commit per completed package.
- Every program commit must include `Work-Package: <id>` in its message body.
- Do not push without explicit user instruction.
- Do not amend unrelated history.
- Include generated files only when they are outputs required by the package.

## Stop Conditions

Stop and report if:

- the worktree contains conflicting user changes;
- a package requires changing an existing UI or interaction without parity evidence;
- a new dependency is outside the allowlist;
- auth, tenant, payment, credits, file access or data integrity is uncertain;
- an external credential or merchant approval is required;
- checks fail for an unclear reason;
- production cutover is requested while cutoverAllowed is false.

## Goal Completion

Do not mark the program complete until Stage 13 is complete and the PRD Program Definition Of Done is satisfied.

If all technical work is complete but the cross-border policy remains unresolved, report the exact blocker and keep the program incomplete.
