# AI Studio Current State

更新日期：2026-07-11

本文档只描述当前仍在运行的 legacy 系统与已经批准但尚未切流的 rewrite 状态。长期目标、阶段和验收以 saas-governance-prd.md 为准，实时进度以 react-nest-migration-state.json 为准。

## 1. Git And Runtime State

- 当前稳定基线 commit：8facba2d。
- legacy 分支来源：codex/saas-governance-baseline。
- rewrite 目标分支：codex/react-nest-rewrite。
- legacy 仍是默认 start、dev、check 和 build 的业务运行基线。
- rewrite 在切流前使用独立 workspace、独立构建目录、独立环境和全新数据库。
- 现有 SQLite 与 uploads 不迁移到 rewrite。

## 2. Legacy Entrypoints

Client:

    app.js
      -> src/main.js
      -> src/client/main.js
      -> src/client/core/app-init.js
      -> mountWorkspaceApp()

Server:

    server.js
      -> src/server/index.js
      -> createServer()
      -> startServer()

Production build:

    vite.config.js
      -> index.html
      -> dist/

The legacy Express server serves built assets from dist in production.

## 3. Legacy Technology

- Frontend: Vite, native JavaScript ESM, static index.html templates.
- Backend: Express 4, native ESM.
- Database: better-sqlite3.
- Storage: local uploads or Railway Volume.
- Queue: process-local job queue.
- Rate limit: process-local memory store.
- Auth delivery: Aliyun SMS and Direct Mail, plus WeChat/QQ OAuth seams.
- AI providers: DashScope/Qwen, Volcengine/Doubao, APIMART, and Tripo.
- 3D: Three.js, lazy loaded on active paths.
- Tests: Node check scripts and Playwright-based targeted checks.

## 4. Current Scale

Latest measured source snapshot:

- src/client: approximately 304 files.
- Direct DOM, innerHTML, dataset, or global-state references: approximately 755 matches across 55 client files.
- Event registration and dispatch references: approximately 320.
- Server modules directly importing db/sqlite.js: 18.
- index.html: approximately 709 lines.
- docs/architecture contains many historical maps and task-log documents.

These numbers explain why production cutover is one event but implementation must remain incremental and evidence-driven.

## 5. Legacy Product Surfaces

Existing surfaces that the rewrite must preserve:

- home page prompt and model selection;
- home attachments and generation handoff;
- recent projects and project library;
- infinite canvas, viewport, zoom and fit;
- selection, multi-selection, drag, resize and alignment;
- shape, arrow, text, pen, laser pen and eraser tools;
- image, video, model and generated nodes;
- image toolbar, crop, expand, upscale, background removal, text and 3D actions;
- prompt chat, reference images, thinking state and result cards;
- image generation, image editing, video generation and 3D preview;
- upload and asset library workflows;
- project save, snapshot restore and thumbnail generation;
- auth, account popover, credits and credit history;
- task log and recovered AI jobs.

The detailed checklist is react-nest-parity-matrix.md.

## 6. Existing SaaS Foundations

Already present in legacy:

- users, sessions and external identities;
- workspaces and memberships;
- projects and versioned project snapshots;
- asset files, assets, collections and project links;
- conversations and messages;
- AI jobs and AI job assets;
- billing accounts, credit transactions and model pricing;
- user/workspace scoping checks;
- protected uploads;
- project snapshot sanitization;
- provider seams for storage, queue, rate limiting, billing and audit;
- production environment gates;
- CSP and transport headers;
- SQLite backup/restore drill;
- upload integrity audit;
- build budget, reachability, lazy-load and static asset checks.

## 7. Legacy Production Limitations

- SQLite and attached Volume prevent safe horizontal API scaling.
- local storage is not shared across instances.
- the process-local queue is not durable across restart.
- in-memory rate limits are not shared.
- session state is database-bound.
- business services directly depend on synchronous SQLite helpers.
- API request and response validation is not centrally described by OpenAPI.
- external orders, payments, subscriptions, refunds and invoices do not exist.
- UI E2E coverage is incomplete.
- audit and observability are not production-grade.
- legal, content safety and AI labeling flows are incomplete.
- the current deployment is suitable for development/test use, not a mature paid SaaS release.

## 8. Rewrite Decision

The user explicitly approved:

- React + TypeScript;
- React Router Framework SPA mode;
- TanStack Query and Zustand;
- a framework-independent canvas engine;
- NestJS + Fastify;
- Drizzle + fresh PostgreSQL;
- BullMQ + Redis;
- private OSS;
- Alibaba Cloud SAE;
- WeChat Pay and Alipay automatic renewal;
- a new database with no legacy data migration;
- one final production cutover;
- old runtime retained as a reference until final cleanup;
- commercial and compliance features included before the first public cutover.

The user also chose to start with a complete functional React home vertical slice and a minimal React canvas receiver.

## 9. Active Rewrite Boundary

Before cutover:

- legacy root start/dev remain unchanged;
- rewrite lives under apps and packages;
- rewrite build output must not use root dist;
- rewrite uses a separate database and Redis;
- legacy code is not imported into React or NestJS;
- temporary API or database dual-write is forbidden;
- old CSS may be consumed for visual parity but must not be changed to hide React drift.

The rewrite now also exposes `/api/v1/capabilities`. It reports external-service readiness without credentials and permits production actions only for `verified` capabilities. Identity, moderation, notification, audit, and billing providers remain disabled until their Stage 3.5 work packages are complete.

## 10. Documentation Routing

Always read:

- current-state.md
- saas-governance-prd.md
- react-nest-target-architecture.md
- react-nest-execution-runbook.md
- react-nest-migration-state.json
- react-nest-work-packages.json

For UI work:

- react-nest-parity-matrix.md
- style-entry-map.md when CSS ownership matters
- index-template-map.md and dom-dependency-map.md when translating a legacy surface
- runtime-event-map.md when preserving event behavior

For task log work, start with task-log-governance-index.md and only open the referenced task-log documents needed for that work package.

Historical documents remain evidence. They are not active roadmap authority.

## 11. Current Release Blocker

Development and staging retain silent overseas model calls by current product decision. A mainland public paid launch remains blocked while personal or sensitive information may be transferred overseas without a resolved policy. This blocker is recorded in the migration state and cannot be bypassed by framework completion.
