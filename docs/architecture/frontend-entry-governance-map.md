# Frontend Entry Governance Map

Date: 2026-07-01

This document records the current frontend entry chain and the safest next
entry-governance moves. It is documentation only and does not change runtime
behavior, UI, interaction, routing, server routes, styles, or dependencies.

## Scope

Sources inspected in this pass:

- `app.js`
- `src/main.js`
- `src/client/main.js`
- `src/client/core/app-init.js`
- `src/client/features/workspace/runtime/index.js`
- `src/client/features/workspace/index.js`
- `src/client/features/workspace/workflows/index.js`
- `src/server/index.js`
- Existing architecture docs under `docs/architecture`

Out of scope:

- No code changes
- No template or DOM changes
- No CSS changes
- No server route changes
- No deletion of pure forwarding files
- No changes to canvas, chat, upload, generation, 3D, auth, projects, assets,
  credits, or task-log behavior

## Current Public Boot Path

The current source boot path is:

```text
index.html
-> app.js
-> src/main.js
-> src/client/main.js
-> src/client/core/app-init.js
-> mountWorkspaceApp(document)
```

Current entry files:

```js
// app.js
import "./src/main.js?v=20260628-boot-inline-1";
```

```js
// src/main.js
import "./client/main.js?v=20260627-generator-job-recovery-2";
```

```js
// src/client/main.js
import { initApp } from "./core/app-init.js?v=20260628-boot-inline-1";

initApp().catch((error) => {
  console.error("AI Studio failed to initialize", error);
});
```

`src/client/core/app-init.js` is the real application initializer. It registers
AI providers, mounts the workspace app, initializes model catalog, auth, credits,
canvas, agent systems, asset panel, and exposes `window.AIStudio`.

## Development Static Route Contract

In the non-built development path, `src/server/index.js` currently serves:

```text
/app.js       -> app.js
/styles.css   -> styles.css
/src/main.js  -> src/main.js
/src/client   -> src/client/*
```

This means a future entry shortening from `app.js -> src/main.js` to
`app.js -> src/client/main.js` is mechanically possible without adding a new
server static route, because `/src/client` is already served.

Do not remove `/src/main.js` in the same batch. It is a compatibility route and
docs still reference it.

## Workspace Mount Chain

`app-init.js` imports:

```text
../features/workspace/runtime/index.js
```

The runtime index currently re-exports many workspace runtime helpers. The
specific mount chain is:

```text
src/client/features/workspace/runtime/index.js
-> src/client/features/workspace/workflows/index.js
-> src/client/features/workspace/workflows/workspace-app-mount.js
```

`workspace-app-mount.js` is the concrete mount function that calls the workspace
composition/runtime path and handles the compatibility bridge alias lifecycle.

The repository also has:

```text
src/client/features/workspace/index.js
```

That file is a broad feature barrel for workspace helpers. It is not the current
`app-init.js` import target. Do not switch to it without a separate import-scope
check, because it exports many interaction, chat, home, and asset helpers.

## Compatibility Bridge Status

The compatibility seam is still active:

- `workspace-app-mount.js` reads `window.AIStudioCompatibilityBridge`.
- It also preserves and cleans the `window.AIStudioLegacyBridge` alias.
- `src/client/features/workspace/runtime/compatibility-bridge.js` assigns both
  `window.AIStudioCompatibilityBridge` and `window.AIStudioLegacyBridge`.

This bridge must not be deleted or bypassed during entry cleanup. Reducing pure
forwarding files is safe only when the bridge initialization order remains the
same.

## Pure Forwarding Candidates

### Candidate A: `src/main.js`

Current role:

- Purely imports `./client/main.js`.
- Has no app logic, state, DOM binding, or side effects except importing the
  client entry.

Potential future move:

```js
// app.js
import "./src/client/main.js?v=20260628-boot-inline-1";
```

Why this is the safest first code cleanup:

- It shortens the public boot path by one hop.
- It keeps `app.js` as the browser-facing source entry.
- It keeps `src/client/main.js` as the place that catches `initApp()` failures.
- It does not touch `app-init.js`, workspace runtime, compatibility bridge, DOM,
  CSS, or server routes.

Required companion updates in that future batch:

- Update `docs/architecture/current-state.md` boot path.
- Update any architecture docs that explicitly assert the old boot path.
- Leave `src/main.js` and `/src/main.js` route in place as compatibility until a
  later deletion-proof batch.

Rollback:

```bash
git revert <entry-shortening-commit>
```

### Candidate B: workspace runtime mount re-export

Current role:

```text
app-init.js
-> features/workspace/runtime/index.js
-> features/workspace/workflows/index.js
-> workspace-app-mount.js
```

Potential future move:

- Import `mountWorkspaceApp` from `workspace-app-mount.js` directly, or create a
  narrower runtime mount entry.

Why this is not the first move:

- `runtime/index.js` is also a broad public runtime barrel.
- It exports many helpers used by workspace composition and future migration
  paths.
- A direct import might be safe, but it should be done only after a targeted
  import graph check for `features/workspace/runtime/index.js`.

### Candidate C: `src/client/features/workspace/index.js`

Current role:

- Broad workspace feature barrel.
- Previously listed as a static unreachable candidate in
  `current-state.md`.

Why this is not a deletion candidate yet:

- Static reachability alone is not enough for deletion.
- It may be used by future migration branches, tests, or external docs.
- Deletion requires static reference evidence, runtime verification, and a
  rollback point.

## Do Not Start Here

Do not begin entry governance by changing:

- `index.html` script tags
- DOM ids/classes/data attributes
- `app-init.js` initializer order
- `workspace-app-mount.js` compatibility bridge behavior
- `src/client/legacy-app.js`
- Canvas/chat/generation runtime imports
- Server static route ordering

These areas have broader runtime or deployment coupling.

## Recommended Next Small Code Batch

The next safest code batch is:

1. Change only `app.js` to import `./src/client/main.js?...` directly.
2. Update only the architecture docs that explicitly list the boot path.
3. Do not delete `src/main.js`.
4. Do not change `src/server/index.js`.
5. Run `npm run check`.
6. Run `npm run build`.
7. Confirm `git diff --name-only` contains only the intended files.

Expected behavior change:

- None intended. The same `src/client/main.js` still calls `initApp()` and
  catches initialization failures.

Risk:

- Low, but the documentation update must be kept in the same commit so future
  governance does not rely on stale boot-path maps.

## Stop Conditions

Stop before code changes if:

- Any direct runtime consumer of `/src/main.js` is found outside `app.js` or
  server compatibility route handling.
- `src/client/main.js` gains side effects that require `src/main.js` to run
  first.
- The change would require editing `index.html`, styles, server routes, or
  business feature files in the same batch.
- `npm run check` or `npm run build` fails.
