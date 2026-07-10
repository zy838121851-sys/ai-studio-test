# Canvas Performance Gate

`WP-4.7-canvas-performance-gate` records the first measurable rewrite Canvas budget.

## Budget

- The framework-independent selection and transform path must process a 500-node document in under 100ms in the unit benchmark.
- Browser interaction coverage runs through the existing rewrite Playwright suite and verifies pending/result rendering plus pointer-safe adapter behavior.
- Pointermove remains a transient DOM transform; document/Zustand state is committed on pointerup.

This is a regression gate for the rewrite only. It does not change Legacy performance behavior or claim production hardware equivalence.

## Rollback

Revert this package commit and remove the benchmark/gate entry. No user data or UI layout changes are included.
