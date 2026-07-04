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
img-src 'self' data: blob: https: http:
media-src 'self' data: blob: https: http:
connect-src 'self' https: http:
```

Development/test CSP may still include `script-src 'unsafe-eval'` for tooling
compatibility. Production CSP must not include `unsafe-eval`.

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
  include `unsafe-eval` and that the browser startup reaches `app-ready`.

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
- `index.html` contains inline style attributes for channel color tokens:
  - `index.html:221-231`
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

- Static inline `style=` attributes in `index.html`.
- Runtime generated `style=` attributes for swatches, snapshot/export markup,
  project cards, and generated canvas/export HTML.

Risk:

- Removing `style-src 'unsafe-inline'` now would likely break visual state,
  color variables, exported SVG/foreignObject markup, or dynamic layout.

Likely mitigation path:

1. Replace low-risk static inline style attributes with classes or data
   attributes.
2. Keep runtime style generation isolated behind helper APIs.
3. Add selector/visual smoke for the edited feature before removing inline style.
4. Remove `unsafe-inline` from `style-src` only after runtime templates no
   longer depend on inline style attributes.

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
2. Normalize persisted same-origin media to relative `/uploads/...`.
3. Add a check that production snapshots do not persist `http://localhost/...`
   or same-origin absolute local URLs.
4. Remove `http:` from `img-src` and `media-src` in production CSP after
   existing restore and upload flows pass.

### 5. `connect-src http:`

Known dependencies:

- Browser app calls same-origin `/api/...`.
- Third-party AI/OAuth calls are server-side.
- `http:` is likely useful for local development but should not be needed in
  production.

Risk:

- Production `connect-src http:` permits insecure browser network calls.

Likely mitigation path:

1. Split production CSP from local development CSP.
2. Keep local development flexible if needed.
3. In production, reduce `connect-src` to `'self' https:`.
4. Verify login, project load/save, upload, generation polling, asset library,
   and health checks.

## Recommended Tightening Order

1. Remove `http:` from `connect-src` in production.
2. Remove `http:` from `img-src` and `media-src` after media URL normalization
   and legacy snapshot restore checks.
3. Replace static inline style attributes in `index.html`.
4. Gradually reduce runtime generated inline style dependencies by feature.
5. Replace or hash/nonce the inline import map.
6. Remove `script-src 'unsafe-inline'`.
7. Remove `style-src 'unsafe-inline'`.

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

The first safe implementation stage has been completed: production CSP removes
`unsafe-eval`, while development/test CSP is unchanged. The next safe
implementation stage is production-only removal of `http:` from `connect-src`
with a matching browser/API check.
