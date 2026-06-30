# AI Studio Codex Rules

- Read `docs/architecture/current-state.md` before making changes.
- Read `docs/architecture/saas-governance-prd.md` before making changes.
- Do not refactor the entire project.
- Do not directly switch to Next.js, React, or Vue.
- Do not add product features.
- Do not change UI appearance.
- Do not delete files unless there is static reference evidence, runtime verification, and a rollback point.
- Execute only one small stage per task.
- Before every commit, run `npm run check` and `npm run build`.
- After changes, report modified files, risk, rollback method, and recommended next step.
