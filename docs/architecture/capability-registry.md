# Rewrite Capability Registry

更新日期：2026-07-11

## Purpose

`GET /api/v1/capabilities` is the public, credential-free source for rewrite external-service readiness. It prevents UI and application services from guessing availability from environment variables or provider names.

The registry covers storage, AI generation, identity delivery, OAuth, captcha, risk control, moderation, notifications, audit, payments, and automatic renewal. Future provider work packages update these entries through the server-core registry rather than adding ad hoc frontend flags.

## Status Contract

- `disabled`: no usable provider is configured.
- `development`: a deterministic local/development provider is active.
- `configured`: external configuration exists, but live verification is not complete.
- `verified`: live verification evidence permits production use.

Only these four values are valid.

## Action Policy

- Development and test may use `development`, `configured`, or `verified` providers.
- Production permits an external action only when its capability is `verified`.
- Production treats `development` and `configured` as unavailable even if credentials are present.
- Disabled providers fail closed with `PROVIDER_NOT_CONFIGURED` when an application service calls `assertActionAllowed`.
- Configured but unverified production providers fail with `PROVIDER_NOT_VERIFIED`.

## Response Surface

The endpoint returns only:

- environment;
- capability ID and category;
- status;
- `actionAllowed`;
- stable availability reason.

It must never return provider endpoints, access keys, secrets, bucket names, merchant identifiers, session configuration, or raw environment variables.

## Current Initialization

- Local storage and the deterministic image provider report `development` outside production.
- OSS and APIMART configuration report `configured` until a later live-verification work package records evidence.
- Identity, safety, notification, audit, and billing capabilities remain `disabled` until their catalogued Stage 3.5 work packages implement provider seams.

## Rollback

Revert the single `WP-3.5.1-capability-registry` commit. No database schema or persisted data is involved.
