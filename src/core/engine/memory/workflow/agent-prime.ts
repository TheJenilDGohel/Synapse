/**
 * Agent Prime -- unified context primitive.
 *
 * Returns everything an agent needs to start a task in one call:
 *   memories, KG entities, relevant files, recent git changes, suggested actions.
 *
 * Response is capped at 2 KB via enforceResponseSize().
 */

import { execSync } from 'node:child_process';
import { splitTerms } from '../utils/index.js';
import { extractEntities } from '../ingest/ingest.js';
import { normalizeEntityId } from '../knowledge-graph/kg.js';
import type { Adapter, RecallInput, RecallResult, RecallResultItem } from '../types/index.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface AgentPrimeInput {
  task: string;
  project_path?: string;
  nest?: string;
  branch?: string;
  max_memories?: number;
  max_entities?: number;
  max_files?: number;
}

export interface CompactMemory {
  id: string;
  title: string;
  summary: string;
  kind: string;
  score: number;
  actor_id: string;
}

export interface CompactEntity {
  id: string;
  name: string;
  type: string;
  predicates: string[];
}

export interface CompactFile {
  path: string;
  score: number;
}

export interface AgentPrimeResult {
  task: string;
  memories: CompactMemory[];
  entities: CompactEntity[];
  files: CompactFile[];
  recent_changes: string;
  warnings: string[];
  suggested_actions: string[];
}

// ---------------------------------------------------------------------------
// Dependency interfaces (injected)
// ---------------------------------------------------------------------------

export interface AgentPrimeDeps {
  memory: {
    recall(opts: RecallInput): Promise<RecallResult | { cancelled: boolean; reason?: string }>;
    store: {
      adapter: Adapter | null;
      init(): Promise<Record<string, unknown>>;
    };
  };
  search?: { searchHybrid(opts: Record<string, unknown>): Promise<unknown> } | null;
  vectorIndex?: { getStatus(): Record<string, unknown> } | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_SUMMARY_LEN = 120;
const MAX_PREDICATES_PER_ENTITY = 5;
const MAX_GIT_OUTPUT_LEN = 500;
const MAX_ACTIONS = 4;
const MAX_RESPONSE_BYTES = 2048;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(text: string, maxLen: number): string {
  if (!text || text.length <= maxLen) return text || '';
  return text.slice(0, maxLen - 3).trim() + '...';
}

function clamp(value: number | undefined, fallback: number, min: number, max: number): number {
  const n = value ?? fallback;
  return Math.max(min, Math.min(max, n));
}

function detectDegradation(status: Record<string, unknown> | null | undefined): string[] {
  if (!status || typeof status !== 'object') return [];

  const warnings: string[] = [];
  const embedding = (status.embedding && typeof status.embedding === 'object')
    ? status.embedding as Record<string, unknown>
    : {};
  const ast = (status.ast_chunking && typeof status.ast_chunking === 'object')
    ? status.ast_chunking as Record<string, unknown>
    : {};

  if (embedding.enabled === true && embedding.available === false) {
    warnings.push('Semantic embeddings are cold or unavailable; search quality may be degraded until indexing warms up.');
  }

  const activeLanguages = Array.isArray(ast.active_languages) ? ast.active_languages : [];
  const fallbackLanguages = Array.isArray(ast.fallback_languages) ? ast.fallback_languages : [];
  const missingDependencies = Array.isArray(ast.missing_dependencies) ? ast.missing_dependencies : [];

  if (activeLanguages.length === 0) {
    warnings.push('AST chunking is inactive; code search may fall back to coarse line-based chunks.');
  }
  if (missingDependencies.length > 0) {
    warnings.push(`AST parser dependencies are missing: ${missingDependencies.join(', ')}.`);
  }
  if (fallbackLanguages.length > 0) {
    warnings.push(`AST chunking is degraded for: ${fallbackLanguages.join(', ')}.`);
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Core function
// ---------------------------------------------------------------------------

export async function agentPrime(
  deps: AgentPrimeDeps,
  input: AgentPrimeInput
): Promise<AgentPrimeResult> {
  const task = (input.task || '').trim();
  if (!task) {
    return {
      task: '',
      memories: [],
      entities: [],
      files: [],
      recent_changes: 'unavailable',
      warnings: [],
      suggested_actions: ['Provide a task description to get contextual priming.']
    };
  }

  const maxMemories = clamp(input.max_memories, 5, 1, 10);
  const maxEntities = clamp(input.max_entities, 10, 1, 20);
  const maxFiles = clamp(input.max_files, 5, 1, 10);
  const projectPath = input.project_path || '';
  const warnings = detectDegradation(deps.vectorIndex?.getStatus?.());

  // --- Section 1: Memories (PRIME-02) ---
  let memories: CompactMemory[] = [];
  let recalledItems: RecallResultItem[] = [];
  try {
    const recallResult = await deps.memory.recall({
      query: task,
      projectPath: projectPath || undefined,
      nest: input.nest,
      branch: input.branch,
      limit: maxMemories
    });
    recalledItems = (recallResult as { items?: RecallResultItem[] })?.items || [];
    memories = recalledItems.map((item) => ({
      id: item.memory.id,
      title: truncate(item.memory.title, 80),
      summary: truncate(item.memory.summary, MAX_SUMMARY_LEN),
      kind: item.memory.kind || 'note',
      score: Number(item.score.toFixed(3)),
      actor_id: item.memory.actor_id || ''
    }));
  } catch {
    // Non-blocking
  }

  // --- Section 2: Entities (PRIME-03) ---
  let entities: CompactEntity[] = [];
  try {
    await deps.memory.store.init();
    const adapter = deps.memory.store.adapter;
    if (adapter) {
      entities = await gatherEntities(adapter, task, recalledItems, maxEntities);
    }
  } catch {
    // Non-blocking
  }

  // --- Section 3: Files (PRIME-04) ---
  let files: CompactFile[] = [];
  try {
    if (deps.search) {
      const searchResult = await deps.search.searchHybrid({
        query: task,
        projectPath: projectPath || undefined,
        maxResults: maxFiles,
        autoIndex: false
      }) as Record<string, unknown>;
      const items = (searchResult?.results || searchResult?.items || []) as Array<Record<string, unknown>>;
      files = items.slice(0, maxFiles).map((item) => ({
        path: String(item.file || item.path || item.filePath || ''),
        score: Number(Number(item.score ?? item.rrf_score ?? 0).toFixed(3))
      })).filter((f) => f.path);
    }
  } catch {
    // Non-blocking
  }

  // --- Section 4: Recent changes (PRIME-05) ---
  let recentChanges = 'unavailable';
  try {
    if (projectPath) {
      recentChanges = getRecentChanges(projectPath);
    }
  } catch {
    // Non-blocking
  }

  // --- Section 5: Suggested actions (PRIME-06) ---
  const suggestedActions = buildSuggestedActions(task, memories, entities, files, recentChanges, warnings);

  // --- Assemble and enforce 2KB cap ---
  let result: AgentPrimeResult = {
    task,
    memories,
    entities,
    files,
    recent_changes: recentChanges,
    warnings,
    suggested_actions: suggestedActions
  };

  result = enforceResponseSize(result);
  return result;
}

// ---------------------------------------------------------------------------
// Entity gathering (PRIME-03)
// ---------------------------------------------------------------------------

async function gatherEntities(
  adapter: Adapter,
  task: string,
  recalledItems: RecallResultItem[],
  maxEntities: number
): Promise<CompactEntity[]> {
  const entityMap = new Map<string, CompactEntity>();

  // Strategy A: Search entities by task terms
  const terms = splitTerms(task);
  for (const term of terms.slice(0, 5)) {
    if (entityMap.size >= maxEntities) break;
    const rows = await adapter.all<{ id: string; name: string; entity_type: string }>(
      `SELECT id, name, entity_type FROM kg_entities
       WHERE name LIKE ? COLLATE NOCASE
       LIMIT ?`,
      [`%${term}%`, maxEntities - entityMap.size]
    );
    for (const row of rows) {
      if (!entityMap.has(row.id)) {
        entityMap.set(row.id, {
          id: row.id,
          name: row.name,
          type: row.entity_type,
          predicates: []
        });
      }
    }
  }

  // Strategy B: 1-hop neighborhood of entities from top recalled memories
  for (const item of recalledItems.slice(0, 3)) {
    if (entityMap.size >= maxEntities) break;
    const extracted = extractEntities(
      `${item.memory.title} ${item.memory.summary}`
    );
    for (const entity of extracted.slice(0, 3)) {
      if (entityMap.size >= maxEntities) break;
      const entityId = normalizeEntityId(entity.name);
      if (!entityId) continue;

      const exists = await adapter.get<{ id: string; name: string; entity_type: string }>(
        'SELECT id, name, entity_type FROM kg_entities WHERE id = ?',
        [entityId]
      );
      if (!exists) continue;
      if (!entityMap.has(exists.id)) {
        entityMap.set(exists.id, {
          id: exists.id,
          name: exists.name,
          type: exists.entity_type,
          predicates: []
        });
      }

      // 1-hop neighbors
      const neighbors = await adapter.all<{
        id: string; name: string; entity_type: string; predicate: string;
      }>(
        `SELECT DISTINCT e.id, e.name, e.entity_type, t.predicate
           FROM kg_triples t
           JOIN kg_entities e ON e.id = CASE
             WHEN t.subject_id = ? THEN t.object_id
             ELSE t.subject_id
           END
          WHERE (t.subject_id = ? OR t.object_id = ?)
            AND t.valid_to IS NULL
          LIMIT 10`,
        [entityId, entityId, entityId]
      );
      for (const nb of neighbors) {
        if (entityMap.size >= maxEntities) break;
        if (!entityMap.has(nb.id)) {
          entityMap.set(nb.id, {
            id: nb.id,
            name: nb.name,
            type: nb.entity_type,
            predicates: []
          });
        }
      }
    }
  }

  // Enrich entities with their active predicates (batched)
  const allIds = Array.from(entityMap.keys());
  if (allIds.length > 0) {
    const BATCH_SIZE = 400; // max ~999 params in older SQLite, we use 2 params per id
    for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
      const batchIds = allIds.slice(i, i + BATCH_SIZE);
      const placeholders = batchIds.map(() => '?').join(',');

      const query = `
        SELECT subject_id as id, predicate FROM kg_triples
        WHERE subject_id IN (${placeholders}) AND valid_to IS NULL
        UNION
        SELECT object_id as id, predicate FROM kg_triples
        WHERE object_id IN (${placeholders}) AND valid_to IS NULL
      `;
      const params = [...batchIds, ...batchIds];

      try {
        const rows = await adapter.all<{id: string, predicate: string}>(query, params);

        // Group by entity id, limiting to MAX_PREDICATES_PER_ENTITY
        const predsById = new Map<string, Set<string>>();
        for (const row of rows) {
          let preds = predsById.get(row.id);
          if (!preds) {
            preds = new Set();
            predsById.set(row.id, preds);
          }
          if (preds.size < MAX_PREDICATES_PER_ENTITY) {
            preds.add(row.predicate);
          }
        }

        // Assign back to entities
        for (const id of batchIds) {
          const entity = entityMap.get(id);
          if (entity) {
            const preds = predsById.get(id);
            entity.predicates = preds ? Array.from(preds) : [];
          }
        }
      } catch {
        // Non-blocking
      }
    }
  }

  return Array.from(entityMap.values()).slice(0, maxEntities);
}

// ---------------------------------------------------------------------------
// Git changes (PRIME-05)
// ---------------------------------------------------------------------------

function getRecentChanges(projectPath: string): string {
  const opts = { cwd: projectPath, timeout: 3000, encoding: 'utf-8' as const, stdio: ['pipe', 'pipe', 'pipe'] as ['pipe', 'pipe', 'pipe'] };
  try {
    const diff = execSync('git diff --stat HEAD~5..HEAD', opts);
    const trimmed = (diff || '').trim();
    if (trimmed) return truncate(trimmed, MAX_GIT_OUTPUT_LEN);
  } catch { /* fall through */ }
  try {
    const log = execSync('git log --oneline -5', opts);
    const trimmed = (log || '').trim();
    if (trimmed) return truncate(trimmed, MAX_GIT_OUTPUT_LEN);
  } catch { /* fall through */ }
  return 'no recent changes';
}

// ---------------------------------------------------------------------------
// Suggested actions (PRIME-06)
// ---------------------------------------------------------------------------

function buildSuggestedActions(
  task: string,
  memories: CompactMemory[],
  entities: CompactEntity[],
  files: CompactFile[],
  recentChanges: string,
  warnings: string[]
): string[] {
  const actions: string[] = [];
  const terms = splitTerms(task);
  const firstTerm = terms[0] || task.split(/\s+/)[0] || 'relevant';

  if (warnings.length > 0) {
    actions.push('Warm the index with synapse_index_project if semantic search or AST context looks degraded');
  }

  if (memories.length > 0) {
    actions.push(`Review memory '${truncate(memories[0].title, 40)}' for prior approach`);
  }

  if (files.length > 0) {
    actions.push(`Start with ${files[0].path} -- most relevant file`);
  }

  if (entities.length > 0) {
    const topEntity = entities[0];
    actions.push(`Check entity '${topEntity.name}' relationships for context`);
  }

  if (recentChanges !== 'unavailable' && recentChanges !== 'no recent changes') {
    actions.push('Review recent changes for overlap with this task');
  }

  if (actions.length === 0) {
    actions.push(`Search codebase for '${firstTerm}' to locate relevant code`);
    actions.push('Use synapse_search_code or synapse_search_hybrid for deeper exploration');
  }

  if (actions.length < 2) {
    actions.push('Capture outcome with synapse_capture_outcome when task completes');
  }

  return actions.slice(0, MAX_ACTIONS);
}

// ---------------------------------------------------------------------------
// Response size enforcement
// ---------------------------------------------------------------------------

function enforceResponseSize(result: AgentPrimeResult): AgentPrimeResult {
  let json = JSON.stringify(result);
  if (json.length <= MAX_RESPONSE_BYTES) return result;

  // Pass 1: Truncate summaries further
  for (const mem of result.memories) {
    mem.summary = truncate(mem.summary, 60);
  }
  json = JSON.stringify(result);
  if (json.length <= MAX_RESPONSE_BYTES) return result;

  // Pass 2: Remove summaries entirely
  for (const mem of result.memories) {
    mem.summary = '';
  }
  json = JSON.stringify(result);
  if (json.length <= MAX_RESPONSE_BYTES) return result;

  // Pass 3: Reduce entities
  result.entities = result.entities.slice(0, 5);
  for (const ent of result.entities) {
    ent.predicates = ent.predicates.slice(0, 2);
  }
  json = JSON.stringify(result);
  if (json.length <= MAX_RESPONSE_BYTES) return result;

  // Pass 4: Reduce everything to minimum
  result.memories = result.memories.slice(0, 3);
  result.entities = result.entities.slice(0, 3);
  result.files = result.files.slice(0, 3);
  result.recent_changes = truncate(result.recent_changes, 200);
  result.suggested_actions = result.suggested_actions.slice(0, 2);

  return result;
}
