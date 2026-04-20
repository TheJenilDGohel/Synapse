import { cosineSimilarity } from '../../retrieval/core/relevance.js';
import { nowIso, splitTerms, scoreTokenOverlap, deserializeEntry } from '../utils.js';
import type {
  Adapter, MemoryEntryRow, SuggestRelationsResult, RelationSuggestion,
  AddRelationResult, RemoveRelationResult, GetRelatedResult, RelatedItem, MemoryEntry
} from '../types.js';

interface CandidateRow {
  id: string;
  title: string;
  summary: string;
  embedding_json: string | null;
}

interface SourceRow extends MemoryEntryRow {
  embedding_json: string | null;
}

interface RelatedRow extends MemoryEntryRow {
  relation_type: string;
  direction: string;
}

export async function suggestRelations(
  adapter: Adapter,
  memoryId: string,
  { threshold = 0.55, maxResults = 10 }: { threshold?: number; maxResults?: number } = {}
): Promise<SuggestRelationsResult> {
  const id = String(memoryId || '').trim();
  if (!id) throw new Error('id is required');

  const source = await adapter.get<SourceRow>('SELECT * FROM memory_entries WHERE id = ?', [id]);
  if (!source) throw new Error(`memory not found: ${id}`);

  let sourceEmbedding: number[] | null = null;
  if (source.embedding_json) {
    try { sourceEmbedding = JSON.parse(source.embedding_json) as number[]; } catch {
      // Invalid embedding payloads fall back to token overlap scoring.
    }
  }

  const linked = await adapter.all<{ other_id: string }>(
    `SELECT target_id AS other_id FROM memory_relations WHERE source_id = ?
     UNION SELECT source_id AS other_id FROM memory_relations WHERE target_id = ?`,
    [id, id]
  );
  const linkedSet = new Set(linked.map((r) => r.other_id));
  linkedSet.add(id);

  const candidates = await adapter.all<CandidateRow>(
    `SELECT id, title, summary, embedding_json
       FROM memory_entries
      WHERE id != ? AND status = 'active'
      ORDER BY importance DESC, updated_at DESC
      LIMIT 200`,
    [id]
  );

  // Pre-filter candidates: remove already-linked entries up-front
  const eligible = candidates.filter(row => !linkedSet.has(row.id));

  const scored: RelationSuggestion[] = [];

  if (sourceEmbedding) {
    // Batch-parse all embeddings once, then score in a single pass
    const parsed: Array<{ id: string; title: string; emb: number[] }> = [];
    for (const row of eligible) {
      if (!row.embedding_json) continue;
      try {
        parsed.push({ id: row.id, title: row.title, emb: JSON.parse(row.embedding_json) as number[] });
      } catch {
        // Skip malformed embedding payloads
      }
    }
    for (const { id: rowId, title, emb } of parsed) {
      if (!Array.isArray(emb) || emb.length === 0) continue;
      const cosine = cosineSimilarity(sourceEmbedding, emb);
      const score = (cosine + 1) / 2;
      if (score >= threshold) {
        scored.push({ memory_id: rowId, title, similarity: Number(score.toFixed(3)) });
      }
    }
  } else {
    const sourceTerms = splitTerms(`${source.title} ${source.summary}`);
    for (const row of eligible) {
      const rowTerms = splitTerms(`${row.title} ${row.summary}`);
      const score = scoreTokenOverlap(sourceTerms, rowTerms);
      if (score >= threshold) {
        scored.push({ memory_id: row.id, title: row.title, similarity: Number(score.toFixed(3)) });
      }
    }
  }

  scored.sort((a, b) => b.similarity - a.similarity);
  return {
    id,
    source_title: source.title,
    count: scored.length,
    threshold,
    using_embeddings: sourceEmbedding !== null,
    suggestions: scored.slice(0, maxResults)
  };
}

export async function addRelation(
  adapter: Adapter,
  sourceId: string,
  targetId: string,
  relationType = 'related'
): Promise<AddRelationResult> {
  const src = String(sourceId || '').trim();
  const tgt = String(targetId || '').trim();
  const rel = String(relationType || 'related').trim().slice(0, 60) || 'related';

  if (!src) throw new Error('source_id is required');
  if (!tgt) throw new Error('target_id is required');
  if (src === tgt) throw new Error('source_id and target_id must differ');

  const srcExists = await adapter.get<{ id: string }>('SELECT id FROM memory_entries WHERE id = ?', [src]);
  if (!srcExists) throw new Error(`memory not found: ${src}`);
  const tgtExists = await adapter.get<{ id: string }>('SELECT id FROM memory_entries WHERE id = ?', [tgt]);
  if (!tgtExists) throw new Error(`memory not found: ${tgt}`);

  await adapter.run(
    'INSERT OR IGNORE INTO memory_relations(source_id, target_id, relation_type, created_at) VALUES (?, ?, ?, ?)',
    [src, tgt, rel, nowIso()]
  );
  return { source_id: src, target_id: tgt, relation_type: rel };
}

export async function removeRelation(adapter: Adapter, sourceId: string, targetId: string): Promise<RemoveRelationResult> {
  const src = String(sourceId || '').trim();
  const tgt = String(targetId || '').trim();
  if (!src) throw new Error('source_id is required');
  if (!tgt) throw new Error('target_id is required');

  const result = await adapter.run(
    'DELETE FROM memory_relations WHERE source_id = ? AND target_id = ?',
    [src, tgt]
  );
  return { removed: (result?.changes || 0) > 0, source_id: src, target_id: tgt };
}

export async function getRelated(adapter: Adapter, memoryId: string): Promise<GetRelatedResult> {
  const id = String(memoryId || '').trim();
  if (!id) throw new Error('id is required');

  const outgoing = await adapter.all<RelatedRow>(
    `SELECT e.*, mr.relation_type, 'outgoing' AS direction
       FROM memory_relations mr
       JOIN memory_entries e ON e.id = mr.target_id
      WHERE mr.source_id = ?`,
    [id]
  );
  const incoming = await adapter.all<RelatedRow>(
    `SELECT e.*, mr.relation_type, 'incoming' AS direction
       FROM memory_relations mr
       JOIN memory_entries e ON e.id = mr.source_id
      WHERE mr.target_id = ?`,
    [id]
  );

  const seen = new Set<string>();
  const related: RelatedItem[] = [];
  for (const row of [...outgoing, ...incoming]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    related.push({
      relation_type: row.relation_type,
      direction: row.direction,
      memory: deserializeEntry(row)
    });
  }

  return { id, count: related.length, related };
}
