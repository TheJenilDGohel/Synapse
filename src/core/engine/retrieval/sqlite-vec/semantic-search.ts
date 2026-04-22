import { tokenize, toSparsePairs } from '../core/tokenizer.js';
import { bm25Score, cosineSimilarity, cosineToUnitScore, normalizeBm25 } from '../core/relevance.js';
import { buildBaseScopeClause, scoreFromVecDistance } from './helpers.js';

export interface SemanticSearchResult {
  file: string;
  start_line: number;
  end_line: number;
  snippet: string;
  semantic_score: number;
}

interface DbLike {
  prepare(sql: string): {
    run(...args: unknown[]): void;
    get(...args: unknown[]): Record<string, unknown> | undefined;
    all(...args: unknown[]): Record<string, unknown>[];
  };
}

interface EmbeddingServiceLike {
  isEnabled(): boolean;
  embed(text: string): Promise<number[] | null>;
}

interface WorkspaceLike {
  resolveSearchBases(projectPath: string | undefined, allRoots: boolean | undefined): string[];
  normalizeTarget(path: string): string;
}

interface SearchState {
  sqliteVecTableReady: boolean;
  maxTermsPerChunk: number;
  bm25K1: number;
  bm25B: number;
  onVecError?: (error: string) => void;
}

export interface SemanticSearchOptions {
  query: string;
  projectPath?: string;
  allRoots?: boolean;
  maxResults: number;
  minScore: number;
}

export async function semanticSearch(
  db: DbLike,
  embeddingService: EmbeddingServiceLike | null,
  workspace: WorkspaceLike,
  state: SearchState,
  { query, projectPath, allRoots, maxResults, minScore }: SemanticSearchOptions
): Promise<SemanticSearchResult[]> {
  if (!query || !query.trim()) return [];

  const { sqliteVecTableReady, maxTermsPerChunk, bm25K1, bm25B, onVecError } = state;
  const bases = workspace.resolveSearchBases(projectPath, allRoots).map((p) => workspace.normalizeTarget(p));
  const queryTokens = tokenize(query);
  const queryTfPairs = toSparsePairs(queryTokens, maxTermsPerChunk);

  let queryEmbedding: number[] | null = null;
  if (embeddingService?.isEnabled?.()) {
    try {
      queryEmbedding = await embeddingService.embed(query);
    } catch {
      queryEmbedding = null;
    }
  }

  if (queryTfPairs.length === 0 && !queryEmbedding) return [];

  const totalChunks = (db.prepare('SELECT COUNT(*) AS c FROM chunks').get() as { c: number })?.c || 0;
  if (totalChunks === 0) return [];

  const avgChunkTerms = (db.prepare('SELECT AVG(term_count) AS v FROM chunks').get() as { v: number })?.v || 0;
  const dfMap: Map<string, number> = queryTfPairs.length > 0
    ? new Map(
      (db.prepare(`SELECT term, df FROM term_df WHERE term IN (${queryTfPairs.map(() => '?').join(',')})`).all(...queryTfPairs.map(([t]) => t)) as { term: string; df: number }[]).map((r) => [r.term, r.df])
    )
    : new Map();

  const baseScope = buildBaseScopeClause(bases);

  let vecRows: { file_path: string; start_line: number; end_line: number; preview: string; distance: number }[] | null = null;
  if (queryEmbedding && sqliteVecTableReady) {
    try {
      const k = Math.max(maxResults * 6, 64);
      vecRows = db.prepare(
        `SELECT c.file_path, c.start_line, c.end_line, c.preview, v.distance
         FROM vec_chunks v
         JOIN chunks c ON c.rowid = v.chunk_rowid
         WHERE v.embedding MATCH ? AND k = ${k}
           AND (${baseScope.where})
         ORDER BY v.distance ASC
         LIMIT ${k}`
      ).all(JSON.stringify(queryEmbedding), ...baseScope.params) as unknown as typeof vecRows;
    } catch (error) {
      if (typeof onVecError === 'function') onVecError(String((error as Error)?.message || error || ''));
      vecRows = null;
    }
  }

  interface ChunkRow {
    file_path: string;
    start_line: number;
    end_line: number;
    preview: string;
    terms_json?: string;
    term_count?: number;
    embedding_json?: string;
    distance?: number;
  }

  const rows: ChunkRow[] = Array.isArray(vecRows)
    ? vecRows
    : (queryEmbedding
      ? db.prepare(
        `SELECT c.file_path, c.start_line, c.end_line, c.preview, c.terms_json, c.term_count, c.embedding_json
         FROM chunks c
         WHERE ${baseScope.where}`
      ).all(...baseScope.params) as unknown as ChunkRow[]
      : (() => {
        if (queryTfPairs.length === 0) return [] as ChunkRow[];
        const termCandidates = queryTfPairs.map(([term]) => term).slice(0, 8);
        const termPlaceholders = termCandidates.map(() => '?').join(',');
        return db.prepare(
          `SELECT DISTINCT c.file_path, c.start_line, c.end_line, c.preview, c.terms_json, c.term_count, c.embedding_json
           FROM term_index ti
           JOIN chunks c ON c.id = ti.chunk_id
           WHERE ti.term IN (${termPlaceholders})
             AND (${baseScope.where})`
        ).all(...termCandidates, ...baseScope.params) as unknown as ChunkRow[];
      })());

  const out: SemanticSearchResult[] = [];
  for (const row of rows) {
    let score: number;
    if (Array.isArray(vecRows)) {
      score = scoreFromVecDistance(row.distance!);
    } else {
      const terms = JSON.parse(row.terms_json || '[]') as [string, number][];
      const termLookup = new Map(terms);
      const bm25Raw = bm25Score(
        queryTfPairs, termLookup, row.term_count || 0, avgChunkTerms, totalChunks, dfMap,
        { k1: bm25K1, b: bm25B }
      );
      const bm25Norm = normalizeBm25(bm25Raw);
      score = bm25Norm;
      if (queryEmbedding && row.embedding_json) {
        try {
          const embedding = JSON.parse(row.embedding_json) as number[];
          score = cosineToUnitScore(cosineSimilarity(queryEmbedding, embedding));
        } catch {
          score = bm25Norm;
        }
      }
    }
    if (score < minScore) continue;
    out.push({ file: row.file_path, start_line: row.start_line, end_line: row.end_line, snippet: row.preview, semantic_score: score });
  }

  out.sort((a, b) => b.semantic_score - a.semantic_score);
  return out.slice(0, maxResults);
}
