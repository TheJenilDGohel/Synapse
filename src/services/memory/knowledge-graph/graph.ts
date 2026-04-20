import { cleanString, clampInt } from '../utils.js';
import type { Adapter, TraverseGraphOpts, TraverseGraphResult, DiscoverBridgesOpts, DiscoverBridgesResult, BridgeEntry } from '../types.js';

interface TraversalRow {
  entity_id: string;
  depth: number;
  path: string;
  name: string;
  entity_type: string;
}

interface BridgeRow {
  triple_id: string;
  subject_id: string;
  subject_name: string;
  predicate: string;
  object_id: string;
  object_name: string;
  subject_nest: string;
  object_nest: string;
  subject_type: string;
  object_type: string;
  subject_branch: string;
  object_branch: string;
}

export async function traverseGraph(
  adapter: Adapter,
  { startEntityId, maxHops, direction }: TraverseGraphOpts
): Promise<TraverseGraphResult> {
  const start = cleanString(startEntityId, 400);
  if (!start) throw new Error('startEntityId is required');

  const hops = clampInt(maxHops, 2, 1, 5);
  const dir = (['outgoing', 'incoming', 'both'] as const).includes(direction as 'outgoing' | 'incoming' | 'both') ? direction! : 'both';

  let sql: string;
  const params: unknown[] = [start, start, hops, start];

  if (dir === 'outgoing') {
    sql = `
      WITH RECURSIVE reachable(entity_id, depth, path) AS (
        SELECT ?, 0, ?
        UNION ALL
        SELECT
          t.object_id,
          r.depth + 1,
          r.path || ',' || t.object_id
        FROM kg_triples t
        JOIN reachable r ON t.subject_id = r.entity_id
        WHERE r.depth < ?
          AND t.valid_to IS NULL
          AND INSTR(',' || r.path || ',', ',' || t.object_id || ',') = 0
      )
      SELECT DISTINCT r.entity_id, r.depth, r.path,
             e.name, e.entity_type
      FROM reachable r
      JOIN kg_entities e ON e.id = r.entity_id
      WHERE r.entity_id != ?
      ORDER BY r.depth ASC, e.name ASC`;
  } else if (dir === 'incoming') {
    sql = `
      WITH RECURSIVE reachable(entity_id, depth, path) AS (
        SELECT ?, 0, ?
        UNION ALL
        SELECT
          t.subject_id,
          r.depth + 1,
          r.path || ',' || t.subject_id
        FROM kg_triples t
        JOIN reachable r ON t.object_id = r.entity_id
        WHERE r.depth < ?
          AND t.valid_to IS NULL
          AND INSTR(',' || r.path || ',', ',' || t.subject_id || ',') = 0
      )
      SELECT DISTINCT r.entity_id, r.depth, r.path,
             e.name, e.entity_type
      FROM reachable r
      JOIN kg_entities e ON e.id = r.entity_id
      WHERE r.entity_id != ?
      ORDER BY r.depth ASC, e.name ASC`;
  } else {
    sql = `
      WITH RECURSIVE reachable(entity_id, depth, path) AS (
        SELECT ?, 0, ?
        UNION ALL
        SELECT
          CASE WHEN t.subject_id = r.entity_id THEN t.object_id ELSE t.subject_id END,
          r.depth + 1,
          r.path || ',' || CASE WHEN t.subject_id = r.entity_id THEN t.object_id ELSE t.subject_id END
        FROM kg_triples t
        JOIN reachable r ON (t.subject_id = r.entity_id OR t.object_id = r.entity_id)
        WHERE r.depth < ?
          AND t.valid_to IS NULL
          AND INSTR(
            ',' || r.path || ',',
            ',' || CASE WHEN t.subject_id = r.entity_id THEN t.object_id ELSE t.subject_id END || ','
          ) = 0
      )
      SELECT DISTINCT r.entity_id, r.depth, r.path,
             e.name, e.entity_type
      FROM reachable r
      JOIN kg_entities e ON e.id = r.entity_id
      WHERE r.entity_id != ?
      ORDER BY r.depth ASC, e.name ASC`;
  }

  const rows = await adapter.all<TraversalRow>(sql, params);

  return {
    start_entity_id: start,
    max_hops: hops,
    direction: dir,
    discovered_count: rows.length,
    entities: rows.map(row => ({
      entity_id: row.entity_id,
      name: row.name,
      entity_type: row.entity_type,
      depth: row.depth,
      path: row.path.split(',').filter(Boolean)
    }))
  };
}

export async function discoverBridges(adapter: Adapter, { nest, mode }: DiscoverBridgesOpts = {}): Promise<DiscoverBridgesResult> {
  const cleanNest = nest ? cleanString(nest, 200) : null;
  const isCrossBranch = mode === 'cross-branch' && !!cleanNest;

  // Use LEFT JOINs so entities with NULL memory_id still participate.
  // Derive nest/branch via COALESCE: entity's own memory_id -> triple's source_memory_id.
  let sql = `
    SELECT * FROM (
      SELECT DISTINCT
        t.id AS triple_id,
        t.subject_id,
        s.name AS subject_name,
        s.entity_type AS subject_type,
        t.predicate,
        t.object_id,
        o.name AS object_name,
        o.entity_type AS object_type,
        COALESCE(NULLIF(ms1.nest,''), NULLIF(mt.nest,'')) AS subject_nest,
        COALESCE(NULLIF(mo1.nest,''), NULLIF(mt.nest,'')) AS object_nest,
        COALESCE(NULLIF(ms1.branch,''), NULLIF(mt.branch,'')) AS subject_branch,
        COALESCE(NULLIF(mo1.branch,''), NULLIF(mt.branch,'')) AS object_branch
      FROM kg_triples t
      JOIN kg_entities s ON s.id = t.subject_id
      JOIN kg_entities o ON o.id = t.object_id
      LEFT JOIN memory_entries ms1 ON ms1.id = s.memory_id
      LEFT JOIN memory_entries mo1 ON mo1.id = o.memory_id
      LEFT JOIN memory_entries mt  ON mt.id  = t.source_memory_id
      WHERE t.valid_to IS NULL
    ) AS bridges`;

  const params: unknown[] = [];

  if (isCrossBranch) {
    // Cross-branch mode: find bridges across branches within the specified nest
    sql += `
    WHERE subject_nest = ? AND object_nest = ?
      AND subject_branch != '' AND subject_branch IS NOT NULL
      AND object_branch  != '' AND object_branch  IS NOT NULL
      AND subject_branch != object_branch`;
    params.push(cleanNest, cleanNest);
  } else {
    // Default cross-nest mode
    sql += `
    WHERE subject_nest != '' AND subject_nest IS NOT NULL
      AND object_nest  != '' AND object_nest  IS NOT NULL
      AND subject_nest != object_nest`;

    if (cleanNest) {
      sql += `\n      AND (subject_nest = ? OR object_nest = ?)`;
      params.push(cleanNest, cleanNest);
    }
  }

  sql += `\n    ORDER BY subject_nest, object_nest, subject_name`;

  const rows = await adapter.all<BridgeRow>(sql, params);

  // --- Build insights from entity -> scope mapping ---
  const scopeLabel = isCrossBranch ? 'branch' : 'nest';
  const entityScopes = new Map<string, { name: string; type: string; scopes: Set<string>; predicates: Set<string> }>();

  for (const row of rows) {
    const bothScopes = isCrossBranch
      ? [row.subject_branch, row.object_branch]
      : [row.subject_nest, row.object_nest];
    for (const [id, name, type] of [
      [row.subject_id, row.subject_name, row.subject_type],
      [row.object_id, row.object_name, row.object_type]
    ] as [string, string, string][]) {
      let entry = entityScopes.get(id);
      if (!entry) {
        entry = { name, type, scopes: new Set(), predicates: new Set() };
        entityScopes.set(id, entry);
      }
      for (const s of bothScopes) entry.scopes.add(s);
      entry.predicates.add(row.predicate);
    }
  }

  const insights: string[] = [];
  for (const [, info] of entityScopes) {
    if (info.scopes.size >= 2) {
      const scopeList = [...info.scopes].sort().join(', ');
      const predList = [...info.predicates].sort().join(', ');
      insights.push(`'${info.name}' (${info.type}) bridges ${scopeLabel}es ${scopeList} via '${predList}'`);
    }
  }

  // --- Summary ---
  const scopePairs = new Set<string>();
  for (const row of rows) {
    const a = isCrossBranch ? row.subject_branch : row.subject_nest;
    const b = isCrossBranch ? row.object_branch : row.object_nest;
    scopePairs.add([a, b].sort().join('<->'));
  }
  const sharedCount = [...entityScopes.values()].filter(e => e.scopes.size >= 2).length;
  const noResultsMsg = isCrossBranch
    ? `No cross-branch bridges found within nest '${cleanNest}'`
    : 'No cross-nest bridges found';
  const foundMsg = isCrossBranch
    ? `Found ${rows.length} bridge(s) across ${scopePairs.size} branch pair(s) in nest '${cleanNest}' involving ${sharedCount} shared entity/entities`
    : `Found ${rows.length} bridge(s) across ${scopePairs.size} nest pair(s) involving ${sharedCount} shared entity/entities`;
  const summary = rows.length === 0 ? noResultsMsg : foundMsg;

  return {
    filter_nest: cleanNest,
    bridge_count: rows.length,
    bridges: rows.map((row): BridgeEntry => ({
      triple_id: row.triple_id,
      subject_id: row.subject_id,
      subject_name: row.subject_name,
      predicate: row.predicate,
      object_id: row.object_id,
      object_name: row.object_name,
      subject_nest: row.subject_nest,
      object_nest: row.object_nest,
      subject_type: row.subject_type,
      object_type: row.object_type,
      subject_branch: row.subject_branch,
      object_branch: row.object_branch
    })),
    insights,
    summary
  };
}
