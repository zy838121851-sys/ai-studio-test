# Encoding Audit

Date: 2026-06-30

This report records a read-only scan for mojibake, unreadable Chinese text,
replacement characters, and suspicious copy damage. It is documentation only and
does not change runtime behavior, UI, or business logic.

## Scope Scanned

Scanned file types:

- `.html`
- `.js`
- `.css`
- `.md`

Scanned source/worktree areas included root files, `src/`, `styles/`, `scripts/`,
and `docs/`.

Excluded generated or runtime-heavy directories:

- `.git/`
- `node_modules/`
- `dist/`
- `data/`
- `uploads/`
- `logs/`
- `tmp/`
- `.codex/`
- `.codex-logs/`
- `.tmp-chrome-profile/`

Scanner notes:

- 417 text files were scanned.
- The scan used UTF-8 decoding and a second-pass heuristic for common
  UTF-8-Chinese-as-GBK mojibake recovery.
- PowerShell output can display valid UTF-8 Chinese as mojibake in this
  environment, so terminal rendering alone was not treated as proof of file
  corruption.

## Findings

### High Confidence: Runtime Copy Mojibake

| File | Location | Evidence | Page impact |
| --- | --- | --- | --- |
| `src/client/features/workspace/chat/workflows/prompt-workflow.js` | around line 2355 | fallback caption string is recoverable from mojibake as `生成图片` | Yes, when assistant image items have no caption, the fallback caption may display as corrupted Chinese. |

Observed pattern:

```text
item.caption || "<mojibake text recoverable as 生成图片>"
```

Recommended next-round fix:

- Replace only that fallback string with the intended readable Chinese text.
- Keep behavior unchanged: same fallback location, same string meaning, no UI or
  interaction changes.
- Verify with `npm run check` and `npm run build`.

### High Confidence: Corrupted Historical Markdown

| File | Location | Evidence | Page impact |
| --- | --- | --- | --- |
| `styles/legacy-split-progress.md` | lines 1, 3-18, 20, 56, 93-94, 103-105, 107-112 | contains replacement characters `U+FFFD` and unreadable text | No direct page impact; this is a historical progress document, not a CSS runtime import. |

Recommended next-round fix:

- Do not repair this together with runtime copy.
- Either recover from git history if a clean version exists, or replace with a
  short archival note that the old migration-progress text was corrupted.
- Because it is documentation, this can be handled in a document-only cleanup
  batch.

## Files Checked That Look UTF-8 Valid

The following files can appear garbled when printed through PowerShell in this
environment, but direct UTF-8 inspection showed readable Chinese:

- `index.html`
- `docs/architecture/saas-governance-prd.md`

Do not treat PowerShell display output alone as evidence that these files need
rewriting.

## Low-Confidence / Normal Symbols

The scan found some symbols that look unusual in plain text but are expected in
this project and should not be changed without separate UI evidence:

- `?` used as a help/menu icon, for example in `index.html`.
- `?` inside URL parsing or JavaScript optional chaining, such as `.split("?")`
  and `?.`.
- HTML entities such as `&#9889;` for the generate/send icon.
- Close symbols such as `&times;`.
- Bullet/progress glyphs such as `●` and `○`.
- Arrow-like or keyboard-label text such as `Ctrl`, `Alt`, and menu indicators.
- Model and size labels such as `3D`, `2K`, and `4K`.
- SVG path data and icon-only button content.

These may be visually intentional. Changing them in a broad encoding pass would
risk UI or interaction drift.

## Risk Notes

- This was a static source scan, not a browser visual pass.
- The scan can identify high-confidence encoding damage, but it cannot prove all
  user-facing copy is correct.
- Some generated build output under `dist/` was excluded because it should be
  regenerated from source.
- Some mojibake can be context-specific; every fix should be small and backed by
  the original intended text.
- Runtime copy fixes can change what users see, so they should be handled in a
  separate, explicitly approved micro-batch.
- Documentation-only corruption can be repaired separately from runtime UI copy.

## Suggested Next Repair Order

1. Fix `src/client/features/workspace/chat/workflows/prompt-workflow.js` line
   around 2355 by replacing only the corrupted fallback caption with readable
   Chinese.
2. Verify the chat image fallback path if feasible, then run `npm run check` and
   `npm run build`.
3. In a separate document-only pass, repair or archive
   `styles/legacy-split-progress.md`.
4. Add a lightweight encoding check later, preferably script-based and tuned to
   avoid false positives from optional chaining, URL query parsing, icon glyphs,
   and valid Chinese.
