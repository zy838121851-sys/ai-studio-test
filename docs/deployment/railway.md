# Railway Deployment Guide

This document records the current Railway deployment contract for AI Studio. It
is documentation only and does not change runtime behavior.

## Current Start Command

The project start script is:

```bash
npm start
```

That runs:

```bash
node server.js
```

`server.js` calls `startServer()` from `src/server/index.js`. The server binds
to `PORT` and defaults `HOST` to `0.0.0.0`, which is appropriate for Railway.

## Required Railway Environment Variables

Minimum production/Railway variables:

```bash
NODE_ENV=production
HOST=0.0.0.0
PORT=<provided by Railway or explicitly set>
APP_BASE_URL=https://<your-production-domain>
DB_PATH=/data/ai-studio.sqlite
UPLOAD_DIR=/data/uploads
APIMART_MOCK=false
AUTH_CODE_PROVIDER=aliyun
```

Common AI/auth provider variables, depending on enabled features:

```bash
APIMART_API_KEY=<required when ENABLE_APIMART=true in production>
APIMART_BASE_URL=https://api.apimart.ai/v1
DASHSCOPE_API_KEY=<if using DashScope>
VOLCENGINE_API_KEY=<if using Volcengine>
TRIPO_API_KEY=<if using Tripo>
ALIYUN_ACCESS_KEY_ID=<if using Aliyun email/SMS>
ALIYUN_ACCESS_KEY_SECRET=<if using Aliyun email/SMS>
ALIYUN_SMS_SIGN_NAME=<if using SMS codes>
ALIYUN_SMS_TEMPLATE_CODE=<if using SMS codes>
ALIYUN_DM_ACCOUNT_NAME=<if using email codes>
WECHAT_OAUTH_CLIENT_ID=<if WeChat OAuth is enabled>
WECHAT_OAUTH_CLIENT_SECRET=<if WeChat OAuth is enabled>
WECHAT_OAUTH_REDIRECT_URI=https://<your-production-domain>/api/auth/oauth/wechat/callback
QQ_OAUTH_CLIENT_ID=<if QQ OAuth is enabled>
QQ_OAUTH_CLIENT_SECRET=<if QQ OAuth is enabled>
QQ_OAUTH_REDIRECT_URI=https://<your-production-domain>/api/auth/oauth/qq/callback
```

Relevant limits:

```bash
MAX_UPLOAD_BYTES=26214400
MAX_MODEL_UPLOAD_BYTES=209715200
MAX_PROXY_IMAGE_BYTES=10485760
```

## APP_BASE_URL

`APP_BASE_URL` is required when `NODE_ENV=production`.

Correct format:

```bash
APP_BASE_URL=https://your-domain.example
```

Rules enforced by `src/server/config/runtime.js` and
`scripts/check-railway-env.js`:

- Must be present in production.
- Must be a valid URL.
- Must use `https://`.
- Must not point to `localhost`, `127.0.0.1`, or `0.0.0.0`.

Use the public Railway domain or your custom production domain. Do not include a
trailing path unless the whole app is intentionally hosted under that path.

## SQLite, DB_PATH, and Railway Volume

The current database implementation is SQLite via `better-sqlite3`.

Path resolution order in `src/server/db/sqlite.js`:

1. `DATABASE_URL` when it starts with `sqlite:`
2. `DB_PATH`
3. `SQLITE_DB_PATH`
4. `./data/ai-studio.sqlite`

Railway SQLite deploys must store the database on a mounted Volume. Recommended:

```bash
DB_PATH=/data/ai-studio.sqlite
```

For Railway, `scripts/check-railway-env.js` also expects `DB_PATH` or
`DATABASE_URL` to point to an absolute mounted Volume path. Paths under `/tmp`
are rejected for production because they are ephemeral.

Do not use the repo-local `data/` directory for production persistence unless it
is explicitly backed by the Railway Volume. The `.gitignore` intentionally
excludes SQLite files.

## AI_STUDIO_DB_RESET_ON_BOOT

`AI_STUDIO_DB_RESET_ON_BOOT=true` allows boot-time reset of a legacy SQLite
schema after taking a backup. It is wired through `initializeDatabase()` and
`runSchemaMigrations()`.

Risk:

- It can drop existing user tables during legacy schema reset.
- It is only appropriate for test data, throwaway environments, or a planned
  migration after a confirmed backup.
- It must not be left enabled for normal production operation.

Default:

```bash
AI_STUDIO_DB_RESET_ON_BOOT=false
```

Use only when all of the following are true:

- The database has been backed up.
- The data is disposable or migration impact is accepted.
- The reset is being done intentionally to move a legacy schema to the current
  schema.
- The variable will be set back to `false` immediately after the reset.

Manual reset command for controlled local/test usage:

```bash
npm run db:reset:v2
```

## Upload Directory and Railway Volume

Uploads are currently stored on the local filesystem through
`src/server/services/asset.service.js`.

Current behavior:

- `UPLOAD_DIR` defaults to `./uploads` if unset.
- Uploaded/generated files are written into `UPLOAD_DIR`.
- Public asset URLs are stored as `/uploads/<fileName>`.
- `/uploads` is served through `createProtectedUploadRouter()`, which requires
  authentication and resolves files from the upload directory.

Railway recommendation:

```bash
UPLOAD_DIR=/data/uploads
```

`UPLOAD_DIR` must point to a mounted Railway Volume for persistent uploads. If it
points to the container filesystem, files can disappear after redeploys or
container replacement.

## Local Production Simulation

Use this when checking behavior before Railway deploy.

PowerShell example:

```powershell
npm run build
$env:NODE_ENV="production"
$env:HOST="127.0.0.1"
$env:PORT="3000"
$env:APP_BASE_URL="https://example.test"
$env:DB_PATH="$PWD\data\ai-studio.sqlite"
$env:UPLOAD_DIR="$PWD\uploads"
$env:APIMART_MOCK="false"
npm start
```

Notes:

- `APP_BASE_URL` must still be `https://...` in production mode, even for local
  simulation, because validation rejects non-HTTPS production URLs.
- For a Railway-like path check, use absolute paths for `DB_PATH` and
  `UPLOAD_DIR`.
- Run `npm run check` before deployment; it includes syntax checks, audit,
  OAuth URL checks, DB checks, and Railway env checks when relevant.

## Common Errors and Triage

### `APP_BASE_URL is required in production`

Cause:

- `NODE_ENV=production` is set, but `APP_BASE_URL` is empty.

Fix:

- Set `APP_BASE_URL=https://<public-domain>`.
- Confirm it is not localhost and uses `https://`.
- Re-run `npm run railway:check` or `npm run check`.

### `Legacy SQLite schema detected`

Cause:

- SQLite contains existing user tables but no `schema_migrations` table.
- The migration code refuses to auto-reset legacy data unless explicitly allowed.

Fix:

- Back up the database first.
- For test data, run `npm run db:reset:v2` or temporarily set
  `AI_STUDIO_DB_RESET_ON_BOOT=true`.
- For production data, do not reset blindly; inspect and migrate intentionally.

### CSS MIME type `text/html`

Cause:

- A CSS URL is not served as static CSS and falls through to `index.html`.
- The browser receives HTML for a CSS request.

Checks:

- In production build, `dist/index.html` should reference `/assets/index-*.css`.
- The server serves `dist` before the app navigation fallback when
  `NODE_ENV=production` and `dist/index.html` exists.
- Source CSS paths are served through `/assets/styles` in production and
  `/styles` only in the non-built development path.

Fix:

- Run `npm run build` before production start.
- Confirm the deployed artifact contains `dist/index.html` and
  `dist/assets/index-*.css`.
- Check Network tab: CSS responses must be `text/css`, not `text/html`.

### `no space left on device`

Likely causes:

- Railway Volume is full.
- Uploads or generated assets accumulated under `UPLOAD_DIR`.
- SQLite WAL/SHM files or backups grew unexpectedly.
- Build/cache artifacts consume ephemeral disk.

Checks:

- Inspect Railway Volume usage.
- Check `/data/uploads` size.
- Check `/data/*.sqlite*` and `/data/backups`.
- Review recent generation/upload volume.

Fix:

- Back up data first.
- Remove disposable test uploads/backups only after confirming they are not
  needed.
- Consider moving long-term asset storage to a future object storage provider.

## Pre-Deploy Checklist

- `npm run check` passes.
- `npm run build` passes.
- `NODE_ENV=production`.
- `APP_BASE_URL` is a valid `https://` public URL.
- `APIMART_MOCK=false`.
- `AUTH_CODE_PROVIDER` is not `mock`.
- `APIMART_API_KEY` is set when `ENABLE_APIMART=true`.
- `DB_PATH` or `sqlite:DATABASE_URL` points to a mounted Railway Volume path.
- `UPLOAD_DIR` points to a mounted Railway Volume path.
- `AI_STUDIO_DB_RESET_ON_BOOT=false` unless doing a planned test reset.
- OAuth redirect URLs match the production domain.
- `dist/index.html` and `dist/assets/*` exist in the deploy artifact.

## Post-Deploy Checklist

- `GET /health` returns `ok: true`.
- `GET /api/health` returns `ok: true`.
- Login/register flow reaches the expected provider.
- `/api/auth/me` reflects the current session.
- Project list loads for an authenticated user.
- Project save/delete uses server responses, not optimistic-only success.
- Uploads are written under `UPLOAD_DIR` and can be read back through
  authenticated `/uploads/<fileName>`.
- CSS and JS assets return the correct MIME type.
- Browser Console has no boot-blocking errors.
- Network tab has no CSS `text/html` fallback.
- Railway logs do not show runtime validation errors.

## Rollback Guidance

- Prefer rollback to the previous known-good Railway deployment.
- Keep the same mounted Volume attached during rollback unless data corruption is
  suspected.
- If the rollback involves database schema risk, back up the SQLite database and
  WAL/SHM files before changing versions.
- Do not enable `AI_STUDIO_DB_RESET_ON_BOOT` as a rollback shortcut for
  production data.
- If uploads are missing after rollback, verify `UPLOAD_DIR` points to the same
  mounted Volume path used by the previous deployment.
