# AI Studio Codex Rules

## Mission

- Govern AI Studio toward a commercial SaaS-ready modern monolith suitable for public beta and later paid production release.
- Optimize for long-term maintainability, release safety, data reliability, tenant isolation, operational visibility, and rollback discipline.
- Keep the current Express + Vite + native ESM architecture unless the user explicitly approves a later migration stage.
- Treat this file as the standing operating contract for every Codex stage in this repository.

## Required Reading

- Read `docs/architecture/current-state.md` before making changes.
- Read `docs/architecture/saas-governance-prd.md` before making changes.
- Use other `docs/architecture/*` files only when they are directly relevant to the current stage.

## Default Scope

- Make behavior-equivalent governance changes by default.
- Prefer small architecture boundary improvements, workflow extraction, provider/service seams, verification scripts, release gates, and dead-code cleanup with proof.
- Prefer changes that reduce production risk or improve future extension seams without changing the product surface.
- Do not add product features unless the user explicitly asks for that feature.
- Do not change UI appearance.
- Do not change interaction behavior.
- Do not change visible copy unless the task explicitly targets broken or corrupted copy.

## Architecture Rules

- Do not refactor the entire project.
- Do not directly switch to Next.js, React, Vue, or another frontend framework.
- Do not rewrite the app to satisfy a cleanup task.
- Do not move files just to make the tree look cleaner.
- Keep legacy compatibility seams working while gradually thinning them.
- New backend external capabilities must go through provider/service boundaries with a local implementation.
- New heavy frontend capabilities must stay lazy-loaded.
- Routes should stay thin; business flow belongs in services, persistence in repositories, and external capabilities in providers.
- Persisted payload normalization, URL normalization, and tenant/user scoping are production-critical, not cosmetic cleanup.
- Any migration toward a different framework, database, queue, storage, or billing provider must be an explicit later phase with a rollback plan.

## Commercial SaaS Priorities

- Protect auth, session, user/workspace isolation, uploads, project persistence, credits, AI jobs, and auditability.
- Treat persisted data quality as production-critical.
- Prefer backend truth over optimistic UI claims for save/delete/payment-like operations.
- Keep storage, queue, billing, rate limit, and audit seams replaceable for future production providers.
- Do not enable production mock providers or unsafe production defaults.
- Prefer direct API, schema, and check-script evidence for SaaS readiness claims.
- Keep local implementations usable while making future production providers pluggable.
- Treat logs, audit events, backups, restore paths, and rollback instructions as part of the product's commercial readiness.
- Do not weaken auth, CSP, upload protection, rate limits, tenant isolation, credit accounting, or production environment checks to make a stage pass.

## Commercial SaaS Definition Of Done

A stage is not considered SaaS-ready unless it preserves existing behavior and improves at least one of:

- release gate coverage;
- data integrity or recovery;
- auth, tenant isolation, or security posture;
- provider/service/repository boundaries;
- production deployability or observability;
- maintainability of active runtime paths.

Before calling a stage complete, confirm:

- the changed surface is narrow and intentional;
- no product feature, UI appearance, or interaction behavior was changed unless explicitly requested;
- `npm run check` and `npm run build` pass;
- rollback is a simple commit revert or a clearly described manual reversal;
- the next recommended step follows `docs/architecture/saas-governance-prd.md`.

## Worktree And Git

- Start each stage with `git status --short --branch`.
- Protect existing unrelated changes; do not revert user work.
- Do not use `git add .`.
- Stage only explicit paths that belong to the current stage.
- Do not mix unrelated files into a commit.
- Commit each completed small stage unless the user asks not to commit.
- Do not push unless the user explicitly asks to push.
- If the worktree contains unrelated changes, report them and leave them untouched.
- Commit messages should name the governance intent, such as `docs:`, `test:`, `refactor:`, or `fix:`.

## File Deletion Rules

- Do not delete files unless all are true:
  - static reference evidence shows the file is unused or superseded;
  - runtime or check-script verification supports deletion;
  - there is a clear rollback point;
  - deletion is scoped to the current stage.
- Documentation cleanup must be its own stage.
- Legacy code cleanup must be its own stage.

## Verification

- Before every commit, run:
  - `npm run check`
  - `npm run build`
- For frontend workflow edits, also run targeted `node --check` and the matching `scripts/check-*.js` when available.
- For `src/client/legacy-app.js` edits, run `node --check src/client/legacy-app.js` immediately.
- For production-readiness changes, prefer direct API/schema/check-script evidence over visual impressions.
- For server, auth, storage, upload, project, credit, or AI job changes, add or run the most specific existing API/schema/check script available.
- For CSS or DOM-governance changes, prefer selector/static-surface checks first; use visual/browser checks only when they are needed to prove no UI drift.
- If a check fails, fix within the same narrow stage only when the cause is clear and in scope; otherwise pause and report.

## Reporting

After changes, report:

- modified files;
- whether behavior, UI, interaction, dependencies, or data schema changed;
- verification commands and results;
- risk;
- rollback method;
- recommended next step.
- whether the commit was created and whether the branch is ahead of remote.

## Stop Conditions

Pause and report before continuing if:

- a change requires UI or interaction changes;
- a change requires a new dependency;
- a framework migration looks necessary;
- deletion evidence is incomplete;
- checks fail for unclear reasons;
- production data, database migration, auth, billing, or storage safety is at risk;
- unrelated worktree changes conflict with the current stage.
