/**
 * @module engine/database
 * Database adapter and schema utilities — the SQLite layer of the Synapse engine.
 *
 * Import from here whenever you need direct database access without server context.
 * These exports are protocol-agnostic: no MCP, no CLI, no HTTP involved.
 *
 * Satisfies CORE-01: SQLite database connection and interaction logic isolated in src/engine/.
 *
 * @example
 *   import { NodeSqliteAdapter, ensureSchema, applySqliteTuning } from '../engine/database.js';
 *   import { DatabaseSync } from 'node:sqlite';
 *   const db = new DatabaseSync('/path/to/synapse.db');
 *   const adapter = new NodeSqliteAdapter(db);
 *   await applySqliteTuning(adapter);
 *   await ensureSchema(adapter);
 */

// Adapter wrapping node:sqlite DatabaseSync — satisfies CORE-01
export { NodeSqliteAdapter } from '../services/memory/adapter.js';

// Core adapter and migration types
export type {
  Adapter,
  RunResult,
  MigrationSpec,
  MigrationContext,
  Scope,
  ScopeInput,
  Link
} from '../services/memory/types.js';

// Schema setup (DDL) and migrations — pure SQLite, no protocol coupling
export { ensureSchema, runMigrations, SCHEMA_VERSION } from '../services/memory/schema.js';

// SQLite performance tuning (WAL mode, cache size, mmap, busy_timeout)
export { applySqliteTuning } from '../services/memory/sqlite-tuning.js';
export type { SqliteExecHost } from '../services/memory/sqlite-tuning.js';

// Backup and Restore (VACUUM INTO)
export { backupDatabase, restoreDatabase } from '../services/memory/backup.js';
export type { BackupResult, RestoreResult } from '../services/memory/backup.js';
