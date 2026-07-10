# Compliance Pages And Data Rights

`WP-3.5.7-compliance-pages` establishes the rewrite-only legal, support, and data-rights surface.

## Routes

- `/legal/terms`, `/legal/privacy`, `/legal/refunds`, `/legal/ai-disclosure`
- `/support/report`, `/support/appeal`
- `/account/data` for export, deletion, and account-closure requests

The rewrite exposes these paths without changing the Legacy entry points. The data-rights table is workspace- and user-scoped, idempotent, auditable through the existing audit seam, and uses an explicit fail-closed lifecycle. Real legal approval, moderation operations, and production data processors remain release blockers.

## Rollback

Revert this package commit and the `0003` migration before applying it to production. No Legacy data or upload is deleted.
