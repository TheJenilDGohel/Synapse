/**
 * @module engine/database
 * Database adapter and schema utilities — the SQLite layer of the Loci engine.
 *
 * Import from here whenever you need direct database access without server context.
 * These exports are protocol-agnostic: no MCP, no CLI, no HTTP involved.
 *
 * Satisfies CORE-01: SQLite database connection and interaction logic isolated in src/engine/.
 *
 * @example
 *   import { NodeSqliteAdapter, ensureSchema, applySqliteTuning } from './database.js';
 *   import { DatabaseSync } from 'node:sqlite';
 *   const db = new DatabaseSync('/path/to/loci.db');
 *   const adapter = new NodeSqliteAdapter(db);
 *   await applySqliteTuning(adapter);
 *   await ensureSchema(adapter);
 */

// Adapter wrapping node:sqlite DatabaseSync — satisfies CORE-01
export { NodeSqliteAdapter } from './adapter.js';

// Core adapter and migration types
export type {
  Adapter,
  RunResult,
  MigrationSpec,
  MigrationContext,
  Scope,
  ScopeInput,
  Link
} from './memory/types/index.js';

// Schema setup (DDL) and migrations — pure SQLite, no protocol coupling
export { ensureSchema, SCHEMA_VERSION } from './memory/schema.js';
export { runMigrations } from './memory/migrations.js';

// SQLite performance tuning (WAL mode, cache size, mmap, busy_timeout)
export { applySqliteTuning } from './sqlite-tuning.js';
export type { SqliteExecHost } from './sqlite-tuning.js';

// Backup and Restore (VACUUM INTO)
export { backupDatabase, restoreDatabase } from './backup.js';
export type { BackupResult, RestoreResult } from './backup.js';
