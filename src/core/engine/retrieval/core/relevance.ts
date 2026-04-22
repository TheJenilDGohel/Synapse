export function cosineSimilarity(a: number[], b: number[]): number {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = Number(a[i]) || 0;
    const bv = Number(b[i]) || 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function cosineToUnitScore(cosine: number): number {
  return Math.max(0, Math.min(1, (cosine + 1) / 2));
}

export function bm25Idf(totalDocs: number, docFreq: number): number {
  const n = Math.max(1, Number(totalDocs) || 0);
  const df = Math.max(0, Number(docFreq) || 0);
  return Math.log(1 + ((n - df + 0.5) / (df + 0.5)));
}

export function bm25Score(
  queryTfPairs: [string, number][],
  termLookup: Map<string, number>,
  docLength: number,
  avgDocLength: number,
  totalDocs: number,
  dfLookup: Map<string, number>,
  { k1 = 1.2, b = 0.75 }: { k1?: number; b?: number } = {}
): number {
  if (!Array.isArray(queryTfPairs) || queryTfPairs.length === 0) return 0;
  const dl = Math.max(1, Number(docLength) || 0);
  const avgDl = Math.max(1, Number(avgDocLength) || 0);
  const norm = k1 * (1 - b + b * (dl / avgDl));
  let score = 0;

  for (const [term] of queryTfPairs) {
    const tf = Number(termLookup.get(term) || 0);
    if (tf <= 0) continue;
    const idf = bm25Idf(totalDocs, Number(dfLookup.get(term) || 0));
    const numer = tf * (k1 + 1);
    const denom = tf + norm;
    score += idf * (numer / denom);
  }
  return score;
}

export function normalizeBm25(rawScore: number): number {
  const safe = Math.max(0, Number(rawScore) || 0);
  // Monotonic compression into [0,1) so min_semantic_score remains stable.
  return 1 - Math.exp(-safe);
}
