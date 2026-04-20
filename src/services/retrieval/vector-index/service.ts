import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {
  makeFileSignature,
  isUnderBase,
  collectFiles as collectFilesFn,
  chunkFile as chunkFileFn,
  rebuildStats as rebuildStatsFn,
  semanticSearch as semanticSearchFn
} from './helpers.js';
import type { VectorIndexData, VectorIndexChunk, SemanticResult } from './helpers.js';

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

export interface VectorIndexServiceOptions {
  workspace: WorkspaceLike;
  indexPath: string;
  chunkLines: number;
  chunkOverlap: number;
  maxTermsPerChunk: number;
  maxIndexedFiles: number;
  embeddingService?: EmbeddingServiceLike | null;
  astChunker?: AstChunkerLike | null;
  bm25K1?: number;
  bm25B?: number;
}

export interface IndexProjectResult {
  bases: string[];
  scanned_files: number;
  indexed_files: number;
  skipped_files: number;
  removed_files: number;
  failed_files: { path: string; error: string }[];
  total_files: number;
  total_chunks: number;
  index_path: string;
  embedding: Record<string, unknown> | null;
}

export class VectorIndexService {
  workspace: WorkspaceLike;
  indexPath: string;
  chunkLines: number;
  chunkOverlap: number;
  maxTermsPerChunk: number;
  maxIndexedFiles: number;
  embeddingService: EmbeddingServiceLike | null;
  astChunker: AstChunkerLike | null;
  bm25K1: number;
  bm25B: number;
  data: VectorIndexData | null;
  private _persistPending: boolean;
  private _persistQueued: boolean;

  constructor({
    workspace,
    indexPath,
    chunkLines,
    chunkOverlap,
    maxTermsPerChunk,
    maxIndexedFiles,
    embeddingService,
    astChunker,
    bm25K1 = 1.2,
    bm25B = 0.75
  }: VectorIndexServiceOptions) {
    this.workspace = workspace;
    this.indexPath = indexPath;
    this.chunkLines = chunkLines;
    this.chunkOverlap = chunkOverlap;
    this.maxTermsPerChunk = maxTermsPerChunk;
    this.maxIndexedFiles = maxIndexedFiles;
    this.embeddingService = embeddingService || null;
    this.astChunker = astChunker || null;
    this.bm25K1 = bm25K1;
    this.bm25B = bm25B;
    this.data = null;
    this._persistPending = false;
    this._persistQueued = false;
  }

  ensureLoaded(): void {
    if (this.data) return;

    try {
      if (fs.existsSync(this.indexPath)) {
        this.data = JSON.parse(fs.readFileSync(this.indexPath, 'utf8')) as VectorIndexData;
      }
    } catch {
      this.data = null;
    }

    if (!this.data || typeof this.data !== 'object') {
      this.data = {
        version: 2,
        updated_at: null,
        total_chunks: 0,
        total_files: 0,
        avg_chunk_terms: 0,
        df: {},
        documents: {}
      };
    }
  }

  /**
   * Async persist with write coalescing.
   * If a write is already in-flight, the request is queued and only one
   * additional write will run after the current one finishes.
   */
  async persist(): Promise<void> {
    if (this._persistPending) {
      this._persistQueued = true;
      return;
    }

    this._persistPending = true;
    try {
      const dir = path.dirname(this.indexPath);
      await fsp.mkdir(dir, { recursive: true });
      const json = `${JSON.stringify(this.data, null, 2)}\n`;
      await fsp.writeFile(this.indexPath, json, 'utf8');
    } finally {
      this._persistPending = false;
      if (this._persistQueued) {
        this._persistQueued = false;
        await this.persist();
      }
    }
  }

  getStatus(): Record<string, unknown> {
    this.ensureLoaded();
    const upgradeRecommended = (this.data!.total_chunks || 0) > 5000;
    return {
      backend: 'json',
      index_path: this.indexPath,
      version: this.data!.version,
      updated_at: this.data!.updated_at,
      total_files: this.data!.total_files,
      total_chunks: this.data!.total_chunks,
      avg_chunk_terms: this.data!.avg_chunk_terms,
      upgrade_recommended: upgradeRecommended,
      upgrade_reason: upgradeRecommended
        ? 'json backend with large index; prefer sqlite-vec (Node 22.13+) for production scale'
        : null,
      embedding: this.embeddingService?.getStatus?.() || {
        provider: 'none',
        enabled: false,
        available: false,
        model: null,
        dimensions: null
      },
      ast_chunking: this.astChunker?.getStatus?.() || {
        enabled: false,
        supported_languages: [],
        active_languages: [],
        fallback_languages: [],
        ast_chunks: 0,
        fallback_chunks: 0
      }
    };
  }

  async checkStaleness(): Promise<{ stale: boolean; stale_count: number; deleted_count: number; total_indexed: number }> {
    this.ensureLoaded();
    const docs = this.data?.documents || {};
    let staleCount = 0;
    let deletedCount = 0;
    const entries = Object.entries(docs);
    for (const [filePath, doc] of entries) {
      try {
        const st = await fsp.stat(filePath);
        if (makeFileSignature(st) !== doc.signature) staleCount += 1;
      } catch {
        deletedCount += 1;
        staleCount += 1;
      }
    }
    return { stale: staleCount > 0, stale_count: staleCount, deleted_count: deletedCount, total_indexed: entries.length };
  }

  async indexProject({ projectPath, allRoots, force, maxFiles, onProgress }: {
    projectPath?: string;
    allRoots?: boolean;
    force: boolean;
    maxFiles: number;
    onProgress?: (info: { scanned: number; total: number; phase: string }) => Promise<void>;
  }): Promise<IndexProjectResult> {
    this.ensureLoaded();

    const bases = this.workspace.resolveSearchBases(projectPath, allRoots).map((p) => this.workspace.normalizeTarget(p));
    const files = this.collectFiles(bases, maxFiles);
    const fileSet = new Set(files);
    const total = files.length;
    let completed = 0;

    let processed = 0;
    let skipped = 0;
    let removed = 0;
    const failedFiles: { path: string; error: string }[] = [];

    for (const filePath of Object.keys(this.data!.documents)) {
      if (!isUnderBase(filePath, bases)) continue;
      if (!fileSet.has(filePath)) {
        delete this.data!.documents[filePath];
        removed += 1;
      }
    }

    for (const filePath of files) {
      try {
        const st = fs.statSync(filePath);
        const signature = makeFileSignature(st);
        const existing = this.data!.documents[filePath];

        if (!force && existing && existing.signature === signature) {
          skipped += 1;
          continue;
        }

        const text = this.workspace.safeReadText(filePath);
        const chunks = await this.chunkFile(filePath, text);
        this.data!.documents[filePath] = { signature, chunks };
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

    this.rebuildStats();
    if (typeof onProgress === 'function') {
      await onProgress({ scanned: total, total, phase: 'rebuilding_stats' });
    }
    await this.persist();

    return {
      bases,
      scanned_files: files.length,
      indexed_files: processed,
      skipped_files: skipped,
      removed_files: removed,
      failed_files: failedFiles,
      total_files: this.data!.total_files,
      total_chunks: this.data!.total_chunks,
      index_path: this.indexPath,
      embedding: this.embeddingService?.getStatus?.() || null
    };
  }

  async semanticSearch({ query, projectPath, allRoots, maxResults, minScore }: {
    query: string;
    projectPath?: string;
    allRoots?: boolean;
    maxResults: number;
    minScore: number;
  }): Promise<SemanticResult[]> {
    return semanticSearchFn(this as unknown as Parameters<typeof semanticSearchFn>[0], { query, projectPath, allRoots, maxResults, minScore });
  }

  collectFiles(bases: string[], maxFiles: number): string[] {
    return collectFilesFn(this as unknown as Parameters<typeof collectFilesFn>[0], bases, maxFiles);
  }

  async chunkFile(filePath: string, text: string): Promise<VectorIndexChunk[]> {
    return chunkFileFn(this as unknown as Parameters<typeof chunkFileFn>[0], filePath, text);
  }

  rebuildStats(): void {
    return rebuildStatsFn(this as unknown as Parameters<typeof rebuildStatsFn>[0]);
  }
}
