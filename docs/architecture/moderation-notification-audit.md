# Moderation, Notification, And Audit Foundation

`WP-3.5.3-moderation-notification-audit` establishes the durable compliance seams for the rewrite.

## Boundaries

- `ComplianceService` owns durable moderation jobs, notification deliveries, and append-only audit events.
- Moderation and notification providers are replaceable. Development and test use deterministic providers; production remains fail-closed until a real provider is configured and verified.
- PostgreSQL rows are the source of truth. `available_at`, attempt counters, and failure fields support worker recovery without pretending delivery succeeded.
- Workspace IDs are required on moderation, notification, and audit records. Idempotency keys are unique within a workspace.

## Deferred production work

Real content-safety, email, SMS, in-app delivery infrastructure, retention policy, and operational alerting remain deferred external work. They must be live-verified before the release gate; this package only creates the contract and persistence boundary.

## Rollback

Revert the package commit and its migration before applying the migration to a production database. Do not delete existing Legacy data or uploads.
