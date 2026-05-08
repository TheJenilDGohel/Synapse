import type { Adapter, RunResult } from '../types/engine.js';

interface DatabaseSync {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: unknown[]): { changes?: number; lastInsertRowid?: number | bigint } | undefined;
    get(...params: unknown[]): Record<string, unknown> | undefined;
    all(...params: unknown[]): Record<string, unknown>[];
  };
  close?(): void;
}

export class NodeSqliteAdapter implements Adapter {
  private db: DatabaseSync;
  private _inTransaction = false;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async run(sql: string, params: unknown[] = []): Promise<RunResult> {
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...params);
    return {
      changes: result?.changes ?? 0,
      lastInsertRowid: result?.lastInsertRowid ?? null
    };
  }

  async get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
    const stmt = this.db.prepare(sql);
    return (stmt.get(...params) as T | undefined) || null;
  }

  async all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    return (stmt.all(...params) as T[]) || [];
  }

  async close(): Promise<void> {
    // node:sqlite's DatabaseSync exposes close(); older stubs may not.
    // Release the handle so Windows can unlink the DB file during tests.
    //
    // WAL mode hygiene: before closing, truncate the WAL back into the main
    // DB and flip journal_mode to DELETE. Without this, Windows keeps the
    // `.db-wal` / `.db-shm` auxiliary files locked even after close(), and
    // the test teardown `fs.rmSync` fails with `EBUSY: unlink`. Both PRAGMAs
    // are best-effort — failures (e.g. read-only handles, already-closed
    // databases) are swallowed so close() stays idempotent.
    try { this.db.exec('PRAGMA wal_checkpoint(TRUNCATE);'); } catch { /* ignore */ }
    try { this.db.exec('PRAGMA journal_mode=DELETE;'); } catch { /* ignore */ }
    try { this.db.close?.(); } catch { /* best-effort */ }
  }

  async transaction<T>(fn: (ad: Adapter) => Promise<T>): Promise<T> {
    if (this._inTransaction) {
      // Re-entrant: use SAVEPOINT instead of nested BEGIN
      const sp = `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      this.db.exec(`SAVEPOINT "${sp}"`);
      try {
        const result = await fn(this);
        this.db.exec(`RELEASE "${sp}"`);
        return result;
      } catch (err) {
        try {
          this.db.exec(`ROLLBACK TO "${sp}"`);
        } catch (rollbackErr) {
          // If rollback to savepoint fails, we might still be in a broken state,
          // but we can't safely reset _inTransaction here because the outer
          // transaction might still be valid or might also fail.
        }
        throw err;
      }
    }

    this._inTransaction = true;
    try {
      this.db.exec('BEGIN');
      const result = await fn(this);
      this.db.exec('COMMIT');
      this._inTransaction = false;
      return result;
    } catch (err) {
      try {
        this.db.exec('ROLLBACK');
      } catch (rollbackErr) {
        // Critical failure: ROLLBACK failed. 
        // We must reset _inTransaction anyway to allow future attempts,
        // although the underlying connection might be unstable.
      }
      this._inTransaction = false;
      throw err;
    }
  }
}
