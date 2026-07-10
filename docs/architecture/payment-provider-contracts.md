# Payment Provider Contracts

`WP-3.5.5-payment-provider-contracts` adds provider boundaries for WeChat Pay, Alipay, and automatic renewal without connecting merchant credentials.

## Safety rules

- Production providers always fail closed with `PROVIDER_NOT_CONFIGURED`; they cannot create a successful payment, refund, mandate, or entitlement.
- Payment creation, query, refund, mandate creation, and webhook verification are separate provider operations.
- Webhook signatures use a provider-owned secret and constant-time comparison in the contract fixture. Event IDs are deduplicated by provider before domain processing.
- The billing tables from `WP-3.5.4` remain the durable source of truth; provider responses are evidence, not entitlement state by themselves.

## Deferred production work

Official merchant SDK/HTTP adapters, certificate rotation, callback endpoint wiring, reconciliation, refund fixtures, and live merchant verification remain deferred until credentials and approvals exist. Development fixtures are deterministic and never mark production capabilities verified.

## Rollback

Revert this package commit. No payment credentials, merchant calls, or database migrations are introduced by this package.
