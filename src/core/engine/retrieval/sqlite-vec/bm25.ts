export const NORM_FULL_SCAN_THRESHOLD = 500;

export type TfPair = [string, number];

interface DbLike {
  prepare(sql: string): {
    run(...args: unknown[]): void;
    get(...args: unknown[]): Record<string, unknown> | undefined;
    all(...args: unknown[]): Record<string, unknown>[];
  };
}

export function applyDfDeltaFromTerms(terms: TfPair[] | null, delta: number, intoMap: Map<string, number>): void {
  const seen = new Set<string>();
  for (const [term] of terms || []) {
    if (seen.has(term)) continue;
    seen.add(term);
    intoMap.set(term, (intoMap.get(term) || 0) + delta);
  }
}

export function applyDfDeltaFromTermsJson(termsJson: string, delta: number, intoMap: Map<string, number>): void {
  applyDfDeltaFromTerms(JSON.parse(termsJson) as TfPair[], delta, intoMap);
}

export function computeNorm(tfPairs: TfPair[], totalChunks: number, getDfFn?: (term: string) => number): number {
  let sum = 0;
  const n = Math.max(1, totalChunks);
  for (const [term, tf] of tfPairs) {
    const df = getDfFn ? getDfFn(term) : 0;
    const idf = Math.log((n + 1) / (df + 1)) + 1;
    const w = tf * idf;
    sum += w * w;
  }
  return Math.sqrt(sum);
}

export function computeCosine(
  queryTfPairs: TfPair[],
  queryNorm: number,
  chunkTfPairs: TfPair[],
  chunkNorm: number,
  totalChunks: number,
  getDfFn?: (term: string) => number
): number {
  if (!queryNorm || !chunkNorm) return 0;
  const n = Math.max(1, totalChunks);
  const chunkMap = new Map(chunkTfPairs);
  let dot = 0;
  for (const [term, qtf] of queryTfPairs) {
    const ctf = chunkMap.get(term);
    if (!ctf) continue;
    const df = getDfFn ? getDfFn(term) : 0;
    const idf = Math.log((n + 1) / (df + 1)) + 1;
    dot += (qtf * idf) * (ctf * idf);
  }
  return dot / (queryNorm * chunkNorm);
}

export function applyDfDeltas(
  db: DbLike,
  runInTransactionFn: (work: () => void) => void,
  deltaDf: Map<string, number>,
  getDfFn: (term: string) => number
): void {
  if (deltaDf.size === 0) return;
  const stmtUpsert = db.prepare('INSERT OR REPLACE INTO term_df(term, df) VALUES (?, ?)');
  const stmtDelete = db.prepare('DELETE FROM term_df WHERE term = ?');

  runInTransactionFn(() => {
    for (const [term, delta] of deltaDf.entries()) {
      if (!delta) continue;
      const next = getDfFn(term) + delta;
      if (next <= 0) {
        stmtDelete.run(term);
      } else {
        stmtUpsert.run(term, next);
      }
    }
  });
}

export interface NormRefreshContext {
  changedTerms: Set<string>;
  totalChunksChanged: boolean;
  totalChunks: number;
}

export function refreshChunkNorms(
  db: DbLike,
  runInTransactionFn: (work: () => void) => void,
  { changedTerms, totalChunksChanged, totalChunks }: NormRefreshContext,
  computeNormFn: (terms: TfPair[], totalChunks: number, dfFn?: (term: string) => number) => number
): void {
  const stmtUpdateNorm = db.prepare('UPDATE chunks SET norm = ? WHERE id = ?');
  let rows: { id: string; terms_json: string }[] = [];

  if (totalChunksChanged && changedTerms.size > NORM_FULL_SCAN_THRESHOLD) {
    rows = db.prepare('SELECT id, terms_json FROM chunks').all() as { id: string; terms_json: string }[];
  } else if (changedTerms.size > 0) {
    // Use term_index (idx_term_index_term) for O(terms) lookup instead of
    // O(chunks x terms) LIKE full-table scan.
    const stmtByTerm = db.prepare('SELECT chunk_id FROM term_index WHERE term = ?');
    const stmtGetChunk = db.prepare('SELECT id, terms_json FROM chunks WHERE id = ?');
    const byId = new Map<string, { id: string; terms_json: string }>();
    for (const term of changedTerms) {
      for (const row of stmtByTerm.all(term) as { chunk_id: string }[]) {
        if (!byId.has(row.chunk_id)) {
          const chunk = stmtGetChunk.get(row.chunk_id) as { id: string; terms_json: string } | undefined;
          if (chunk) byId.set(row.chunk_id, chunk);
        }
      }
    }
    rows = Array.from(byId.values());
  } else {
    return;
  }

  runInTransactionFn(() => {
    for (const row of rows) {
      const terms = JSON.parse(row.terms_json) as TfPair[];
      const norm = computeNormFn(terms, totalChunks);
      stmtUpdateNorm.run(norm, row.id);
    }
  });
}

export function rebuildDf(
  db: DbLike,
  runInTransactionFn: (work: () => void) => void,
  computeNormFn: (terms: TfPair[], totalChunks: number, dfFn: (term: string) => number) => number
): void {
  const rows = db.prepare('SELECT id, terms_json FROM chunks').all() as { id: string; terms_json: string }[];
  const df = new Map<string, number>();

  for (const row of rows) {
    const terms = JSON.parse(row.terms_json) as TfPair[];
    const seen = new Set<string>();
    for (const [term] of terms) {
      if (seen.has(term)) continue;
      seen.add(term);
      df.set(term, (df.get(term) || 0) + 1);
    }
  }

  const totalChunks = rows.length;
  runInTransactionFn(() => {
    db.prepare('DELETE FROM term_df').run();
    const insertDf = db.prepare('INSERT INTO term_df(term, df) VALUES (?, ?)');
    for (const [term, count] of df.entries()) {
      insertDf.run(term, count);
    }
    const updateNorm = db.prepare('UPDATE chunks SET norm = ? WHERE id = ?');
    for (const chunk of rows) {
      const terms = JSON.parse(chunk.terms_json) as TfPair[];
      const norm = computeNormFn(terms, totalChunks, (term) => df.get(term) || 0);
      updateNorm.run(norm, chunk.id);
    }
  });
}
