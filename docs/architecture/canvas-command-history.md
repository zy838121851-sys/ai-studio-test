# Canvas Command And History

`WP-4.3-command-history` adds reversible framework-independent editor commands.

## Invariants

- Commands apply and undo immutable document snapshots while preserving `projectId`.
- A new command clears the redo branch.
- Undo/redo at an empty boundary is a no-op.
- History is bounded by an explicit maximum entry count; the default is 100.
- Commands are document-only and do not know about React, DOM events, or UI controls.

## Rollback

Revert this package commit. No existing Canvas UI or Legacy behavior is changed.
