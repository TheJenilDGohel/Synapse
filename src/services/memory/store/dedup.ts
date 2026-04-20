import { cosineSimilarity } from '../../retrieval/core/relevance.js';
import type { Adapter, EmbeddingService, DuplicateCheckResult, DuplicateCheckOpts } from '../types.js';

const DEFAULT_THRESHOLD = 0.92;
const MAX_CANDIDATES = 200;

interface CandidateRow {
  id: string;
  title: string;
  embedding_json: string;
}

export async function checkDuplicate(
  adapter: Adapter,
  embeddingService: EmbeddingService | null,
  content: string,
  opts: DuplicateCheckOpts = {}
): Promise<DuplicateCheckResult> {
  if (!content || typeof content !== 'string' || !content.trim()) {
    return { isDuplicate: false };
  }

  if (!embeddingService?.isEnabled?.() || !embeddingService?.embed) {
    return { isDuplicate: false };
  }

  let queryEmbedding: number[];
  try {
    queryEmbedding = await embeddingService.embed(content);
  } catch {
    return { isDuplicate: false };
  }

  if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
    return { isDuplicate: false };
  }

  const threshold = typeof opts.threshold === 'number' && Number.isFinite(opts.threshold)
    ? Math.max(0, Math.min(1, opts.threshold))
    : DEFAULT_THRESHOLD;

  const filters = [`embedding_json IS NOT NULL`, `embedding_json != ''`, `status = 'active'`];
  const params: unknown[] = [];

  if (opts.nest) {
    filters.push('nest = ?');
    params.push(opts.nest);
  }
  if (opts.branch) {
    filters.push('branch = ?');
    params.push(opts.branch);
  }
  if (opts.projectPath) {
    filters.push('scope_project_path = ?');
    params.push(opts.projectPath);
  }

  const where = filters.join(' AND ');
  const rows = await adapter.all<CandidateRow>(
    `SELECT id, title, embedding_json FROM memory_entries
     WHERE ${where}
     ORDER BY updated_at DESC
     LIMIT ?`,
    [...params, MAX_CANDIDATES]
  );

  if (!rows || rows.length === 0) {
    return { isDuplicate: false };
  }

  // Batch-parse all embedding JSON once, then score in a single pass
  const parsed: Array<{ id: string; title: string; emb: number[] }> = [];
  for (const row of rows) {
    try {
      const emb = JSON.parse(row.embedding_json) as unknown;
      if (Array.isArray(emb) && emb.length > 0) {
        parsed.push({ id: row.id, title: row.title, emb: emb as number[] });
      }
    } catch {
      // Skip malformed embedding payloads
    }
  }

  let bestMatch: { id: string; title: string; similarity: number } | null = null;
  let bestSimilarity = -1;

  for (const { id, title, emb } of parsed) {
    const similarity = cosineSimilarity(queryEmbedding, emb);
    if (similarity >= threshold && similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = { id, title, similarity: Number(similarity.toFixed(4)) };
    }
  }

  if (bestMatch) {
    return { isDuplicate: true, match: bestMatch };
  }

  return { isDuplicate: false };
}
