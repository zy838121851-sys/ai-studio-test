# Backup And Restore Runbook

This runbook covers the current single-instance SQLite and local-volume storage
phase. It does not claim multi-instance database support or replace a future
managed PostgreSQL and object-storage backup policy.

## Current Boundary

- `DB_PATH` is the authoritative SQLite database path.
- `UPLOAD_DIR` is the authoritative uploaded/generated file directory.
- Backups default to `<dirname(DB_PATH)>/backups/<timestamp>` so Railway backups
  stay on the mounted `/data` Volume.
- `BACKUP_DIR` may override the backup base directory, but it must not be inside
  `UPLOAD_DIR`.
- Database backup uses SQLite's online backup API and includes committed WAL
  data. Copying only the live `.sqlite` file is not an accepted backup method.
- Database and uploads are not one distributed transaction. For a strict
  point-in-time release backup, pause writes before running the command.

## Create A Backup

Run with the same `DB_PATH` and `UPLOAD_DIR` used by the service:

```bash
npm run db:backup
```

The backup directory contains:

- `ai-studio.sqlite`;
- `uploads/` when the configured upload directory exists;
- `manifest.json` with the database SHA-256, SQLite integrity result, and
  upload file/byte counts.

Treat a missing database, failed source integrity check, failed backup integrity
check, or incomplete command as a failed backup.

## Verify The Recovery Path

```bash
npm run db:restore-check
```

This command uses disposable temporary paths. It creates WAL-backed data and an
upload, performs the same online backup, restores both, validates the checksum
and file contents, and runs the standard database gate against the restored
copy. It never reads or writes the configured production database.

## Restore Procedure

1. Stop the service or otherwise block all writes.
2. Preserve the current database and upload directory as rollback copies.
3. Verify the selected backup's `manifest.json` and SHA-256.
4. Copy `ai-studio.sqlite` to the configured `DB_PATH`.
5. Copy the backup `uploads/` directory to the configured `UPLOAD_DIR`.
6. Start a single service instance with the normal production environment.
7. Run `npm run db:check` against the restored paths.
8. Verify login, project open, protected media loading, and one read-only health
   request before allowing writes.

Do not merge uploads from unrelated backup timestamps during a database
restore. Keep the pre-restore rollback copies until application checks pass.

## Audit Upload Integrity

Run the read-only inventory against the configured database and upload path:

```bash
npm run db:uploads-audit
```

The report distinguishes:

- `orphan`: a disk file with no persisted database reference;
- `missing`: a local upload reference with no corresponding disk file;
- `unsafe`: a malformed or traversal-like upload reference requiring review.

References are collected conservatively from every server-side persisted
text/JSON column, including snapshots, chat attachments, AI job payloads,
thumbnails, and asset file records. External CDN URLs are excluded. The command
never deletes files. Output defaults to the first 25 entries per category; add
`--all` for the complete inventory. Use
`npm run db:uploads-audit -- --strict` when a deployment gate should fail on any
finding. Never delete an orphan candidate without a fresh backup and manual
reference review, especially while legacy browser-local project data may still
exist.

## Railway Notes

- `DB_PATH=/data/ai-studio.sqlite`
- `UPLOAD_DIR=/data/uploads`
- Default backups are written under `/data/backups`.
- A Volume backup is still in the same failure domain. Export verified backups
  to independent storage according to the release retention policy.
