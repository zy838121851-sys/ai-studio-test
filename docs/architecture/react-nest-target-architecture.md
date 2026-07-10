# React/NestJS Target Architecture

更新日期：2026-07-10

## 1. System Shape

AI Studio remains one product and one repository. It is a modular monolith deployed as two process types:

- API serves REST, auth, uploads, project data, billing callbacks and job submission.
- Worker consumes durable jobs and calls AI providers.

Both use the same domain modules and PostgreSQL database. They are not independent microservices.

    Browser
      -> CDN / WAF / SAE gateway
      -> SAE API instances
           -> RDS PostgreSQL
           -> Tair Redis
           -> private OSS
           -> BullMQ
      -> SAE Worker instances
           -> AI providers
           -> RDS PostgreSQL
           -> private OSS

SLS, ARMS and CloudMonitor receive logs, traces, metrics and alerts from both process types.

## 2. Repository Layout

    apps/web
      React Router routes
      React components
      feature hooks
      API adapters
      feature CSS

    apps/api
      Nest bootstrap
      HTTP controllers
      guards
      filters
      interceptors
      OpenAPI composition

    apps/worker
      Nest application context
      BullMQ processors
      worker lifecycle

    packages/canvas-engine
      document model
      geometry
      viewport
      command history
      pointer state
      serialization

    packages/contracts
      generated OpenAPI types
      stable error codes
      API client primitives

    packages/server-core
      domain modules
      repositories
      providers
      use cases
      Drizzle schema and migrations

    packages/test-support
      fixtures
      mock providers
      database helpers
      browser helpers

## 3. Frontend

React Router runs in Framework SPA mode with runtime SSR disabled. Routes own code splitting and navigation. No React Server Components are used.

TanStack Query owns server state:

- current user;
- provider status;
- model catalog;
- projects and project snapshots;
- assets and collections;
- conversations;
- AI jobs;
- credits, orders and subscriptions.

Zustand owns editor state:

- CanvasDocument;
- viewport;
- selection;
- active tool;
- transient generation previews;
- undo/redo stacks.

Local form state stays in components. Server data is not copied into editor state unless it becomes part of a versioned canvas document.

## 4. Canvas Engine

The canvas engine is framework-independent.

Public concepts:

- CanvasDocument
- CanvasNode discriminated union
- Viewport
- Selection
- CanvasCommand
- CommandResult
- HistoryState
- PointerSession
- SnapshotMigration

The engine accepts commands and returns deterministic next state. React subscribes to narrow selectors. Pointer movement updates transient engine state and DOM transforms on animation frames; durable document state is committed at controlled boundaries.

No engine code may:

- read document or window;
- query selectors;
- create HTML;
- call network APIs;
- import React;
- know about NestJS or database entities.

## 5. API

The API prefix is /api/v1.

Controllers:

- validate DTOs;
- resolve auth/workspace context;
- call one application use case;
- return a contract DTO.

Global concerns:

- request ID;
- structured logging;
- stable error filter;
- validation pipe;
- cookie/session guard;
- CSRF guard;
- rate limiting;
- OpenAPI generation;
- sensitive field redaction.

The generated OpenAPI document is checked into build artifacts and used to generate packages/contracts.

## 6. Persistence

Drizzle schema is the codebase source of truth. Drizzle Kit generates versioned SQL migration files. Production applies migrations as a separate release step, never during arbitrary API startup and never with schema push.

Repository invariants:

- all tenant data queries include workspace ID;
- user ID comes from auth context;
- payment and credit changes run in transactions;
- webhook and job idempotency are enforced by unique constraints;
- file URLs are derived, not persisted as expiring signed URLs;
- audit records are append-only.

## 7. Queue And Jobs

PostgreSQL ai_jobs is the durable job state source.

BullMQ delivers work:

- API creates the database job and credit reservation in one transaction;
- outbox publishing enqueues the job;
- Worker leases and processes the job;
- provider calls are retried only under policy;
- completion updates output and charges credits atomically;
- failure releases reserved credits when required;
- duplicate delivery observes terminal/idempotent state and performs no duplicate charge.

## 8. Storage

StorageProvider supports:

- put;
- stat;
- exists;
- delete;
- createReadUrl;
- createUploadUrl;
- normalizeKey.

Local development may use a local provider. Production configuration must reject local storage.

OSS buckets are private. The browser receives authenticated proxy responses or short-lived signed URLs. Database records persist storage keys and immutable metadata.

## 9. Billing

Billing is a separate domain from credit consumption.

Core records:

- plan;
- order;
- payment;
- payment event;
- subscription;
- payment mandate;
- entitlement;
- refund;
- invoice request;
- outbox event.

PaymentProvider isolates WeChat Pay and Alipay differences. Webhook events are stored before processing. Entitlements and credits are granted through idempotent application services.

## 10. Deployment

Production:

- SAE API with at least two instances;
- SAE Worker with provider-aware concurrency;
- RDS PostgreSQL;
- Tair Redis;
- private OSS;
- WAF and CDN;
- KMS/secrets;
- SLS logs;
- ARMS tracing;
- CloudMonitor alerts.

Environments:

- local;
- test;
- staging;
- production.

Each environment has separate database, Redis, object storage namespace and credentials.

## 11. Cutover

The rewrite remains on an independent development/staging address until all parity, commercial, compliance and operational gates pass.

The final switch changes the public domain to the rewrite. It happens before public registration and real payments, because no legacy data migration or dual-write exists.

After cutover, rollback means deploying the previous rewrite artifact and compatible migration state. It does not mean writing new users back to legacy SQLite.
