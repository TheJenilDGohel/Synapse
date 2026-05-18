/**
 * Point-in-time SQLite backup and restore for the Loci memory database.
 *
 * Backup uses SQLite's `VACUUM INTO` SQL command — works on the open DB,
 * produces a clean compacted copy with no WAL baggage.
 *
 * Restore verifies backup integrity, copies the backup file over the
 * target DB path, and returns restart_required: true.
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import type { Adapter } from '../types/engine.js';

export interface BackupResult {
  path: string;
  size_bytes: number;
  created_at: string;
  integrity: string;
}

export interface RestoreResult {
  restored_from: string;
  db_path: string;
  restart_required: true;
  integrity: string;
}

/** Read first value of a single-column PRAGMA result row. */
function readPragmaValue(db: InstanceType<typeof DatabaseSync>, name: string): string {
  const row = db.prepare(`PRAGMA ${name}`).get() as Record<string, unknown> | undefined;
  if (!row) return 'unknown';
  return String(Object.values(row)[0] ?? 'unknown');
}

/**
 * Create a point-in-time backup of the memory database using VACUUM INTO.
 * Works on the live open DB — no need to close connections.
 */
export async function backupDatabase(adapter: Adapter, destPath: string): Promise<BackupResult> {
  const resolvedDest = path.resolve(destPath);
  fs.mkdirSync(path.dirname(resolvedDest), { recursive: true });

  // VACUUM INTO fails if the destination exists — remove it first (idempotent overwrite).
  if (fs.existsSync(resolvedDest)) {
    fs.unlinkSync(resolvedDest);
  }

  // Use parameterized query to prevent SQL injection in the path literal.
  await adapter.run('VACUUM INTO ?', [resolvedDest]);

  // Verify the backup with a temporary connection.
  const probe = new DatabaseSync(resolvedDest);
  let integrity: string;
  try {
    integrity = readPragmaValue(probe, 'integrity_check');
  } finally {
    probe.close();
  }

  return {
    path: resolvedDest,
    size_bytes: fs.statSync(resolvedDest).size,
    created_at: new Date().toISOString(),
    integrity,
  };
}

/**
 * Restore the memory database from a backup file.
 * Verifies backup integrity before replacing the target.
 * Returns restart_required: true — the running process must restart
 * to use the restored database.
 */
export async function restoreDatabase(sourcePath: string, destDbPath: string): Promise<RestoreResult> {
  const resolvedSrc = path.resolve(sourcePath);

  if (!fs.existsSync(resolvedSrc)) {
    throw new Error(`Backup file not found: ${resolvedSrc}`);
  }

  // Verify source integrity before touching the live DB.
  const probe = new DatabaseSync(resolvedSrc);
  let integrity: string;
  try {
    integrity = readPragmaValue(probe, 'integrity_check');
  } finally {
    probe.close();
  }

  if (integrity !== 'ok') {
    throw new Error(`Backup integrity check failed: ${integrity}`);
  }

  fs.copyFileSync(resolvedSrc, destDbPath);

  return {
    restored_from: resolvedSrc,
    db_path: destDbPath,
    restart_required: true,
    integrity,
  };
}
