# CSP Risk Map

Date: 2026-07-04

This document records the current Content Security Policy risk surface and the
staged tightening path. It is evidence-focused and must not be used to justify
UI or interaction changes.

## Current Production CSP

Source: `src/server/index.js`

```text
default-src 'self'
base-uri 'self'
object-src 'none'
frame-ancestors 'self'
script-src 'self' 'unsafe-inline'
style-src 'self' 'unsafe-inline'
img-src 'self' data: blob: https:
media-src 'self' data: blob: https:
connect-src 'self' https:
```

Development/test CSP may still include `script-src 'unsafe-eval'` for tooling
compatibility and `connect-src http:` for local tooling. Production CSP must not
include `unsafe-eval`, `connect-src http:`, `img-src http:`, or
`media-src http:`.

Existing gate:

- `scripts/check-security-headers.js` verifies baseline headers.
- Default mode passes but reports known risks.
- Strict mode currently fails because the default test policy still allows:
  - `unsafe-inline`
  - `unsafe-eval`
  - `http:` in `img-src`
  - `http:` in `media-src`
  - `http:` in `connect-src`
- `scripts/check-csp-production-policy.js` verifies production CSP does not
  include `unsafe-eval`, `connect-src http:`, `img-src http:`, or
  `media-src http:`, that the browser startup reaches `app-ready`, and that
  same-origin API requests still work.
- `scripts/check-production-media-restore.js` verifies production project
  thumbnail, snapshot image, and video poster media restore through stable
  `/uploads/...` URLs.
- `scripts/check-inline-style-surface.js` records the current inline style
  dependency surface and fails if new files or higher counts are added.
- `scripts/check-inline-style-categories.js` classifies the remaining inline
  style surface and fails if a new unclassified file or category count appears.

Strict evidence command:

```powershell
$env:SECURITY_HEADERS_STRICT='1'
node scripts/check-security-headers.js
Remove-Item Env:SECURITY_HEADERS_STRICT
```

Observed strict output:

```text
Strict security header check failed: CSP allows unsafe-inline; CSP allows unsafe-eval; CSP img-src allows http:; CSP media-src allows http:; CSP connect-src allows http:
```

## Evidence Snapshot

Commands used:

```powershell
Select-String -Path src/server/index.js -Pattern "Content-Security-Policy|script-src|style-src|img-src|media-src|connect-src|unsafe-inline|unsafe-eval|http:" -Context 0,12
rg -n "eval\(|new Function" index.html app.js src/client src/server --glob "*.js" --glob "*.html"
rg -l "innerHTML|insertAdjacentHTML|outerHTML" src/client --glob "*.js" | Measure-Object -Line
rg -n "<script|style=|contenteditable|javascript:" index.html app.js src/client src/server --glob "*.js" --glob "*.html"
```

Findings:

- No runtime `eval()` or `new Function` matches were found in `index.html`,
  `app.js`, `src/client`, or `src/server`.
- `innerHTML` / `insertAdjacentHTML` / `outerHTML` usage exists in 43 client
  JavaScript files.
- `index.html` contains an inline import map and the external module boot script:
  - `index.html:9` inline `<script type="importmap">`
  - `index.html:750` `<script type="module" src="./app.js?...">`
- `index.html` channel color tokens no longer use inline style attributes; they
  are mapped through `home-channel-tone-*` classes.
- Runtime templates still contain inline style attributes and generated HTML:
  - `src/client/features/projects/components/project-library.js`
  - `src/client/features/canvas/workflows/canvas-menu-actions.js`
  - `src/client/features/projects/snapshot.js`
  - `src/client/features/workspace/chat/components/chat-log.js`
  - `src/client/features/canvas/workflows/image-generator-dom-state-utils.js`
  - `src/client/features/canvas/workflows/video-generator-option-utils.js`
  - `src/client/features/canvas/workflows/video-generator-workflow.js`

## Risk Areas

### 1. `script-src 'unsafe-inline'`

Known dependency:

- Inline import map in `index.html`.

Likely mitigation path:

1. Keep current behavior.
2. Move the import map out of inline HTML if supported by the target browser
   baseline, or add a CSP hash/nonce strategy.
3. Add a strict CSP check that proves the boot path still works.
4. Remove `unsafe-inline` from `script-src`.

Do not remove `script-src 'unsafe-inline'` until the import map path has a
verified replacement or hash/nonce coverage.

### 2. `script-src 'unsafe-eval'`

Current source evidence:

- No direct `eval()` or `new Function` usage was found in runtime code.

Risk:

- `unsafe-eval` may be legacy allowance or dev-server allowance rather than a
  production need.

Status:

- Production CSP no longer includes `unsafe-eval`.
- Development/test CSP may still include it.

Remaining mitigation path:

1. Keep `scripts/check-csp-production-policy.js` in `npm run check`.
2. Investigate whether development/test still needs `unsafe-eval`.
3. Remove the non-production allowance only after local dev tooling and browser
   startup checks prove it is unnecessary.

### 3. `style-src 'unsafe-inline'`

Known dependencies:

- Static `index.html` channel token inline styles have been replaced with
  classes, but runtime templates still contain inline style attributes.
- Project history card order metadata now uses `data-history-index` instead of
  inline `--history-index` style attributes.
- Shape toolbar color swatches now map fixed palette values through
  `shape-color-token-*` classes instead of inline `--color` style attributes.
- Chat agent debug panel static styles now use classes in `styles/legacy-chat.css`;
  only dynamic placement values remain in runtime `.style` writes.
- Selection group color swatches now use `selection-swatch-*` classes instead
  of inline `--swatch` style attributes.
- Runtime generated `style=` attributes for snapshot/export markup, project
  cards, and generated canvas/export HTML.
- Runtime `.style` and `cssText` writes are still used for canvas geometry,
  popover placement, export serialization, and dynamic CSS variables.

Risk:

- Removing `style-src 'unsafe-inline'` now would likely break visual state,
  color variables, exported SVG/foreignObject markup, or dynamic layout.

Likely mitigation path:

1. Keep runtime style generation isolated behind helper APIs.
2. Add selector/visual smoke for the edited feature before removing inline style.
3. Continue replacing low-risk runtime template inline styles with classes or
   data attributes.
4. Remove `unsafe-inline` from `style-src` only after runtime templates no
   longer depend on inline style attributes.

Current gate:

- `scripts/check-inline-style-surface.js` allows the existing runtime surface
  but blocks new inline style dependency files, `index.html` reintroductions, or
  count growth.
- `scripts/check-inline-style-categories.js` keeps the remaining surface split
  into these production-risk categories:

| Category | Files | Purpose | Current Counts |
| --- | ---: | --- | --- |
| `agent-runtime` | 7 | Agent workspace positioning and debug/runtime sizing. | `style=2`, `.style=17` |
| `ai-editor-dynamic-runtime` | 1 | Image edit runtime layout writes. | `.style=19` |
| `canvas-dynamic-runtime` | 32 | Canvas geometry, node sizing, drag, crop, drawing, and toolbar state. | `style=1`, `setAttribute=6`, `.style=190` |
| `serialization-export-snapshot` | 3 | Snapshot restore/sanitization and SVG/foreignObject export serialization. | `style=5`, `setAttribute=1`, `.style=28`, `cssText=1` |
| `workspace-floating-ui-runtime` | 9 | Floating menus, chat/taskbar positioning, compact select, and task-log runtime layout. | `.style=44` |

The `serialization-export-snapshot` category is intentionally high risk: do not
move or delete its inline styles without export/snapshot-specific tests and a
rollback point.

### 4. `img-src http:` and `media-src http:`

Known dependencies:

- Generated/uploaded assets should normally resolve to same-origin `/uploads/...`.
- External provider URLs are possible in legacy snapshots or provider responses.
- `data:` and `blob:` are actively used for previews, generated image payloads,
  QR SVG, canvas export, and local file previews.

Risk:

- `http:` allows mixed-content media references in production.

Likely mitigation path:

1. Keep `data:` and `blob:` for now.
2. Normalize persisted same-origin media to relative `/uploads/...`. Current
   project snapshot checks cover localhost, loopback, same-origin HTTPS, and
   same-host HTTP `/uploads/...` URLs.
3. Add broader restore checks for generated assets and any remaining legacy
   external media cases before changing the media CSP.
4. Production CSP now removes `http:` from `img-src` and `media-src`.

### 5. `connect-src http:`

Known dependencies:

- Browser app calls same-origin `/api/...`.
- Third-party AI/OAuth calls are server-side.
- `http:` is likely useful for local development but should not be needed in
  production.

Risk:

- Production `connect-src http:` permits insecure browser network calls.

Status:

- Production CSP no longer includes `connect-src http:`.
- Same-origin API calls are still covered by `'self'` and verified by
  `scripts/check-csp-production-policy.js`.
- Development/test CSP may still include `connect-src http:`.

Remaining mitigation path:

1. Keep production `connect-src` at `'self' https:`.
2. Add broader browser/API smoke for login, project load/save, upload,
   generation polling, and asset library before further CSP tightening.
3. Investigate whether development/test still needs `connect-src http:`.

## Recommended Tightening Order

1. Gradually reduce runtime generated inline style dependencies by feature.
2. Replace or hash/nonce the inline import map.
3. Remove `script-src 'unsafe-inline'`.
4. Remove `style-src 'unsafe-inline'`.

## Gates Before Any CSP Change

Before changing `src/server/index.js` CSP:

- Run `npm run check`.
- Run `npm run build`.
- Run `SECURITY_HEADERS_STRICT=1 node scripts/check-security-headers.js` or the
  PowerShell equivalent after the specific intended tightening.
- Run a production-like browser smoke for:
  - app boot
  - login/session
  - project library
  - project open/save
  - upload
  - generated image preview/result
  - asset library preview
  - 3D model lazy path if the change touches `blob:` or media rules

## Current Decision

The first three safe implementation stages have been completed: production CSP
removes `unsafe-eval`, `connect-src http:`, and media `http:` sources, while
development/test CSP keeps broader allowances. Media URL normalization covers
same-host HTTP `/uploads/...` URLs in project thumbnails and snapshots, and the
production media restore smoke covers thumbnail, snapshot image, and video
poster loading. The next safe implementation stage is to reduce inline style
dependencies before tightening `style-src`.
