/**
 * KG triple text search — LIKE-based matching against entity names and predicates.
 */
import type { Adapter } from '../types.js';

export interface SearchTriplesResult {
  count: number;
  items: Array<{
    score: number;
    triple_id: string;
    subject: string;
    predicate: string;
    object: string;
    subject_id: string;
    object_id: string;
  }>;
}

export async function searchTriples(
  adapter: Adapter,
  args: { query: string; limit?: number }
): Promise<SearchTriplesResult> {
  const query = (args.query || '').trim();
  if (!query) return { count: 0, items: [] };

  const limit = Math.max(1, Math.min(args.limit ?? 20, 100));
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  if (terms.length === 0) return { count: 0, items: [] };

  const likeConditions = terms.map(() =>
    '(lower(s.name) LIKE ? OR lower(t.predicate) LIKE ? OR lower(o.name) LIKE ?)'
  ).join(' OR ');
  const likeParams: string[] = [];
  for (const term of terms) {
    const pattern = `%${term}%`;
    likeParams.push(pattern, pattern, pattern);
  }

  const rows = await adapter.all<{
    id: string; subject_id: string; predicate: string; object_id: string;
    subject_name: string; object_name: string;
  }>(
    `SELECT t.id, t.subject_id, t.predicate, t.object_id,
            s.name AS subject_name, o.name AS object_name
       FROM kg_triples t
       JOIN kg_entities s ON s.id = t.subject_id
       JOIN kg_entities o ON o.id = t.object_id
      WHERE t.valid_to IS NULL
        AND (${likeConditions})
      LIMIT 500`,
    likeParams
  );

  const scored = rows.map(row => {
    const haystack = `${row.subject_name} ${row.predicate} ${row.object_name}`.toLowerCase();
    let matchCount = 0;
    for (const term of terms) {
      if (haystack.includes(term)) matchCount++;
    }
    return { ...row, matchCount };
  }).filter(r => r.matchCount > 0);

  scored.sort((a, b) => b.matchCount - a.matchCount);

  const maxScore = scored.length > 0 ? scored[0].matchCount : 1;
  const items = scored.slice(0, limit).map(r => ({
    score: Number((r.matchCount / Math.max(maxScore, 1)).toFixed(3)),
    triple_id: r.id,
    subject: r.subject_name,
    predicate: r.predicate,
    object: r.object_name,
    subject_id: r.subject_id,
    object_id: r.object_id
  }));

  return { count: items.length, items };
}
