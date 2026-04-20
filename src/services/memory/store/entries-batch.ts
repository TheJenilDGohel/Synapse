import path from 'node:path';
import {
  nowIso, clampInt, cleanString, normalizeScope, deriveSummary, deriveTitle,
  ensureArray, normalizeLinks, stableJson, makeFingerprint, generateMemoryId,
  buildSearchTerms
} from '../utils.js';
import { checkDuplicate } from './dedup.js';
import type {
  Adapter, EmbeddingService, StoreEntryInput, Scope, Link
} from '../types.js';

// ---------------------------------------------------------------------------
// Delete batch
// ---------------------------------------------------------------------------

export interface DeleteEntryBatchInput {
  ids: string[];
}

export interface DeleteEntryBatchResult {
  deleted: number;
  errors: BatchError[];
}

export async function deleteEntryBatch(
  store: MemoryStoreLike,
  { ids }: DeleteEntryBatchInput
): Promise<DeleteEntryBatchResult> {
  if (!Array.isArray(ids)) {
    throw new Error('ids must be an array');
  }
  if (ids.length > MEMORY_BATCH_LIMIT) {
    throw new BatchSizeExceededError(MEMORY_BATCH_LIMIT, ids.length);
  }

  await store.init();

  const result: DeleteEntryBatchResult = { deleted: 0, errors: [] };

  await store.adapter.transaction(async (ad) => {
    for (let i = 0; i < ids.length; i += 1) {
      const id = typeof ids[i] === 'string' ? ids[i].trim() : '';
      if (!id) {
        result.errors.push({ index: i, message: 'id is required' });
        continue;
      }
      try {
        const existing = await ad.get<{ id: string }>(
          'SELECT id FROM memory_entries WHERE id = ?',
          [id]
        );
        if (!existing) {
          result.errors.push({ index: i, message: `memory not found: ${id}` });
          continue;
        }
        await ad.run('DELETE FROM memory_relations WHERE source_id = ? OR target_id = ?', [id, id]);
        await ad.run('DELETE FROM memory_revisions WHERE memory_id = ?', [id]);
        await ad.run('DELETE FROM memory_entries WHERE id = ?', [id]);
        result.deleted += 1;
      } catch (err) {
        result.errors.push({ index: i, message: (err as Error)?.message || String(err) });
      }
    }
  });

  return result;
}

/** Maximum memories accepted in a single batch call. */
export const MEMORY_BATCH_LIMIT = 100;

export interface BatchError {
  index: number;
  message: string;
}

export interface StoreEntryBatchInput {
  memories: StoreEntryInput[];
  response_format?: 'minimal' | 'verbose';
}

export interface StoreEntryBatchSummary {
  created: number;
  duplicates: number;
  errors: BatchError[];
  ids?: (string | null)[];
}

export class BatchSizeExceededError extends Error {
  code = 'MAX_BATCH_SIZE_EXCEEDED';
  limit: number;
  received: number;
  constructor(limit: number, received: number) {
    super(`Batch size ${received} exceeds maximum of ${limit}`);
    this.limit = limit;
    this.received = received;
    this.name = 'BatchSizeExceededError';
  }
}

interface MemoryStoreLike {
  enabled: boolean;
  dbPath: string;
  adapter: Adapter;
  embeddingService: EmbeddingService | null;
  init(): Promise<unknown>;
}

interface PreparedRow {
  skip: boolean;
  index: number;
  id: string;
  kind: string;
  title: string;
  summary: string;
  content: string;
  status: string;
  importance: number;
  confidence: number;
  scope: Scope;
  nest: string;
  branch: string;
  agentId: string;
  actorId: string;
  tags: string[];
  links: Link[];
  searchTerms: string[];
  sourceType: string;
  sourceRef: string;
  fingerprint: string;
  changeNote: string;
  createdAt: string;
  dedupThreshold: number | undefined;
}

function preparePayload(input: StoreEntryInput, index: number): { prepared: PreparedRow; error?: BatchError } {
  const scope = normalizeScope(input.scope);
  const rawNestFallback = scope.project_path ? path.basename(scope.project_path) : '';
  const rawBranchFallback = (scope.branch_name || scope.topic || '').replace(/[/\\]/g, '-');
  const nest = cleanString(input.nest || rawNestFallback, 200);
  const branch = cleanString(input.branch || rawBranchFallback, 200);
  const agentId = cleanString(input.agent_id || '', 200);
  // ACTOR-02: auto-infer actor_id from agent_id when not provided
  const actorId = cleanString(input.actor_id || agentId, 200);
  const kind = cleanString(input.kind || 'knowledge', 40) || 'knowledge';
  const content = cleanString(input.content, 20000);
  const summary = deriveSummary(input.summary, content);
  const title = deriveTitle({
    title: input.title,
    summary,
    content,
    eventType: input.event_type || input.kind || '',
    scope
  });
  const status = cleanString(input.status || 'active', 30) || 'active';
  const tags = ensureArray(input.tags);
  const links = normalizeLinks(input.links);
  const sourceType = cleanString(input.source_type || input.sourceType || 'manual', 60) || 'manual';
  const sourceRef = cleanString(input.source_ref || input.sourceRef, 1000);
  const importance = clampInt(input.importance, 50, 0, 100);
  const confidenceRaw = Number(input.confidence);
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.max(0, Math.min(1, confidenceRaw))
    : 0.7;

  const prepared: PreparedRow = {
    skip: false,
    index,
    id: generateMemoryId(),
    kind,
    title,
    summary,
    content,
    status,
    importance,
    confidence,
    scope,
    nest,
    branch,
    agentId,
    actorId,
    tags,
    links,
    searchTerms: buildSearchTerms({ title, summary, content, scope, tags, links, sourceRef }),
    sourceType,
    sourceRef,
    fingerprint: makeFingerprint({ kind, title, summary, content, scope, tags }),
    changeNote: cleanString(input.change_note || 'Batch insert', 400),
    createdAt: nowIso(),
    dedupThreshold: typeof input.dedup_threshold === 'number' ? input.dedup_threshold : undefined
  };

  if (!content) {
    prepared.skip = true;
    return { prepared, error: { index, message: 'content is required' } };
  }
  if (!title) {
    prepared.skip = true;
    return { prepared, error: { index, message: 'title is required (could not be derived)' } };
  }

  return { prepared };
}

async function embedMemorySafe(
  store: MemoryStoreLike,
  { title, summary, content }: { title: string; summary: string; content: string }
): Promise<number[] | null> {
  if (!store.embeddingService?.isEnabled?.()) return null;
  const text = [
    String(title || '').trim(),
    String(summary || '').trim(),
    String(content || '').slice(0, 500).trim()
  ].filter(Boolean).join('\n');
  if (!text) return null;
  try {
    return await store.embeddingService.embed(text);
  } catch {
    return null;
  }
}

export async function storeEntryBatch(
  store: MemoryStoreLike,
  { memories, response_format }: StoreEntryBatchInput
): Promise<StoreEntryBatchSummary> {
  if (!Array.isArray(memories)) {
    throw new Error('memories must be an array');
  }
  if (memories.length > MEMORY_BATCH_LIMIT) {
    throw new BatchSizeExceededError(MEMORY_BATCH_LIMIT, memories.length);
  }

  await store.init();

  const summary: StoreEntryBatchSummary = {
    created: 0,
    duplicates: 0,
    errors: []
  };
  const ids: (string | null)[] = new Array(memories.length).fill(null);

  // Pass 1: validate + derive outside the transaction so predictable failures
  // don't force a rollback.
  const prepared: PreparedRow[] = [];
  for (let i = 0; i < memories.length; i += 1) {
    const { prepared: row, error } = preparePayload(memories[i], i);
    if (error) summary.errors.push(error);
    prepared.push(row);
  }

  const createdRows: Array<{ id: string; title: string; summary: string; content: string }> = [];

  // Pass 2: run the entire write workload inside a single transaction so any
  // unexpected DB error rolls back all inserts.
  await store.adapter.transaction(async (ad) => {
    for (const row of prepared) {
      if (row.skip) continue;

      // Fingerprint dedup — catches exact duplicates against existing rows
      // AND within-batch duplicates (transaction reads its own writes).
      const existing = await ad.get<{ id: string }>(
        `SELECT id FROM memory_entries WHERE fingerprint = ? AND scope_project_path = ? LIMIT 1`,
        [row.fingerprint, row.scope.project_path]
      );
      if (existing) {
        summary.duplicates += 1;
        ids[row.index] = existing.id;
        continue;
      }

      // Semantic dedup (embedding-based). Only fires if embedding service is
      // enabled and existing rows carry embeddings — otherwise it's a no-op.
      const dedupResult = await checkDuplicate(ad, store.embeddingService, row.content, {
        threshold: row.dedupThreshold,
        nest: row.nest,
        branch: row.branch,
        projectPath: row.scope.project_path
      });
      if (dedupResult.isDuplicate && dedupResult.match) {
        summary.duplicates += 1;
        ids[row.index] = dedupResult.match.id;
        continue;
      }

      await ad.run(
        `INSERT INTO memory_entries(
          id, kind, title, summary, content, status, importance, confidence,
          scope_root_path, scope_project_path, scope_branch_name, topic, feature,
          nest, branch, agent_id, actor_id,
          tags_json, search_terms_json, links_json, source_type, source_ref, fingerprint,
          created_at, updated_at, last_recalled_at, recall_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0)`,
        [
          row.id, row.kind, row.title, row.summary, row.content, row.status, row.importance, row.confidence,
          row.scope.root_path, row.scope.project_path, row.scope.branch_name, row.scope.topic, row.scope.feature,
          row.nest, row.branch, row.agentId, row.actorId,
          stableJson(row.tags), stableJson(row.searchTerms), stableJson(row.links),
          row.sourceType, row.sourceRef, row.fingerprint, row.createdAt, row.createdAt
        ]
      );
      await ad.run(
        `INSERT INTO memory_revisions(
          memory_id, revision, title, summary, content, tags_json, links_json, change_note, created_at
        ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id, row.title, row.summary, row.content, stableJson(row.tags), stableJson(row.links),
          row.changeNote, row.createdAt
        ]
      );

      summary.created += 1;
      ids[row.index] = row.id;
      createdRows.push({
        id: row.id,
        title: row.title,
        summary: row.summary,
        content: row.content
      });
    }
  });

  // Best-effort post-commit embedding pass — mirrors the single storeEntry flow.
  // Failures never fail the batch.
  for (const created of createdRows) {
    try {
      const embedding = await embedMemorySafe(store, {
        title: created.title,
        summary: created.summary,
        content: created.content
      });
      if (embedding) {
        await store.adapter.run(
          'UPDATE memory_entries SET embedding_json = ? WHERE id = ?',
          [JSON.stringify(embedding), created.id]
        );
      }
    } catch {
      // swallow — best effort
    }
  }

  if (response_format === 'verbose') {
    summary.ids = ids;
  }
  return summary;
}
