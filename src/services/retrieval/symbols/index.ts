import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { applySqliteTuning } from '../../memory/sqlite-tuning.js';
import { ensureSymbolIndexTable } from './schema.js';
import { extractSymbolsFromFile } from './extractor.js';
import { findCallers, findDefinition, findImplementations, renamePreview } from './queries.js';
import type {
  FindCallersResult,
  FindDefinitionResult,
  FindImplementationsResult,
  RenamePreviewResult,
  SymbolQueryOptions
} from './types.js';

interface DbLike {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: unknown[]): void;
    all(...params: unknown[]): Record<string, unknown>[];
  };
  close?(): void;
}

interface AstChunkerLike {
  resolveLanguageId(filePath: string): string | null;
  getParser(languageId: string): Promise<unknown>;
}

export class SymbolIndexService {
  private dbPath: string;
  private db: DbLike | null;
  private astChunker: AstChunkerLike | null;
  private initialized: boolean;

  constructor(dbPath: string, astChunker?: AstChunkerLike | null) {
    this.dbPath = dbPath;
    this.db = null;
    this.astChunker = astChunker ?? null;
    this.initialized = false;
  }

  private ensureDb(): DbLike {
    if (this.db) return this.db;
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    this.db = new DatabaseSync(this.dbPath) as unknown as DbLike;
    void applySqliteTuning(this.db);
    return this.db;
  }

  private ensureInit(): DbLike {
    const db = this.ensureDb();
    if (!this.initialized) {
      ensureSymbolIndexTable(db);
      this.initialized = true;
    }
    return db;
  }

  async indexFile(filePath: string, text: string): Promise<number> {
    const db = this.ensureInit();
    const entries = await extractSymbolsFromFile(filePath, text, this.astChunker as any);
    if (entries.length === 0) return 0;

    db.prepare('DELETE FROM symbol_index WHERE file_path = ?').run(filePath);

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO symbol_index
        (id, file_path, symbol_name, symbol_kind, node_type, line_start, line_end,
         scope_path, language, is_definition, is_export, context_text, indexed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const e of entries) {
      insertStmt.run(
        e.id, e.file_path, e.symbol_name, e.symbol_kind, e.node_type,
        e.line_start, e.line_end, e.scope_path, e.language,
        e.is_definition, e.is_export, e.context_text, e.indexed_at
      );
    }

    return entries.length;
  }

  async indexFiles(files: Array<{ path: string; text: string }>): Promise<{ indexed: number; symbols: number }> {
    const db = this.ensureInit();
    let totalSymbols = 0;
    let indexed = 0;

    const BATCH_SIZE = 50;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      db.exec('BEGIN TRANSACTION');
      try {
        for (const file of batch) {
          const count = await this.indexFile(file.path, file.text);
          if (count > 0) indexed++;
          totalSymbols += count;
        }
        db.exec('COMMIT');
      } catch (err) {
        try { db.exec('ROLLBACK'); } catch { /* ignore */ }
        throw err;
      }
    }

    return { indexed, symbols: totalSymbols };
  }

  clearFile(filePath: string): void {
    const db = this.ensureInit();
    db.prepare('DELETE FROM symbol_index WHERE file_path = ?').run(filePath);
  }

  clearAll(): void {
    const db = this.ensureInit();
    db.exec('DELETE FROM symbol_index');
  }

  getStats(): { total_symbols: number; total_files: number; languages: string[] } {
    const db = this.ensureInit();
    const countRow = db.prepare('SELECT COUNT(*) as cnt FROM symbol_index').all()[0] as Record<string, unknown>;
    const fileRow = db.prepare('SELECT COUNT(DISTINCT file_path) as cnt FROM symbol_index').all()[0] as Record<string, unknown>;
    const langRows = db.prepare('SELECT DISTINCT language FROM symbol_index ORDER BY language').all();

    return {
      total_symbols: Number(countRow?.cnt || 0),
      total_files: Number(fileRow?.cnt || 0),
      languages: langRows.map(r => String((r as Record<string, unknown>).language || ''))
    };
  }

  // -- Query delegates --

  findCallers(symbol: string, opts?: SymbolQueryOptions): FindCallersResult {
    const db = this.ensureInit();
    return findCallers(db, symbol, opts);
  }

  findDefinition(symbol: string, opts?: SymbolQueryOptions): FindDefinitionResult {
    const db = this.ensureInit();
    return findDefinition(db, symbol, opts);
  }

  findImplementations(interfaceName: string, opts?: SymbolQueryOptions): FindImplementationsResult {
    const db = this.ensureInit();
    return findImplementations(db, interfaceName, opts);
  }

  renamePreview(oldName: string, newName: string, opts?: SymbolQueryOptions): RenamePreviewResult {
    const db = this.ensureInit();
    return renamePreview(db, oldName, newName, opts);
  }

  /**
   * Release the underlying SQLite handle. Required on Windows so test
   * teardown can unlink the DB file without `EBUSY`. Truncates the WAL
   * and flips journal_mode to DELETE so the `.db-wal` / `.db-shm`
   * auxiliary files are also released.
   */
  close(): void {
    if (!this.db) return;
    try { this.db.exec('PRAGMA wal_checkpoint(TRUNCATE);'); } catch { /* ignore */ }
    try { this.db.exec('PRAGMA journal_mode=DELETE;'); } catch { /* ignore */ }
    try { this.db.close?.(); } catch { /* ignore */ }
    this.db = null;
    this.initialized = false;
  }
}
