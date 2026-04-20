import fs from 'node:fs';
import { makeFileSignature } from './helpers.js';

interface SqliteVecServiceLike {
  db: {
    prepare(sql: string): {
      run(...args: unknown[]): void;
      get(...args: unknown[]): Record<string, unknown> | undefined;
      all(...args: unknown[]): Record<string, unknown>[];
    };
    exec(sql: string): void;
    enableLoadExtension?: (enable: boolean) => void;
    loadExtension?: (path: string) => void;
  };
  sqliteVecExtensionPath: string;
  sqliteVecLoaded: boolean;
  sqliteVecLoadAttempted: boolean;
  sqliteVecLoadError: string;
  sqliteVecTableReady: boolean;
  sqliteVecTableError: string;
  embeddingDimensions: number;
  runInTransaction(work: () => void): void;
  ensureDb(): void;
}

export interface SqliteVecExtensionStatus {
  configured: boolean;
  attempted: boolean;
  loaded: boolean | null;
  status: string;
  path: string;
  error?: string;
  vec_table_ready?: boolean;
  vec_table_error?: string;
}

export interface StalenessResult {
  stale: boolean;
  stale_count: number;
  deleted_count: number;
  total_indexed: number;
}

export function getVecTableDefinition(service: SqliteVecServiceLike): string {
  return `vec0(chunk_rowid integer primary key, embedding float[${service.embeddingDimensions}])`;
}

export function normalizeVecPrimaryKey(value: unknown): number {
  const key = Number(value);
  if (!Number.isSafeInteger(key)) {
    throw new TypeError(`Invalid vec primary key: ${value}`);
  }
  return key;
}

function getExistingVecTableSql(service: SqliteVecServiceLike): string {
  const row = service.db.prepare(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'vec_chunks'"
  ).get() as { sql?: string } | undefined;
  return typeof row?.sql === 'string' ? row.sql : '';
}

export function shouldRebuildVecTable(service: SqliteVecServiceLike, existingSql: string = getExistingVecTableSql(service)): boolean {
  if (!existingSql) return false;
  const normalizedSql = existingSql.replace(/\s+/g, ' ').toLowerCase();
  const expectedDimension = `embedding float[${service.embeddingDimensions}]`;
  return !normalizedSql.includes('chunk_rowid integer primary key')
    || !normalizedSql.includes(expectedDimension);
}

export function tryLoadSqliteVec(service: SqliteVecServiceLike): void {
  service.sqliteVecLoadAttempted = false;
  service.sqliteVecLoadError = '';
  service.sqliteVecTableReady = false;
  service.sqliteVecTableError = '';
  if (!service.sqliteVecExtensionPath) {
    service.sqliteVecLoaded = false;
    return;
  }
  try {
    service.sqliteVecLoadAttempted = true;
    if (typeof service.db.enableLoadExtension === 'function') {
      service.db.enableLoadExtension(true);
    }
    if (typeof service.db.loadExtension === 'function') {
      service.db.loadExtension(service.sqliteVecExtensionPath);
      service.sqliteVecLoaded = true;
      service.sqliteVecLoadError = '';
    }
  } catch (error) {
    service.sqliteVecLoaded = false;
    service.sqliteVecLoadError = String((error as Error)?.message || error || '');
  }
}

export function ensureSqliteVecTable(service: SqliteVecServiceLike): void {
  if (!service.sqliteVecLoaded) {
    service.sqliteVecTableReady = false;
    return;
  }
  try {
    if (shouldRebuildVecTable(service)) {
      service.db.exec('DROP TABLE IF EXISTS vec_chunks');
    }
    service.db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING ${getVecTableDefinition(service)}`);
    service.sqliteVecTableReady = true;
    service.sqliteVecTableError = '';
  } catch (error) {
    service.sqliteVecTableReady = false;
    service.sqliteVecTableError = String((error as Error)?.message || error || '');
  }
}

export function syncSqliteVecRowsFromChunks(service: SqliteVecServiceLike): void {
  if (!service.sqliteVecTableReady) return;
  const rows = service.db.prepare(
    'SELECT rowid, embedding_json FROM chunks WHERE embedding_json IS NOT NULL AND embedding_json != \'\''
  ).all() as { rowid: number; embedding_json: string }[];
  service.runInTransaction(() => {
    service.db.exec('DELETE FROM vec_chunks');
    for (const row of rows) {
      const key = normalizeVecPrimaryKey(row.rowid);
      service.db.prepare(
        `INSERT OR REPLACE INTO vec_chunks(chunk_rowid, embedding) VALUES (${key}, ?)`
      ).run(row.embedding_json);
    }
  });
}

export function getSqliteVecExtensionStatus(service: SqliteVecServiceLike): SqliteVecExtensionStatus {
  if (!service.sqliteVecExtensionPath) {
    return { configured: false, attempted: false, loaded: null, status: 'not-configured', path: '' };
  }
  if (!service.sqliteVecLoadAttempted) {
    return { configured: true, attempted: false, loaded: null, status: 'not-attempted', path: service.sqliteVecExtensionPath };
  }
  return {
    configured: true,
    attempted: true,
    loaded: service.sqliteVecLoaded,
    status: service.sqliteVecLoaded ? 'loaded' : 'load-failed',
    path: service.sqliteVecExtensionPath,
    error: service.sqliteVecLoaded ? '' : service.sqliteVecLoadError,
    vec_table_ready: service.sqliteVecTableReady,
    vec_table_error: service.sqliteVecTableError || ''
  };
}

export function checkStaleness(service: SqliteVecServiceLike): StalenessResult {
  service.ensureDb();
  const rows = service.db.prepare('SELECT path, signature FROM files').all() as { path: string; signature: string }[];
  let staleCount = 0;
  let deletedCount = 0;
  for (const row of rows) {
    try {
      const st = fs.statSync(row.path);
      if (makeFileSignature(st) !== row.signature) staleCount += 1;
    } catch {
      deletedCount += 1;
      staleCount += 1;
    }
  }
  return { stale: staleCount > 0, stale_count: staleCount, deleted_count: deletedCount, total_indexed: rows.length };
}
