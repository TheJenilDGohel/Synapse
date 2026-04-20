/**
 * Shared SQLite production tuning helper.
 *
 * Applies the 4 PRAGMAs mandated by Phase 43 (WAL-01 / WAL-02):
 *   1. journal_mode=WAL          — concurrent reads during writes
 *   2. synchronous=NORMAL        — safe + fast (fsync only on checkpoint)
 *   3. cache_size=-64000         — 64 MB page cache (negative = KB)
 *   4. mmap_size=268435456       — 256 MB memory-mapped I/O window
 *
 * Idempotent: re-applying the same values is a silent no-op in SQLite.
 *
 * Accepts any host exposing a duck-typed `exec(sql)` that returns
 * either void (raw DatabaseSync) or Promise<void> (memory Adapter).
 * Both call shapes are normalized via Promise.resolve().
 */

export interface SqliteExecHost {
  exec(sql: string): void | Promise<void>;
}

const TUNING_PRAGMAS: readonly string[] = [
  'PRAGMA journal_mode=WAL;',
  'PRAGMA synchronous=NORMAL;',
  'PRAGMA cache_size=-64000;',
  'PRAGMA mmap_size=268435456;'
];

export async function applySqliteTuning(host: SqliteExecHost): Promise<void> {
  // Call all exec()s synchronously first (safe for both DatabaseSync and async Adapter),
  // then await any returned Promises. This ensures PRAGMAs are applied before the first
  // microtask yield — critical for synchronous callers that close the DB afterwards.
  const results = TUNING_PRAGMAS.map(sql => host.exec(sql));
  await Promise.all(results.map(r => Promise.resolve(r)));
}
