/**
 * Self-Audit Dashboard (Phase 38)
 *
 * Single `runAudit(adapter)` function that queries memory_entries, kg_entities,
 * and kg_triples to produce a comprehensive health report covering:
 *   AUDIT-01: Memory coverage by project
 *   AUDIT-02: KG density metrics
 *   AUDIT-03: Unpopulated nests and broken bridges
 *   AUDIT-04: Stale memories
 */

import type { Adapter } from '../types.js';
import type {
  AuditResult,
  AuditProjectCoverage,
  AuditKgDensity,
  AuditNestHealth,
  AuditStaleMemories,
  AuditStaleMemoryItem,
  AuditSuggestion
} from '../types.js';

// ---------------------------------------------------------------------------
// Row shapes returned by SQL queries
// ---------------------------------------------------------------------------

interface ProjectCountRow {
  scope_project_path: string;
  count: number;
}

interface CountRow {
  count: number;
}

interface OrphanRow {
  id: string;
  name: string;
  entity_type: string;
}

interface DuplicateTripleRow {
  subject_id: string;
  predicate: string;
  object_id: string;
  dup_count: number;
}

interface StaleRow {
  id: string;
  title: string;
  importance: number;
  recall_count: number;
  created_at: string;
  last_recalled_at: string | null;
}

interface BrokenBridgeRow {
  triple_id: string;
  subject_id: string;
  object_id: string;
  predicate: string;
  issue: string;
}

// ---------------------------------------------------------------------------
// AUDIT-01: Memory coverage by project
// ---------------------------------------------------------------------------

async function auditProjectCoverage(adapter: Adapter): Promise<AuditProjectCoverage> {
  const rows = await adapter.all<ProjectCountRow>(
    `SELECT scope_project_path, COUNT(*) AS count
     FROM memory_entries
     GROUP BY scope_project_path
     ORDER BY count DESC`
  );

  const projects = rows.map(r => ({
    project_path: r.scope_project_path || '(unscoped)',
    memory_count: r.count
  }));

  const withMemories = projects.filter(p => p.memory_count > 0).length;
  const totalMemories = projects.reduce((sum, p) => sum + p.memory_count, 0);

  return {
    total_projects: projects.length,
    projects_with_memories: withMemories,
    projects_without_memories: 0, // All returned projects have at least 1
    total_memories: totalMemories,
    projects
  };
}

// ---------------------------------------------------------------------------
// AUDIT-02: KG density metrics
// ---------------------------------------------------------------------------

async function auditKgDensity(adapter: Adapter): Promise<AuditKgDensity> {
  // Total entities
  const entityRow = await adapter.get<CountRow>(
    'SELECT COUNT(*) AS count FROM kg_entities'
  );
  const totalEntities = entityRow?.count ?? 0;

  // Total triples (all) and active triples
  const tripleRow = await adapter.get<CountRow>(
    'SELECT COUNT(*) AS count FROM kg_triples'
  );
  const totalTriples = tripleRow?.count ?? 0;

  const activeTripleRow = await adapter.get<CountRow>(
    'SELECT COUNT(*) AS count FROM kg_triples WHERE valid_to IS NULL'
  );
  const activeTriples = activeTripleRow?.count ?? 0;

  // Orphaned entities: not referenced by any active triple as subject or object
  const orphanRows = await adapter.all<OrphanRow>(
    `SELECT e.id, e.name, e.entity_type
     FROM kg_entities e
     WHERE NOT EXISTS (
       SELECT 1 FROM kg_triples t
       WHERE t.valid_to IS NULL
         AND (t.subject_id = e.id OR t.object_id = e.id)
     )
     ORDER BY e.name
     LIMIT 100`
  );

  // Duplicate active triples: same (subject_id, predicate, object_id) with valid_to IS NULL
  const dupRows = await adapter.all<DuplicateTripleRow>(
    `SELECT subject_id, predicate, object_id, COUNT(*) AS dup_count
     FROM kg_triples
     WHERE valid_to IS NULL
     GROUP BY subject_id, predicate, object_id
     HAVING COUNT(*) > 1
     ORDER BY dup_count DESC
     LIMIT 50`
  );
  const totalDuplicateTriples = dupRows.reduce((sum, r) => sum + (r.dup_count - 1), 0);

  // Connected components: count entities that participate in active triples
  // vs total entities. Use a simpler union-find approximation via SQL.
  let connectedComponents = 0;
  if (totalEntities > 0 && totalEntities <= 10000) {
    try {
      const ccRow = await adapter.get<CountRow>(
        `WITH RECURSIVE walk(entity_id, root_id) AS (
           SELECT id, id FROM kg_entities
           UNION
           SELECT
             CASE WHEN t.subject_id = w.entity_id THEN t.object_id ELSE t.subject_id END,
             w.root_id
           FROM kg_triples t
           JOIN walk w ON (t.subject_id = w.entity_id OR t.object_id = w.entity_id)
           WHERE t.valid_to IS NULL
         )
         SELECT COUNT(DISTINCT min_root) AS count
         FROM (SELECT entity_id, MIN(root_id) AS min_root FROM walk GROUP BY entity_id)`
      );
      connectedComponents = ccRow?.count ?? 0;
    } catch {
      // Recursive CTE may hit limits on large graphs; fall back to -1
      connectedComponents = -1;
    }
  } else if (totalEntities > 10000) {
    connectedComponents = -1; // Too large; sentinel value
  }

  return {
    total_entities: totalEntities,
    total_triples: totalTriples,
    active_triples: activeTriples,
    orphaned_entities: orphanRows.length,
    orphaned_entity_list: orphanRows.map(r => ({
      id: r.id,
      name: r.name,
      entity_type: r.entity_type
    })),
    duplicate_triples: totalDuplicateTriples,
    duplicate_triple_details: dupRows.map(r => ({
      subject_id: r.subject_id,
      predicate: r.predicate,
      object_id: r.object_id,
      count: r.dup_count
    })),
    connected_components: connectedComponents
  };
}

// ---------------------------------------------------------------------------
// AUDIT-03: Unpopulated nests and broken bridges
// ---------------------------------------------------------------------------

async function auditNestHealth(adapter: Adapter): Promise<AuditNestHealth> {
  // Memories with empty nest
  const emptyNestRow = await adapter.get<CountRow>(
    `SELECT COUNT(*) AS count FROM memory_entries WHERE nest = '' OR nest IS NULL`
  );
  const emptyNest = emptyNestRow?.count ?? 0;

  // Memories with empty branch
  const emptyBranchRow = await adapter.get<CountRow>(
    `SELECT COUNT(*) AS count FROM memory_entries WHERE branch = '' OR branch IS NULL`
  );
  const emptyBranch = emptyBranchRow?.count ?? 0;

  // Broken bridges: triples referencing non-existent entities
  const brokenRows = await adapter.all<BrokenBridgeRow>(
    `SELECT
       t.id AS triple_id,
       t.subject_id,
       t.object_id,
       t.predicate,
       CASE
         WHEN s.id IS NULL AND o.id IS NULL THEN 'both_missing'
         WHEN s.id IS NULL THEN 'subject_missing'
         ELSE 'object_missing'
       END AS issue
     FROM kg_triples t
     LEFT JOIN kg_entities s ON s.id = t.subject_id
     LEFT JOIN kg_entities o ON o.id = t.object_id
     WHERE t.valid_to IS NULL
       AND (s.id IS NULL OR o.id IS NULL)
     LIMIT 100`
  );

  return {
    memories_without_nest: emptyNest,
    memories_without_branch: emptyBranch,
    broken_bridges: brokenRows.length,
    broken_bridge_list: brokenRows.map(r => ({
      triple_id: r.triple_id,
      subject_id: r.subject_id,
      object_id: r.object_id,
      predicate: r.predicate,
      issue: r.issue
    }))
  };
}

// ---------------------------------------------------------------------------
// AUDIT-04: Stale memories
// ---------------------------------------------------------------------------

async function auditStaleMemories(adapter: Adapter): Promise<AuditStaleMemories> {
  // Stale = never recalled AND low importance (<30) AND older than 30 days
  const staleRows = await adapter.all<StaleRow>(
    `SELECT id, title, importance, recall_count, created_at, last_recalled_at
     FROM memory_entries
     WHERE last_recalled_at IS NULL
       AND importance < 30
       AND created_at < datetime('now', '-30 days')
     ORDER BY created_at ASC
     LIMIT 100`
  );

  // Also count never-recalled memories regardless of importance/age
  const neverRecalledRow = await adapter.get<CountRow>(
    `SELECT COUNT(*) AS count FROM memory_entries WHERE last_recalled_at IS NULL`
  );

  // Count low-importance memories
  const lowImportanceRow = await adapter.get<CountRow>(
    `SELECT COUNT(*) AS count FROM memory_entries WHERE importance < 30`
  );

  return {
    stale_count: staleRows.length,
    never_recalled_count: neverRecalledRow?.count ?? 0,
    low_importance_count: lowImportanceRow?.count ?? 0,
    stale_items: staleRows.map((r): AuditStaleMemoryItem => ({
      id: r.id,
      title: r.title,
      importance: r.importance,
      recall_count: r.recall_count,
      created_at: r.created_at,
      last_recalled_at: r.last_recalled_at
    }))
  };
}

// ---------------------------------------------------------------------------
// Suggestions generator
// ---------------------------------------------------------------------------

function generateSuggestions(
  coverage: AuditProjectCoverage,
  density: AuditKgDensity,
  nestHealth: AuditNestHealth,
  stale: AuditStaleMemories
): AuditSuggestion[] {
  const suggestions: AuditSuggestion[] = [];

  if (coverage.total_memories === 0) {
    suggestions.push({
      category: 'coverage',
      severity: 'warning',
      message: 'No memories stored yet. Use memory_store or capture_outcome to begin building project memory.'
    });
  }

  if (density.orphaned_entities > 0) {
    suggestions.push({
      category: 'kg_density',
      severity: 'info',
      message: `${density.orphaned_entities} orphaned KG entities found (no active triples). Consider linking them or removing stale entities.`
    });
  }

  if (density.duplicate_triples > 0) {
    suggestions.push({
      category: 'kg_density',
      severity: 'warning',
      message: `${density.duplicate_triples} duplicate active triples detected. Consider deduplicating via kg_invalidate.`
    });
  }

  if (nestHealth.memories_without_nest > 0) {
    suggestions.push({
      category: 'nest_health',
      severity: 'info',
      message: `${nestHealth.memories_without_nest} memories have no nest assigned. Assign nests to improve graph_bridges and nest_tree accuracy.`
    });
  }

  if (nestHealth.memories_without_branch > 0) {
    suggestions.push({
      category: 'nest_health',
      severity: 'info',
      message: `${nestHealth.memories_without_branch} memories have no branch assigned. Assign branches for finer-grained taxonomy.`
    });
  }

  if (nestHealth.broken_bridges > 0) {
    suggestions.push({
      category: 'nest_health',
      severity: 'warning',
      message: `${nestHealth.broken_bridges} triples reference missing entities. These are broken bridges that should be cleaned up.`
    });
  }

  if (stale.stale_count > 0) {
    suggestions.push({
      category: 'stale',
      severity: 'info',
      message: `${stale.stale_count} stale memories found (never recalled, low importance, >30 days old). Review and delete or update them.`
    });
  }

  if (density.connected_components > 1) {
    suggestions.push({
      category: 'kg_density',
      severity: 'info',
      message: `KG has ${density.connected_components} disconnected components. Consider adding bridging triples to connect related knowledge.`
    });
  }

  return suggestions;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function computeHealthScore(
  coverage: AuditProjectCoverage,
  density: AuditKgDensity,
  nestHealth: AuditNestHealth,
  stale: AuditStaleMemories
): number {
  let score = 100;

  // Penalize empty state
  if (coverage.total_memories === 0) score -= 30;

  // Penalize orphaned entities (up to -15)
  if (density.total_entities > 0) {
    const orphanRatio = density.orphaned_entities / density.total_entities;
    score -= Math.min(15, Math.round(orphanRatio * 30));
  }

  // Penalize duplicate triples (up to -10)
  if (density.active_triples > 0) {
    const dupRatio = density.duplicate_triples / density.active_triples;
    score -= Math.min(10, Math.round(dupRatio * 20));
  }

  // Penalize missing nests (up to -15)
  if (coverage.total_memories > 0) {
    const emptyNestRatio = nestHealth.memories_without_nest / coverage.total_memories;
    score -= Math.min(15, Math.round(emptyNestRatio * 20));
  }

  // Penalize broken bridges (up to -10)
  score -= Math.min(10, nestHealth.broken_bridges * 2);

  // Penalize stale memories (up to -10)
  if (coverage.total_memories > 0) {
    const staleRatio = stale.stale_count / coverage.total_memories;
    score -= Math.min(10, Math.round(staleRatio * 20));
  }

  return Math.max(0, Math.min(100, score));
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function runAudit(adapter: Adapter): Promise<AuditResult> {
  const [coverage, density, nestHealth, stale] = await Promise.all([
    auditProjectCoverage(adapter),
    auditKgDensity(adapter),
    auditNestHealth(adapter),
    auditStaleMemories(adapter)
  ]);

  const suggestions = generateSuggestions(coverage, density, nestHealth, stale);
  const healthScore = computeHealthScore(coverage, density, nestHealth, stale);

  return {
    audited_at: new Date().toISOString(),
    health_score: healthScore,
    project_coverage: coverage,
    kg_density: density,
    nest_health: nestHealth,
    stale_memories: stale,
    suggestions,
    summary: buildSummary(healthScore, coverage, density, stale)
  };
}

function buildSummary(
  score: number,
  coverage: AuditProjectCoverage,
  density: AuditKgDensity,
  stale: AuditStaleMemories
): string {
  const parts: string[] = [
    `Health: ${score}/100`,
    `${coverage.total_memories} memories across ${coverage.total_projects} project(s)`,
    `${density.total_entities} KG entities, ${density.active_triples} active triples`
  ];

  if (density.orphaned_entities > 0) {
    parts.push(`${density.orphaned_entities} orphaned entities`);
  }
  if (stale.stale_count > 0) {
    parts.push(`${stale.stale_count} stale memories`);
  }

  return parts.join('. ') + '.';
}
