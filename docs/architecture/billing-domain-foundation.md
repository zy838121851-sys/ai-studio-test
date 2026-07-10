# Billing Domain Foundation

`WP-3.5.4-billing-domain-foundation` defines payment-independent commercial truth for the rewrite.

## Invariants

- All monetary values are integer fen with an uppercase three-letter currency code.
- Orders, payments, refunds, and payment events are append-oriented records with workspace-scoped idempotency where applicable.
- Order, payment, and subscription transitions are explicit state-machine transitions; invalid transitions return a conflict error.
- Plans and prices are catalog data. Provider credentials and provider-specific payment creation are intentionally deferred to `WP-3.5.5`.
- Entitlements are separate from payment records so credits and access can be granted/revoked transactionally after authoritative payment events.

## Deferred production work

The migration is generated but not applied in this environment because local PostgreSQL is blocked by the existing Docker administrator requirement. Real merchant payment, renewal, invoice, reconciliation, and refund verification remain deferred until the payment-provider package and release gate.

## Rollback

Revert this work-package commit and its `0002` Drizzle migration before applying it to any production database. Existing Legacy SQLite data and uploads are untouched.
