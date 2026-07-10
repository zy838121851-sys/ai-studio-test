# Rewrite Identity Provider Seams

更新日期：2026-07-11

## Scope

The rewrite identity boundary now defines replaceable contracts for email verification, SMS verification, WeChat OAuth, QQ OAuth, captcha, and registration risk assessment. No merchant, OAuth, SMS, or email credential is stored in this package.

## Environment Policy

- Development and test use deterministic providers. Email/SMS delivery returns the generated code only through the existing development-only API field; OAuth returns a deterministic development subject; captcha passes; risk allows.
- Production uses unconfigured providers until a later Provider implementation and live verification package is complete.
- Every unconfigured production call throws `PROVIDER_NOT_CONFIGURED` with HTTP 503. It never reports a simulated success.
- Production verification-code issuance now fails through the provider seam before a verification record is persisted.

## Current Integration

`IdentityService.issueVerificationCode` delegates email delivery through `IdentityProviders`. Existing email/password registration, session cookies, and React auth UI remain unchanged.

The capability registry reports email/SMS/OAuth/captcha/risk as `development` outside production and `disabled` in production until real providers are configured and verified.

## Deferred Work

- Official Aliyun email/SMS adapters;
- WeChat and QQ authorization endpoints and callbacks;
- captcha token capture and risk inputs in the existing auth UI;
- persistent delivery/outbox retries in the moderation/notification/audit package;
- provider credentials and Stage 11 live verification evidence.

## Rollback

Revert the single `WP-3.5.2-identity-provider-seams` commit. This package adds no database migration and does not touch legacy auth.
