import crypto from 'node:crypto';
import { nowIso, cleanString, stableJson } from '../utils.js';
import type {
  Adapter, AddEntityInput, AddEntityResult, AddTripleInput, AddTripleResult,
  InvalidateTripleResult, QueryRelationshipsResult, KgTripleWithNames, KgTriple,
  KgEntityWithRelations, KgStats, DeleteEntityResult
} from '../types.js';

function toSlug(name: string): string {
  return cleanString(name, 200)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

// Functional predicates: entities can have exactly one valid object at a time.
// Adding a triple with a different object flags the existing one as a contradiction.
// Multi-valued predicates (explores, uses, depends_on, mentioned_by, co_occurs_with, etc.)
// are the default -- they skip the contradiction query entirely.
//
// VERIFIED against src/services/memory/ingest/ingest.ts buildTriples():
//   ingestion emits `mentioned_by` and `co_occurs_with` -- neither appears below,
//   so conversation ingestion never triggers false-positive contradictions.
//
// Users can override via the kg_predicate_cardinality table (see migration v11).
const FUNCTIONAL_PREDICATES: Set<string> = new Set([
  'status_is',
  'version_is',
  'owned_by',
  'located_at',
  'assigned_to',
  'current_state',
  'has_type',
  'parent_of',
  'rooted_at',
  'primary_language',
  'license_is',
  'created_by'
]);

// Per-process cache: DB overrides win, then hardcoded set, then 'multi' fallback.
// Cleared only on process restart. Bounded by the user's predicate vocabulary.
const cardinalityCache: Map<string, 'functional' | 'multi'> = new Map();

interface CardinalityRow {
  cardinality: string;
}

async function isPredicateFunctional(adapter: Adapter, predicate: string): Promise<boolean> {
  const cached = cardinalityCache.get(predicate);
  if (cached !== undefined) {
    return cached === 'functional';
  }
  // Check DB override table first (populated only if users add explicit rows)
  const row = await adapter.get<CardinalityRow>(
    'SELECT cardinality FROM kg_predicate_cardinality WHERE predicate = ?',
    [predicate]
  );
  if (row) {
    const value: 'functional' | 'multi' = row.cardinality === 'functional' ? 'functional' : 'multi';
    cardinalityCache.set(predicate, value);
    return value === 'functional';
  }
  // Fall back to hardcoded set. Unknown predicates default to 'multi' (permissive).
  const isFunctional = FUNCTIONAL_PREDICATES.has(predicate);
  cardinalityCache.set(predicate, isFunctional ? 'functional' : 'multi');
  return isFunctional;
}

export async function addEntity(adapter: Adapter, { name, type, properties, memoryId }: AddEntityInput = {} as AddEntityInput): Promise<AddEntityResult> {
  const cleanName = cleanString(name, 400);
  if (!cleanName) throw new Error('entity name is required');

  const id = toSlug(cleanName);
  if (!id) throw new Error('entity name must produce a valid slug');

  const entityType = cleanString(type, 100) || 'concept';
  const props = properties || {};
  const memId = memoryId || null;
  const now = nowIso();

  const result = await adapter.run(
    `INSERT OR IGNORE INTO kg_entities (id, name, entity_type, properties_json, memory_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, cleanName, entityType, stableJson(props), memId, now, now]
  );

  const created = (result?.changes ?? 0) > 0;

  if (!created) {
    await adapter.run(
      'UPDATE kg_entities SET updated_at = ? WHERE id = ?',
      [now, id]
    );
  }

  return {
    id,
    name: cleanName,
    entity_type: entityType,
    properties_json: stableJson(props),
    memory_id: memId,
    created_at: now,
    updated_at: now,
    created
  };
}

export async function ensureEntity(adapter: Adapter, name: string, type = 'concept'): Promise<string> {
  const cleanName = cleanString(name, 400);
  if (!cleanName) throw new Error('entity name is required');

  const id = toSlug(cleanName);
  if (!id) throw new Error('entity name must produce a valid slug');

  const entityType = cleanString(type, 100) || 'concept';
  const now = nowIso();

  await adapter.run(
    `INSERT OR IGNORE INTO kg_entities (id, name, entity_type, properties_json, memory_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, cleanName, entityType, stableJson({}), null, now, now]
  );

  return id;
}

interface KgEntityRow {
  id: string;
  name: string;
  entity_type: string;
  properties_json: string;
  memory_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function getEntity(adapter: Adapter, entityId: string): Promise<KgEntityWithRelations | null> {
  const id = cleanString(entityId, 400);
  if (!id) throw new Error('entityId is required');

  const entity = await adapter.get<KgEntityRow>('SELECT * FROM kg_entities WHERE id = ?', [id]);
  if (!entity) return null;

  const outgoing = await adapter.all<KgTriple>(
    'SELECT * FROM kg_triples WHERE subject_id = ? AND valid_to IS NULL',
    [id]
  );

  const incoming = await adapter.all<KgTriple>(
    'SELECT * FROM kg_triples WHERE object_id = ? AND valid_to IS NULL',
    [id]
  );

  return {
    ...entity,
    properties: JSON.parse(entity.properties_json || '{}'),
    outgoing,
    incoming
  };
}

export async function addTriple(adapter: Adapter, {
  subjectId, subjectName,
  predicate,
  objectId, objectName,
  validFrom, validTo, confidence,
  sourceMemoryId, sourceType
}: AddTripleInput = {} as AddTripleInput): Promise<AddTripleResult> {
  let subId = cleanString(subjectId, 400);
  const pred = cleanString(predicate, 400);
  let objId = cleanString(objectId, 400);

  if (!subId && !subjectName) throw new Error('subject is required (provide subjectId or subjectName)');
  if (!pred) throw new Error('predicate is required');
  if (!objId && !objectName) throw new Error('object is required (provide objectId or objectName)');

  const id = `triple_${crypto.randomUUID()}`;
  const vFrom = validFrom === null ? null : (validFrom ?? nowIso());
  const vTo = validTo || null;
  let conf = confidence !== undefined && confidence !== null ? Number(confidence) : 1.0;
  if (!Number.isFinite(conf)) conf = 1.0;
  conf = Math.max(0.0, Math.min(1.0, conf));
  const srcMemId = sourceMemoryId || null;
  const srcType = cleanString(sourceType, 100) || 'manual';
  const now = nowIso();

  interface ConflictRow {
    id: string;
    object_id: string;
    object_name: string;
  }

  const result = await adapter.transaction(async (ad) => {
    if (!subId && subjectName) {
      subId = await ensureEntity(ad, subjectName);
    }
    if (!objId && objectName) {
      objId = await ensureEntity(ad, objectName);
    }

    // Contradiction detection: only run for FUNCTIONAL predicates (entity can have
    // exactly one valid object at a time). Multi-valued predicates (explores, uses,
    // mentioned_by, co_occurs_with, etc.) permit multiple concurrent objects --
    // running this query for them produced false positives (see task 260409-ohq).
    let conflicting: ConflictRow[] = [];
    if (await isPredicateFunctional(ad, pred)) {
      conflicting = await ad.all<ConflictRow>(
        `SELECT t.id, t.object_id, e.name AS object_name
           FROM kg_triples t
           JOIN kg_entities e ON e.id = t.object_id
          WHERE t.subject_id = ?
            AND t.predicate = ?
            AND t.object_id != ?
            AND t.valid_to IS NULL`,
        [subId, pred, objId]
      );
    }

    await ad.run(
      `INSERT INTO kg_triples (id, subject_id, predicate, object_id, valid_from, valid_to, confidence, source_memory_id, source_type, created_at, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, subId, pred, objId, vFrom, vTo, conf, srcMemId, srcType, now, now]
    );

    const contradictions = conflicting.map(c => ({
      existing_triple_id: c.id,
      existing_object_id: c.object_id,
      existing_object_name: c.object_name
    }));

    return {
      id,
      subject_id: subId,
      predicate: pred,
      object_id: objId,
      valid_from: vFrom,
      valid_to: vTo,
      confidence: conf,
      source_memory_id: srcMemId,
      source_type: srcType,
      created_at: now,
      recorded_at: now,
      contradictions,
      has_contradiction: contradictions.length > 0
    };
  });

  return result;
}

export async function invalidateTriple(adapter: Adapter, tripleId: string, validTo?: string): Promise<InvalidateTripleResult> {
  const id = cleanString(tripleId, 400);
  if (!id) throw new Error('tripleId is required');

  const vTo = validTo || nowIso();

  const result = await adapter.run(
    'UPDATE kg_triples SET valid_to = ? WHERE id = ? AND valid_to IS NULL',
    [vTo, id]
  );

  return {
    id,
    valid_to: vTo,
    invalidated: (result?.changes ?? 0) > 0
  };
}

export async function queryEntityRelationships(
  adapter: Adapter,
  entityId: string,
  { direction, includeInvalid }: { direction?: string; includeInvalid?: boolean } = {}
): Promise<QueryRelationshipsResult> {
  const id = cleanString(entityId, 400);
  if (!id) throw new Error('entityId is required');

  const dir = direction || 'both';
  const showInvalid = includeInvalid || false;
  const validClause = showInvalid ? '' : 'AND t.valid_to IS NULL';

  let results: KgTripleWithNames[];

  if (dir === 'outgoing') {
    results = await adapter.all<KgTripleWithNames>(
      `SELECT t.*, s.name AS subject_name, o.name AS object_name
         FROM kg_triples t
         JOIN kg_entities s ON s.id = t.subject_id
         JOIN kg_entities o ON o.id = t.object_id
        WHERE t.subject_id = ? ${validClause}
        ORDER BY t.created_at DESC`,
      [id]
    );
  } else if (dir === 'incoming') {
    results = await adapter.all<KgTripleWithNames>(
      `SELECT t.*, s.name AS subject_name, o.name AS object_name
         FROM kg_triples t
         JOIN kg_entities s ON s.id = t.subject_id
         JOIN kg_entities o ON o.id = t.object_id
        WHERE t.object_id = ? ${validClause}
        ORDER BY t.created_at DESC`,
      [id]
    );
  } else {
    const outgoing = await adapter.all<KgTripleWithNames>(
      `SELECT t.*, s.name AS subject_name, o.name AS object_name
         FROM kg_triples t
         JOIN kg_entities s ON s.id = t.subject_id
         JOIN kg_entities o ON o.id = t.object_id
        WHERE t.subject_id = ? ${validClause}
        ORDER BY t.created_at DESC`,
      [id]
    );
    const incoming = await adapter.all<KgTripleWithNames>(
      `SELECT t.*, s.name AS subject_name, o.name AS object_name
         FROM kg_triples t
         JOIN kg_entities s ON s.id = t.subject_id
         JOIN kg_entities o ON o.id = t.object_id
        WHERE t.object_id = ? ${validClause}
        ORDER BY t.created_at DESC`,
      [id]
    );

    const seen = new Set<string>();
    results = [];
    for (const row of [...outgoing, ...incoming]) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        results.push(row);
      }
    }
  }

  return {
    entity_id: id,
    direction: dir,
    count: results.length,
    triples: results
  };
}

export async function queryTriplesAsOf(
  adapter: Adapter,
  entityId: string,
  asOfDate: string,
  mode: 'event' | 'transaction' = 'event'
): Promise<{ entity_id: string; as_of: string; mode: 'event' | 'transaction'; count: number; triples: KgTripleWithNames[] }> {
  const id = cleanString(entityId, 400);
  if (!id) throw new Error('entityId is required');
  if (!asOfDate) throw new Error('asOfDate is required');

  // When the caller passes a date-only string like "2026-04-10", treat it as
  // end-of-day so that triples created at any time during that day are included.
  const resolvedDate = !asOfDate.includes('T') ? `${asOfDate}T23:59:59.999Z` : asOfDate;

  let triples: KgTripleWithNames[];
  if (mode === 'transaction') {
    // Transaction-time: return every triple Synapse knew at the given
    // time, regardless of whether the fact was true in the world. No
    // valid_to interaction — recorded_at is the row's permanent original
    // transaction time, never touched by invalidateTriple.
    triples = await adapter.all<KgTripleWithNames>(
      `SELECT t.*, s.name AS subject_name, o.name AS object_name
         FROM kg_triples t
         JOIN kg_entities s ON s.id = t.subject_id
         JOIN kg_entities o ON o.id = t.object_id
        WHERE (t.subject_id = ? OR t.object_id = ?)
          AND t.recorded_at <= ?
        ORDER BY t.recorded_at ASC`,
      [id, id, resolvedDate]
    );
  } else {
    // Event-time (default): byte-identical to the pre-Phase-42 behavior so
    // the existing BATCH-06 queryTriplesAsOf test keeps passing unchanged.
    triples = await adapter.all<KgTripleWithNames>(
      `SELECT t.*, s.name AS subject_name, o.name AS object_name
         FROM kg_triples t
         JOIN kg_entities s ON s.id = t.subject_id
         JOIN kg_entities o ON o.id = t.object_id
        WHERE (t.subject_id = ? OR t.object_id = ?)
          AND (t.valid_from IS NULL OR t.valid_from <= ?)
          AND (t.valid_to IS NULL OR t.valid_to > ?)
        ORDER BY t.valid_from ASC`,
      [id, id, resolvedDate, resolvedDate]
    );
  }

  return {
    entity_id: id,
    as_of: asOfDate,
    mode,
    count: triples.length,
    triples
  };
}

export async function getEntityTimeline(
  adapter: Adapter,
  entityId: string
): Promise<{ entity_id: string; count: number; triples: KgTripleWithNames[] }> {
  const id = cleanString(entityId, 400);
  if (!id) throw new Error('entityId is required');

  const triples = await adapter.all<KgTripleWithNames>(
    `SELECT t.*, s.name AS subject_name, o.name AS object_name
       FROM kg_triples t
       JOIN kg_entities s ON s.id = t.subject_id
       JOIN kg_entities o ON o.id = t.object_id
      WHERE t.subject_id = ? OR t.object_id = ?
      ORDER BY t.valid_from ASC, t.recorded_at ASC`,
    [id, id]
  );

  return {
    entity_id: id,
    count: triples.length,
    triples
  };
}

export async function getKgStats(adapter: Adapter): Promise<KgStats> {
  const entityCount = await adapter.get<{ count: number }>(
    'SELECT COUNT(*) AS count FROM kg_entities'
  );

  const tripleCount = await adapter.get<{ count: number }>(
    'SELECT COUNT(*) AS count FROM kg_triples'
  );

  const activeTripleCount = await adapter.get<{ count: number }>(
    'SELECT COUNT(*) AS count FROM kg_triples WHERE valid_to IS NULL'
  );

  const byPredicate = await adapter.all<{ predicate: string; count: number }>(
    `SELECT predicate, COUNT(*) AS count
       FROM kg_triples
      WHERE valid_to IS NULL
      GROUP BY predicate
      ORDER BY count DESC`
  );

  return {
    entities: entityCount?.count ?? 0,
    triples: tripleCount?.count ?? 0,
    active_triples: activeTripleCount?.count ?? 0,
    by_predicate: byPredicate
  };
}

export async function deleteEntity(adapter: Adapter, entityId: string): Promise<DeleteEntityResult> {
  const id = cleanString(entityId, 400);
  if (!id) throw new Error('entityId is required');

  return adapter.transaction(async (ad) => {
    const tripleResult = await ad.run(
      'DELETE FROM kg_triples WHERE subject_id = ? OR object_id = ?',
      [id, id]
    );
    const triplesRemoved = tripleResult?.changes ?? 0;

    const entityResult = await ad.run(
      'DELETE FROM kg_entities WHERE id = ?',
      [id]
    );
    const deleted = (entityResult?.changes ?? 0) > 0;

    return {
      deleted,
      entity_id: id,
      triples_removed: triplesRemoved
    };
  });
}

export { toSlug as normalizeEntityId };
