import { extractEntities } from '../ingest/entity-extractor.js';
import { ensureEntity, addTriple, normalizeEntityId } from './kg.js';
import type { Adapter, AutoLinkedEntity, AutoLinkedTriple, AutoLinkResult, BackfillResult } from '../types.js';

const EMPTY_RESULT: AutoLinkResult = { auto_linked_entities: [], auto_triples: [] };
const MAX_LINKED_ENTITIES = 20;

/**
 * Extract entities from memory content and create KG triples linking
 * the memory to any entities that already exist in the KG.
 *
 * Non-blocking: any error returns an empty result rather than throwing.
 */
export async function extractAndLink(
  adapter: Adapter,
  memoryId: string,
  content: string
): Promise<AutoLinkResult> {
  try {
    return await _extractAndLinkInner(adapter, memoryId, content);
  } catch {
    return EMPTY_RESULT;
  }
}

async function _extractAndLinkInner(
  adapter: Adapter,
  memoryId: string,
  content: string
): Promise<AutoLinkResult> {
  if (!content || !memoryId) return EMPTY_RESULT;

  const candidates = extractEntities(content);
  if (candidates.length === 0) return EMPTY_RESULT;

  const linked: AutoLinkedEntity[] = [];
  const triples: AutoLinkedTriple[] = [];

  // Ensure the memory itself exists as a KG entity
  const memoryEntityId = await ensureEntity(adapter, memoryId, 'memory');

  for (const candidate of candidates) {
    if (linked.length >= MAX_LINKED_ENTITIES) break;

    const entityId = normalizeEntityId(candidate.name);
    if (!entityId) continue;

    // Only link to entities that already exist in the KG
    const existing = await adapter.get<{ id: string; name: string; entity_type: string }>(
      'SELECT id, name, entity_type FROM kg_entities WHERE id = ?',
      [entityId]
    );
    if (!existing) continue;

    linked.push({
      entity_id: existing.id,
      name: existing.name,
      entity_type: existing.entity_type
    });

    // Create triple: entity --[mentioned_in]--> memory
    try {
      const tripleResult = await addTriple(adapter, {
        subjectId: existing.id,
        predicate: 'mentioned_in',
        objectId: memoryEntityId,
        sourceMemoryId: memoryId,
        sourceType: 'auto_link',
        confidence: 0.7
      });
      triples.push({
        triple_id: tripleResult.id,
        subject: existing.name,
        predicate: 'mentioned_in',
        object: memoryId
      });
    } catch {
      // Non-fatal: skip individual triple failures
    }
  }

  return { auto_linked_entities: linked, auto_triples: triples };
}

/**
 * Backfill: scan existing memories and link them to matching KG entities.
 * Processes memories in batches to avoid memory pressure.
 * Returns summary of what was linked.
 */
export async function backfillMemoryKgLinks(
  adapter: Adapter,
  opts: { limit?: number; offset?: number; nest?: string; branch?: string } = {}
): Promise<BackfillResult> {
  const batchLimit = Math.min(opts.limit || 200, 500);
  const offset = opts.offset || 0;
  const filters: string[] = ["status = 'active'"];
  const params: unknown[] = [];

  if (opts.nest) {
    filters.push('nest = ?');
    params.push(opts.nest);
  }
  if (opts.branch) {
    filters.push('branch = ?');
    params.push(opts.branch);
  }

  const rows = await adapter.all<{ id: string; content: string }>(
    `SELECT id, content FROM memory_entries
     WHERE ${filters.join(' AND ')}
     ORDER BY created_at ASC
     LIMIT ? OFFSET ?`,
    [...params, batchLimit, offset]
  );

  const result: BackfillResult = {
    memories_scanned: rows.length,
    memories_linked: 0,
    triples_created: 0,
    errors: 0
  };

  for (const row of rows) {
    try {
      const linkResult = await extractAndLink(adapter, row.id, row.content);
      if (linkResult.auto_triples.length > 0) {
        result.memories_linked++;
        result.triples_created += linkResult.auto_triples.length;
      }
    } catch {
      result.errors++;
    }
  }

  return result;
}
