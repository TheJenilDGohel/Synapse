import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { applySqliteTuning } from '../../memory/sqlite-tuning.js';
import { buildBaseScopeClause, makeFileSignature, isUnderBase } from './helpers.js';
import { INDEX_SCHEMA_SQL, runInTransaction, runMigrations } from './schema.js';
import {
  applyDfDeltaFromTerms, applyDfDeltaFromTermsJson,
  computeNorm, applyDfDeltas, refreshChunkNorms
} from './bm25.js';
import type { TfPair } from './bm25.js';
import { collectFiles, chunkFile as chunkFileFn } from './indexer.js';
import { semanticSearch as semanticSearchFn } from './semantic-search.js';
import type { SemanticSearchResult, SemanticSearchOptions } from './semantic-search.js';
import {
  tryLoadSqliteVec as tryLoadSqliteVecFn,
  ensureSqliteVecTable as ensureSqliteVecTableFn,
  syncSqliteVecRowsFromChunks as syncSqliteVecRowsFromChunksFn,
  getSqliteVecExtensionStatus as getSqliteVecExtensionStatusFn,
  checkStaleness as checkStalenessFn
} from './runtime.js';
import type { SqliteVecExtensionStatus, StalenessResult } from './runtime.js';

// Re-export for callers that import buildBaseScopeClause from this module.
export { buildBaseScopeClause };

interface WorkspaceLike {
  resolveSearchBases(projectPath: string | undefined, allRoots: boolean | undefined): string[];
  normalizeTarget(path: string): string;
  walkDirectories(base: string): Iterable<{ files: string[] }>;
  isLikelyTextFile(filePath: string): boolean;
  safeReadText(filePath: string): string;
}

interface EmbeddingServiceLike {
  isEnabled(): boolean;
  embed(text: string): Promise<number[] | null>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getStatus(): Record<string, unknown>;
}

interface AstChunkerLike {
  chunk(opts: { filePath: string; text: string; chunkLines: number; chunkOverlap: number }): Promise<{ start_line: number; end_line: number; raw_text: string; semantic_text?: string }[]>;
  getStatus(): Record<string, unknown>;
}

interface DbStatement {
  run(...args: unknown[]): void;
  get(...args: unknown[]): Record<string, unknown> | undefined;
  all(...args: unknown[]): Record<string, unknown>[];
}

export interface SqliteVecServiceOptions {
  workspace: WorkspaceLike;
  dbPath: string;
  sqliteVecExtensionPath?: string;
  chunkLines: number;
  chunkOverlap: number;
  maxTermsPerChunk: number;
  maxIndexedFiles: number;
  embeddingService?: EmbeddingServiceLike | null;
  embeddingDimensions?: number;
  astChunker?: AstChunkerLike | null;
  bm25K1?: number;
  bm25B?: number;
}

export interface IndexProjectResult {
  backend: string;
  bases: string[];
  scanned_files: number;
  indexed_files: number;
  skipped_files: number;
  removed_files: number;
  failed_files: { path: string; error: string }[];
  total_files: number;
  total_chunks: number;
  db_path: string;
  sqlite_vec_loaded: boolean | null;
  sqlite_vec_extension: SqliteVecExtensionStatus;
}

export class SqliteVecIndexService {
  workspace: WorkspaceLike;
  dbPath: string;
  sqliteVecExtensionPath: string;
  chunkLines: number;
  chunkOverlap: number;
  maxTermsPerChunk: number;
  maxIndexedFiles: number;
  embeddingService: EmbeddingServiceLike | null;
  embeddingDimensions: number;
  astChunker: AstChunkerLike | null;
  bm25K1: number;
  bm25B: number;
  db: InstanceType<typeof DatabaseSync> | null;
  sqliteVecLoaded: boolean;
  sqliteVecLoadAttempted: boolean;
  sqliteVecLoadError: string;
  sqliteVecTableReady: boolean;
  sqliteVecTableError: string;
  private _stmtGetDf: DbStatement | null;
  private _stmtSetMeta: DbStatement | null;
  private _stmtGetMeta: DbStatement | null;

  constructor({
    workspace,
    dbPath,
    sqliteVecExtensionPath,
    chunkLines,
    chunkOverlap,
    maxTermsPerChunk,
    maxIndexedFiles,
    embeddingService,
    embeddingDimensions = 384,
    astChunker,
    bm25K1 = 1.2,
    bm25B = 0.75
  }: SqliteVecServiceOptions) {
    this.workspace = workspace;
    this.dbPath = dbPath;
    this.sqliteVecExtensionPath = sqliteVecExtensionPath || '';
    this.chunkLines = chunkLines;
    this.chunkOverlap = chunkOverlap;
    this.maxTermsPerChunk = maxTermsPerChunk;
    this.maxIndexedFiles = maxIndexedFiles;
    this.embeddingService = embeddingService || null;
    this.embeddingDimensions = Math.max(1, Number(embeddingDimensions) || 384);
    this.astChunker = astChunker || null;
    this.bm25K1 = bm25K1;
    this.bm25B = bm25B;
    this.db = null;
    this.sqliteVecLoaded = false;
    this.sqliteVecLoadAttempted = false;
    this.sqliteVecLoadError = '';
    this.sqliteVecTableReady = false;
    this.sqliteVecTableError = '';
    this._stmtGetDf = null;
    this._stmtSetMeta = null;
    this._stmtGetMeta = null;
  }

  resetDb(): void {
    if (!this.db) return;
    try {
      this.db.close();
    } catch {
      // Ignore close failures while recovering from a broken sqlite handle.
    }
    this.db = null;
    this._stmtGetDf = null;
    this._stmtSetMeta = null;
    this._stmtGetMeta = null;
  }

  /**
   * Gracefully release the SQLite handle and WAL auxiliary files. Required
   * on Windows so tests can unlink the DB file without `EBUSY`. Truncates
   * the WAL and flips journal_mode to DELETE before closing so `.db-wal`
   * and `.db-shm` are removed as well.
   */
  close(): void {
    if (!this.db) return;
    try { this.db.exec('PRAGMA wal_checkpoint(TRUNCATE);'); } catch { /* ignore */ }
    try { this.db.exec('PRAGMA journal_mode=DELETE;'); } catch { /* ignore */ }
    this.resetDb();
  }

  ensureDb(): void {
    if (this.db) return;
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    try {
      this.db = new DatabaseSync(this.dbPath, {
        allowExtension: Boolean(this.sqliteVecExtensionPath)
      } as Record<string, unknown>);
      // fire-and-forget: DatabaseSync.exec is synchronous; the promise
      // resolves on the next microtask but all PRAGMAs are already applied.
      void applySqliteTuning(this.db);
      this.db.exec(INDEX_SCHEMA_SQL);

      this._stmtGetDf = this.db.prepare('SELECT df FROM term_df WHERE term = ?') as unknown as DbStatement;
      this._stmtSetMeta = this.db.prepare('INSERT OR REPLACE INTO index_meta(key, value) VALUES (?, ?)') as unknown as DbStatement;
      this._stmtGetMeta = this.db.prepare('SELECT value FROM index_meta WHERE key = ?') as unknown as DbStatement;

      this.setMeta('backend', 'sqlite-vec');
      this._runMigrations();
      this.tryLoadSqliteVec();
      this.ensureSqliteVecTable();
    } catch (error) {
      this.resetDb();
      throw error;
    }
  }

  _runMigrations(): void {
    runMigrations(this.db as unknown as Parameters<typeof runMigrations>[0], (work) => this.runInTransaction(work));
  }

  tryLoadSqliteVec(): void {
    return tryLoadSqliteVecFn(this as unknown as Parameters<typeof tryLoadSqliteVecFn>[0]);
  }

  ensureSqliteVecTable(): void {
    return ensureSqliteVecTableFn(this as unknown as Parameters<typeof ensureSqliteVecTableFn>[0]);
  }

  syncSqliteVecRowsFromChunks(): void {
    return syncSqliteVecRowsFromChunksFn(this as unknown as Parameters<typeof syncSqliteVecRowsFromChunksFn>[0]);
  }

  getSqliteVecExtensionStatus(): SqliteVecExtensionStatus {
    return getSqliteVecExtensionStatusFn(this as unknown as Parameters<typeof getSqliteVecExtensionStatusFn>[0]);
  }

  setMeta(key: string, value: string): void {
    (this._stmtSetMeta || (this.db as unknown as { prepare(sql: string): DbStatement }).prepare('INSERT OR REPLACE INTO index_meta(key, value) VALUES (?, ?)')).run(key, String(value));
  }

  getMeta(key: string): string | null {
    const row = (this._stmtGetMeta || (this.db as unknown as { prepare(sql: string): DbStatement }).prepare('SELECT value FROM index_meta WHERE key = ?')).get(key) as { value?: string } | undefined;
    return row ? (row.value ?? null) : null;
  }

  getDf(term: string): number {
    const row = (this._stmtGetDf || (this.db as unknown as { prepare(sql: string): DbStatement }).prepare('SELECT df FROM term_df WHERE term = ?')).get(term) as { df?: number } | undefined;
    return row ? (row.df ?? 0) : 0;
  }

  batchGetDf(terms: string[]): Map<string, number> {
    if (terms.length === 0) return new Map();
    const placeholders = terms.map(() => '?').join(',');
    const rows = (this.db as unknown as { prepare(sql: string): DbStatement }).prepare(`SELECT term, df FROM term_df WHERE term IN (${placeholders})`).all(...terms) as { term: string; df: number }[];
    return new Map(rows.map((r) => [r.term, r.df]));
  }

  runInTransaction(work: () => void): void {
    runInTransaction(this.db as unknown as Parameters<typeof runInTransaction>[0], work);
  }

  getStatus(): Record<string, unknown> {
    try {
      this.ensureDb();
      const dbRef = this.db as unknown as { prepare(sql: string): DbStatement };
      const row = dbRef.prepare('SELECT COUNT(*) AS c FROM files').get() as { c: number } | undefined;
      const chunkRow = dbRef.prepare('SELECT COUNT(*) AS c FROM chunks').get() as { c: number } | undefined;
      const avgTermsRow = dbRef.prepare('SELECT AVG(term_count) AS v FROM chunks').get() as { v: number } | undefined;
      const extension = this.getSqliteVecExtensionStatus();
      return {
        backend: 'sqlite-vec',
        db_path: this.dbPath,
        sqlite_vec_loaded: extension.loaded,
        sqlite_vec_extension: extension,
        sqlite_vec_table_ready: this.sqliteVecTableReady,
        updated_at: this.getMeta('updated_at'),
        total_files: row?.c || 0,
        total_chunks: chunkRow?.c || 0,
        avg_chunk_terms: Number(avgTermsRow?.v || 0),
        upgrade_recommended: false,
        upgrade_reason: null,
        error: null,
        embedding: this.embeddingService?.getStatus?.() || { provider: 'none', enabled: false, available: false, model: null, dimensions: null },
        ast_chunking: this.astChunker?.getStatus?.() || { enabled: false, supported_languages: [], active_languages: [], fallback_languages: [], ast_chunks: 0, fallback_chunks: 0 }
      };
    } catch (error) {
      this.resetDb();
      return {
        backend: 'sqlite-vec',
        db_path: this.dbPath,
        sqlite_vec_loaded: null,
        sqlite_vec_extension: this.getSqliteVecExtensionStatus(),
        sqlite_vec_table_ready: false,
        updated_at: null,
        total_files: 0,
        total_chunks: 0,
        avg_chunk_terms: 0,
        upgrade_recommended: false,
        upgrade_reason: null,
        error: String((error as Error)?.message || error),
        embedding: this.embeddingService?.getStatus?.() || { provider: 'none', enabled: false, available: false, model: null, dimensions: null },
        ast_chunking: this.astChunker?.getStatus?.() || { enabled: false, supported_languages: [], active_languages: [], fallback_languages: [], ast_chunks: 0, fallback_chunks: 0 }
      };
    }
  }

  checkStaleness(): StalenessResult {
    return checkStalenessFn(this as unknown as Parameters<typeof checkStalenessFn>[0]);
  }

  async indexProject({ projectPath, allRoots, force, maxFiles, onProgress }: {
    projectPath?: string;
    allRoots?: boolean;
    force: boolean;
    maxFiles: number;
    onProgress?: (info: { scanned: number; total: number; phase: string }) => Promise<void>;
  }): Promise<IndexProjectResult> {
    this.ensureDb();
    const dbRef = this.db as unknown as { prepare(sql: string): DbStatement };
    const bases = this.workspace.resolveSearchBases(projectPath, allRoots).map((p) => this.workspace.normalizeTarget(p));
    const files = collectFiles(this.workspace, bases, maxFiles, this.maxIndexedFiles);
    const fileSet = new Set(files);
    const total = files.length;
    let completed = 0;
    let processed = 0;
    let skipped = 0;
    let removed = 0;
    const failedFiles: { path: string; error: string }[] = [];

    const stmtSelectSig = dbRef.prepare('SELECT signature FROM files WHERE path = ?');
    const stmtSelectChunkTermsByFile = dbRef.prepare('SELECT id, terms_json FROM chunks WHERE file_path = ?');
    const stmtDeleteTermIndexByFile = dbRef.prepare('DELETE FROM term_index WHERE chunk_id IN (SELECT id FROM chunks WHERE file_path = ?)');
    const stmtDeleteChunks = dbRef.prepare('DELETE FROM chunks WHERE file_path = ?');
    const stmtDeleteFile = dbRef.prepare('DELETE FROM files WHERE path = ?');
    const stmtUpsertFile = dbRef.prepare('INSERT OR REPLACE INTO files(path, signature, updated_at) VALUES (?, ?, ?)');
    const stmtInsertChunk = dbRef.prepare(
      'INSERT OR REPLACE INTO chunks(id, file_path, start_line, end_line, preview, terms_json, term_count, embedding_json, norm) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const stmtInsertTermIndex = dbRef.prepare('INSERT OR IGNORE INTO term_index(term, chunk_id) VALUES (?, ?)');

    const existingRows = dbRef.prepare('SELECT path FROM files').all() as { path: string }[];
    const beforeChunkCount = (dbRef.prepare('SELECT COUNT(*) AS c FROM chunks').get() as { c: number })?.c || 0;
    const deltaDf = new Map<string, number>();
    let deltaTotalChunks = 0;

    // Phase 1: remove deleted/out-of-scope files
    this.runInTransaction(() => {
      for (const row of existingRows) {
        if (!isUnderBase(row.path, bases)) continue;
        if (!fileSet.has(row.path)) {
          const oldRows = stmtSelectChunkTermsByFile.all(row.path) as { terms_json: string }[];
          for (const oldRow of oldRows) {
            applyDfDeltaFromTermsJson(oldRow.terms_json, -1, deltaDf);
          }
          deltaTotalChunks -= oldRows.length;
          stmtDeleteTermIndexByFile.run(row.path);
          stmtDeleteChunks.run(row.path);
          stmtDeleteFile.run(row.path);
          removed += 1;
        }
      }
    });

    // Phase 2: process each file independently
    for (const filePath of files) {
      try {
        const st = fs.statSync(filePath);
        const signature = makeFileSignature(st);
        const existing = stmtSelectSig.get(filePath) as { signature: string } | undefined;

        if (!force && existing && existing.signature === signature) {
          skipped += 1;
          continue;
        }

        const text = this.workspace.safeReadText(filePath);
        const chunks = await chunkFileFn(filePath, text, {
          astChunker: this.astChunker,
          embeddingService: this.embeddingService,
          chunkLines: this.chunkLines,
          chunkOverlap: this.chunkOverlap,
          maxTermsPerChunk: this.maxTermsPerChunk
        });
        const existingChunkRows = existing ? stmtSelectChunkTermsByFile.all(filePath) as { terms_json: string }[] : [];

        if (existingChunkRows.length > 0) {
          for (const oldRow of existingChunkRows) {
            applyDfDeltaFromTermsJson(oldRow.terms_json, -1, deltaDf);
          }
          deltaTotalChunks -= existingChunkRows.length;
        }

        this.runInTransaction(() => {
          stmtDeleteTermIndexByFile.run(filePath);
          stmtDeleteChunks.run(filePath);
          stmtUpsertFile.run(filePath, signature, new Date().toISOString());
          for (const chunk of chunks) {
            applyDfDeltaFromTerms(chunk.terms, 1, deltaDf);
            stmtInsertChunk.run(
              chunk.id, filePath, chunk.start_line, chunk.end_line, chunk.preview,
              JSON.stringify(chunk.terms), chunk.term_count || 0,
              chunk.embedding ? JSON.stringify(chunk.embedding) : null, chunk.norm
            );
            for (const [term] of chunk.terms) {
              stmtInsertTermIndex.run(term, chunk.id);
            }
          }
        });

        deltaTotalChunks += chunks.length;
        processed += 1;
      } catch (err) {
        failedFiles.push({ path: filePath, error: String((err as Error)?.message || err) });
      } finally {
        completed += 1;
        if (typeof onProgress === 'function') {
          await onProgress({ scanned: completed, total, phase: 'indexing_files' });
        }
      }
    }

    const getDfFn = (term: string): number => this.getDf(term);
    const runTxn = (work: () => void): void => this.runInTransaction(work);
    const computeNormFn = (terms: TfPair[], totalChunks: number, dfFn?: (term: string) => number): number => computeNorm(terms, totalChunks, dfFn || getDfFn);

    applyDfDeltas(dbRef as unknown as Parameters<typeof applyDfDeltas>[0], runTxn, deltaDf, getDfFn);
    const changedTerms = new Set(Array.from(deltaDf.entries()).filter(([, delta]) => delta !== 0).map(([term]) => term));
    refreshChunkNorms(dbRef as unknown as Parameters<typeof refreshChunkNorms>[0], runTxn, {
      changedTerms,
      totalChunksChanged: deltaTotalChunks !== 0,
      totalChunks: beforeChunkCount + deltaTotalChunks
    }, computeNormFn);

    if (this.sqliteVecTableReady) {
      try {
        this.syncSqliteVecRowsFromChunks();
      } catch (error) {
        this.sqliteVecTableReady = false;
        this.sqliteVecTableError = String((error as Error)?.message || error || '');
      }
    }
    this.setMeta('updated_at', new Date().toISOString());
    if (typeof onProgress === 'function') {
      await onProgress({ scanned: total, total, phase: 'finalizing_index' });
    }

    const status = this.getStatus();
    return {
      backend: 'sqlite-vec',
      bases,
      scanned_files: files.length,
      indexed_files: processed,
      skipped_files: skipped,
      removed_files: removed,
      failed_files: failedFiles,
      total_files: status.total_files as number,
      total_chunks: status.total_chunks as number,
      db_path: this.dbPath,
      sqlite_vec_loaded: status.sqlite_vec_loaded as boolean | null,
      sqlite_vec_extension: status.sqlite_vec_extension as SqliteVecExtensionStatus
    };
  }

  async semanticSearch(opts: SemanticSearchOptions): Promise<SemanticSearchResult[]> {
    this.ensureDb();
    return semanticSearchFn(this.db as unknown as Parameters<typeof semanticSearchFn>[0], this.embeddingService, this.workspace, {
      sqliteVecTableReady: this.sqliteVecTableReady,
      maxTermsPerChunk: this.maxTermsPerChunk,
      bm25K1: this.bm25K1,
      bm25B: this.bm25B,
      onVecError: (err: string) => { this.sqliteVecTableError = err; }
    }, opts);
  }
}
