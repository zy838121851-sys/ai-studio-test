# Canvas Text Tool

`WP-5.3-text-tool` adds the rewrite Canvas text-node contract.

## Rules

- Text nodes persist content, font family, size, weight, color, alignment, and stable geometry.
- `createTextNode` provides the same deterministic initial editing surface for every new node.
- `updateTextNode` changes only approved text formatting fields and rejects non-positive font sizes.
- Text is registered in the snapshot allowlist, so malformed or unknown text nodes cannot be restored as valid content.
- The existing rewrite tool rail already exposes the Text tool; Legacy text UI and behavior remain untouched.

## Rollback

Revert this package commit. No Legacy UI, persisted Legacy snapshot, or production schema is changed.
