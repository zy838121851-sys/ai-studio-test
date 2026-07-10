# Commercial Pages

`WP-3.5.6-commercial-pages` adds the rewrite-only account and commercial navigation surface.

## Scope

- `/pricing`
- `/account`
- `/account/billing`
- `/account/credits`
- `/account/security`
- `/account/data`

The pages reuse the rewrite visual baseline, keep the existing home and canvas routes intact, and expose upgrade, account, and credits links from the rewrite account menu. Payment and identity actions remain visibly unavailable until their providers are configured and verified.

## Rollback

Revert this package commit. Legacy routes, styles, and business code are not modified.
