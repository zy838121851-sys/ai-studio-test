# AI Studio Codex Rules

## Mission

- Rebuild AI Studio into a commercial SaaS-ready modern modular monolith.
- The approved target is React + TypeScript on the frontend and NestJS + Fastify on the backend.
- Production targets Alibaba Cloud SAE, RDS PostgreSQL, Tair Redis, BullMQ workers, private OSS, SLS, and ARMS.
- Preserve the existing product behavior, UI appearance, interaction details, generation workflows, and user expectations while replacing the implementation.
- Treat this file as the standing operating contract for every Codex stage in this repository.

## Required Reading

Before any change, read:

1. docs/architecture/current-state.md
2. docs/architecture/saas-governance-prd.md
3. docs/architecture/react-nest-target-architecture.md
4. docs/architecture/react-nest-execution-runbook.md
5. docs/architecture/react-nest-migration-state.json

For UI or interaction work, also read:

- docs/architecture/react-nest-parity-matrix.md
- only the directly relevant legacy map documents

Do not reread every historical document for every work package.

## Locked Program Decisions

- Frontend: React, TypeScript, React Router Framework SPA mode, TanStack Query, and Zustand.
- Canvas: React components plus an isolated TypeScript canvas engine.
- Backend: NestJS with the Fastify adapter and REST/OpenAPI contracts.
- Database: a fresh PostgreSQL database using Drizzle and node-postgres.
- Queue: BullMQ backed by Tair-compatible Redis.
- Storage: local provider for development and private OSS for production.
- Repository layout: npm workspaces; no Nx or Turborepo.
- Delivery: internal incremental work packages followed by one production cutover.
- Legacy runtime: frozen reference implementation until the final audited deletion stage.
- Existing SQLite and upload data are not migrated into the new production database.
- Domestic commercial launch includes WeChat Pay, Alipay, automatic renewal, credits, invoices, refunds, AI content labeling, and release governance.

## Architecture Boundaries

- apps/web owns the React application and must not import server implementation code.
- apps/api is the HTTP composition root.
- apps/worker is the background worker composition root.
- packages/contracts contains generated public API types, not database entities.
- packages/canvas-engine contains framework-independent editor state, geometry, commands, history, and serialization.
- packages/server-core contains domain modules, repositories, providers, and use cases shared by API and worker.
- Routes/controllers remain thin.
- Business flow belongs in application services.
- Persistence belongs in repositories.
- External systems belong behind providers.
- PostgreSQL and AI job records are durable business truth; Redis jobs are delivery mechanisms.

## Approved Dependencies

The following dependency families are approved when introduced by the matching PRD stage:

- React, React DOM, React Router, TanStack Query, Zustand
- NestJS core, Fastify adapter, configuration, validation, Swagger/OpenAPI
- TypeScript, Vite, ESLint, Prettier, Vitest, Testing Library, Playwright
- Drizzle ORM, Drizzle Kit, pg
- BullMQ, ioredis
- Aliyun SDKs and ali-oss
- official WeChat Pay and Alipay integrations or narrowly scoped HTTP adapters
- OpenAPI type generation

Do not add:

- Next.js, Vue, Angular, Nuxt, or another frontend framework
- Tailwind, Ant Design, Material UI, Chakra, or another visual system
- Prisma or TypeORM
- React Three Fiber
- Nx, Turborepo, or Kubernetes tooling
- a second state-management or API-contract stack without a recorded architecture decision

## Behavior And UI Rules

- Existing surfaces must remain visually and behaviorally equivalent.
- Do not redesign the home page, canvas, chat, upload flow, generators, project library, asset library, task log, auth, credits, or 3D preview.
- New commercial and compliance screens are allowed only in their PRD stages and must use the existing visual language.
- Do not treat React default markup or browser defaults as acceptable visual parity.
- The new app must not use querySelector, innerHTML, dataset, or window globals as application state.
- High-frequency canvas pointer movement must not force a full React render for every event.
- Heavy 3D and video workflows must remain lazy-loaded.

## Autonomous Execution

- The authoritative next task is react-nest-migration-state.json.nextWorkPackage.
- Execute exactly one work package at a time.
- Do not skip ahead because a later task appears easier.
- A work package must have one responsibility, explicit verification, and a simple rollback.
- Update the migration state only after implementation and verification succeed.
- Do not mark a stage complete while any acceptance item is incomplete.
- When Goal mode is active, continue to the next work package without asking for routine confirmation.
- Pause only for a stop condition defined below.

## Legacy Protection

- The current root start and dev commands remain the legacy default until the cutover stage.
- Do not modify legacy behavior merely to make the new implementation easier.
- Critical legacy production fixes must be isolated from migration work.
- Do not move or delete legacy files before the final cleanup stage.
- Legacy deletion requires static reachability evidence, parity evidence, runtime verification, and a rollback commit.

## Worktree And Git

- Start each work package with git status --short --branch.
- Protect unrelated changes and never revert user work.
- Do not use git add .
- Stage only explicit paths for the current work package.
- Use one scoped commit per completed work package.
- Do not push unless the user explicitly asks.
- Keep the branch clean between autonomous work packages.
- Recommended commit prefixes are docs:, build:, test:, refactor:, feat:, fix:, security:, and ops:.

## Verification

Before every commit:

- run the targeted tests for the changed surface;
- run npm run check;
- run npm run build.

During coexistence, the root check and build commands must validate both legacy and rewrite surfaces.

Additional requirements:

- React UI work requires Playwright behavior checks and visual comparison where relevant.
- Canvas work requires pointer, coordinate, zoom, selection, undo/redo, and serialization tests.
- API work requires OpenAPI, validation, error-contract, auth, and tenant-isolation tests.
- Database work requires migration, constraint, transaction, and clean-database bootstrap tests.
- Job work requires retry, duplicate delivery, crash recovery, and exactly-once billing tests.
- Payment work requires signature, webhook replay, reconciliation, cancellation, refund, and entitlement tests.
- Production work requires backup/restore, health, alert, and rollback drills.

## Reporting

After each work package, report:

- modified files;
- behavior, UI, interaction, dependency, and schema impact;
- verification results;
- risk and rollback;
- commit hash and branch-ahead state;
- next work package from the migration state.

## Stop Conditions

Pause and report when:

- existing UI or interaction cannot be reproduced without a product decision;
- a dependency outside the approved list is required;
- an API or persisted contract must change without a documented migration;
- tenant isolation, auth, payment, credits, uploads, or project data may be unsafe;
- production secrets or external merchant credentials are required;
- checks fail for an unclear or out-of-scope reason;
- unrelated worktree changes conflict with the current package;
- a deletion lacks evidence;
- a production cutover is requested while cutoverAllowed is false.

## Release Blocker

The current product decision keeps overseas model calls silent and equivalent to domestic model calls during development and staging. This is not considered resolved for a mainland public paid launch when personal or sensitive information may be transmitted overseas. The migration may continue, but production cutover must remain blocked until the user chooses and approves a compliant policy.
