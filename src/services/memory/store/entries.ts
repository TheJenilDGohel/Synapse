import fs from 'node:fs';
import path from 'node:path';
import {
  nowIso, clampInt, cleanString, normalizeScope, deriveSummary, deriveTitle,
  ensureArray, normalizeLinks, stableJson, makeFingerprint, generateMemoryId,
  buildSearchTerms, deserializeEntry, inferGitBranch, inferTopic, inferTags
} from '../utils.js';
import { checkDuplicate } from './dedup.js';
import { extractAndLink } from '../knowledge-graph/auto-link.js';
import type {
  Adapter, EmbeddingService, MemoryEntry, MemoryEntryRow, MemoryRevisionRow,
  MemoryEntryWithRevisions, MemoryRevision, StoreEntryInput, StoreEntryResult,
  UpdateEntryPatch, DeleteEntryResult, ListEntriesOpts, ListEntriesResult, StoreStatusResult,
  AutoLinkResult
} from '../types.js';

interface MemoryStoreLike {
  enabled: boolean;
  dbPath: string;
  requestedBackend: string;
  selectedBackend: string | null;
  adapter: Adapter;
  embeddingService: EmbeddingService | null;
  init(): Promise<unknown>;
  getMeta(key: string): Promise<string | null>;
}

async function embedMemory(
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

export async function getStoreStatus(store: MemoryStoreLike): Promise<StoreStatusResult> {
  const base = {
    enabled: store.enabled,
    db_path: store.dbPath,
    db_exists: fs.existsSync(store.dbPath),
    requested_backend: store.requestedBackend,
    selected_backend: store.selectedBackend
  };

  if (!store.enabled) {
    return { ...base, initialized: false };
  }

  await store.init();
  const entryRow = await store.adapter.get<{ c: number }>('SELECT COUNT(*) AS c FROM memory_entries');
  const revisionRow = await store.adapter.get<{ c: number }>('SELECT COUNT(*) AS c FROM memory_revisions');
  const eventRow = await store.adapter.get<{ c: number }>('SELECT COUNT(*) AS c FROM memory_events');
  const relationRow = await store.adapter.get<{ c: number }>('SELECT COUNT(*) AS c FROM memory_relations');
  return {
    ...base,
    initialized: true,
    schema_version: Number.parseInt(await store.getMeta('schema_version') || '0', 10) || 0,
    total_entries: entryRow?.c || 0,
    total_revisions: revisionRow?.c || 0,
    total_events: eventRow?.c || 0,
    total_relations: relationRow?.c || 0
  };
}

export async function listEntries(store: MemoryStoreLike, {
  kind,
  status,
  projectPath,
  topic,
  nest,
  branch,
  actorId,
  tags,
  limit = 20,
  offset = 0
}: ListEntriesOpts = {}): Promise<ListEntriesResult> {
  await store.init();
  const filters: string[] = [];
  const params: unknown[] = [];

  if (kind) { filters.push('kind = ?'); params.push(kind); }
  if (status) { filters.push('status = ?'); params.push(status); }
  if (projectPath) { filters.push('scope_project_path = ?'); params.push(projectPath); }
  if (topic) { filters.push('topic = ?'); params.push(topic); }
  if (nest) { filters.push('nest = ?'); params.push(nest); }
  if (branch) { filters.push('branch = ?'); params.push(branch); }
  if (actorId) { filters.push('actor_id = ?'); params.push(actorId); }
  if (Array.isArray(tags) && tags.length > 0) {
    for (const tag of tags) {
      filters.push('EXISTS (SELECT 1 FROM JSON_EACH(tags_json) WHERE JSON_EACH.value = ?)');
      params.push(tag);
    }
  }

  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const countRow = await store.adapter.get<{ c: number }>(
    `SELECT COUNT(*) AS c FROM memory_entries ${where}`,
    params
  );

  const safeLimit = clampInt(limit, 20, 1, 200);
  const safeOffset = clampInt(offset, 0, 0, 100000);
  const rows = await store.adapter.all<MemoryEntryRow>(
    `SELECT id, kind, title, summary, status, importance, confidence,
            scope_root_path, scope_project_path, scope_branch_name, topic, feature,
            nest, branch, agent_id, actor_id,
            tags_json, source_type, source_ref, created_at, updated_at, last_recalled_at, recall_count
       FROM memory_entries
       ${where}
      ORDER BY importance DESC, updated_at DESC
      LIMIT ? OFFSET ?`,
    [...params, safeLimit, safeOffset]
  );

  return {
    total_count: countRow?.c || 0,
    count: rows.length,
    limit: safeLimit,
    offset: safeOffset,
    has_more: safeOffset + rows.length < (countRow?.c || 0),
    next_offset: safeOffset + rows.length < (countRow?.c || 0) ? safeOffset + rows.length : null,
    items: rows.map((row) => deserializeEntry(row))
  };
}

export async function getEntry(store: MemoryStoreLike, id: string): Promise<MemoryEntryWithRevisions | null> {
  await store.init();
  const row = await store.adapter.get<MemoryEntryRow>(
    'SELECT * FROM memory_entries WHERE id = ?',
    [id]
  );
  if (!row) return null;
  const revisions = await store.adapter.all<MemoryRevisionRow>(
    `SELECT revision, title, summary, content, tags_json, links_json, change_note, created_at
       FROM memory_revisions
      WHERE memory_id = ?
      ORDER BY revision DESC`,
    [id]
  );
  return {
    ...deserializeEntry(row),
    revisions: revisions.map((item): MemoryRevision => ({
      revision: item.revision,
      title: item.title,
      summary: item.summary,
      content: item.content,
      tags: JSON.parse(item.tags_json || '[]'),
      links: JSON.parse(item.links_json || '[]'),
      change_note: item.change_note,
      created_at: item.created_at
    }))
  };
}

export async function storeEntry(store: MemoryStoreLike, input: StoreEntryInput): Promise<StoreEntryResult> {
  await store.init();
  const scope = normalizeScope(input.scope);
  // SLIM-03: Auto-infer project_path from cwd when not provided
  if (!scope.project_path) {
    scope.project_path = process.cwd();
  }
  // SLIM-04: Auto-infer branch_name from git when not provided
  if (!scope.branch_name) {
    scope.branch_name = inferGitBranch();
  }
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
  const rawTags = ensureArray(input.tags);
  const links = normalizeLinks(input.links);
  // SLIM-05: Auto-infer topic and tags when not provided
  if (!scope.topic) {
    scope.topic = inferTopic(content);
  }
  const tags = rawTags.length > 0 ? rawTags : inferTags(title, content);
  const sourceType = cleanString(input.source_type || input.sourceType || 'manual', 60) || 'manual';
  const sourceRef = cleanString(input.source_ref || input.sourceRef, 1000);
  const importance = clampInt(input.importance, 50, 0, 100);
  const confidenceRaw = Number(input.confidence);
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.max(0, Math.min(1, confidenceRaw))
    : 0.7;

  if (!title) throw new Error('title is required');
  if (!content) throw new Error('content is required');

  const fingerprint = makeFingerprint({ kind, title, summary, content, scope, tags });
  const searchTerms = buildSearchTerms({ title, summary, content, scope, tags, links, sourceRef });
  const existing = await store.adapter.get<{ id: string }>(
    `SELECT id FROM memory_entries WHERE fingerprint = ? AND scope_project_path = ? LIMIT 1`,
    [fingerprint, scope.project_path]
  );

  if (existing) {
    return { created: false, duplicate: true, memory: await getEntry(store, existing.id) };
  }

  const dedupResult = await checkDuplicate(store.adapter, store.embeddingService, content, {
    threshold: input.dedup_threshold,
    nest,
    branch,
    projectPath: scope.project_path
  });
  if (dedupResult.isDuplicate) {
    const matchedEntry = await getEntry(store, dedupResult.match!.id);
    return {
      created: false,
      duplicate: true,
      semantic_match: dedupResult.match,
      memory: matchedEntry
    };
  }

  const id = generateMemoryId();
  const createdAt = nowIso();

  await store.adapter.transaction(async (ad) => {
    await ad.run(
      `INSERT INTO memory_entries(
        id, kind, title, summary, content, status, importance, confidence,
        scope_root_path, scope_project_path, scope_branch_name, topic, feature,
        nest, branch, agent_id, actor_id,
        tags_json, search_terms_json, links_json, source_type, source_ref, fingerprint,
        created_at, updated_at, last_recalled_at, recall_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0)`,
      [
        id, kind, title, summary, content, status, importance, confidence,
        scope.root_path, scope.project_path, scope.branch_name, scope.topic, scope.feature,
        nest, branch, agentId, actorId,
        stableJson(tags), stableJson(searchTerms), stableJson(links),
        sourceType, sourceRef, fingerprint, createdAt, createdAt
      ]
    );
    await ad.run(
      `INSERT INTO memory_revisions(
        memory_id, revision, title, summary, content, tags_json, links_json, change_note, created_at
      ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, title, summary, content, stableJson(tags), stableJson(links),
        cleanString(input.change_note || 'Initial memory creation', 400), createdAt
      ]
    );
  });

  const embedding = await embedMemory(store, { title, summary, content });
  if (embedding) {
    await store.adapter.run(
      'UPDATE memory_entries SET embedding_json = ? WHERE id = ?',
      [JSON.stringify(embedding), id]
    );
  }

  // FUSE-01/02: Auto-link memory content to existing KG entities
  let autoLinkResult: AutoLinkResult = { auto_linked_entities: [], auto_triples: [] };
  try {
    autoLinkResult = await extractAndLink(store.adapter, id, content);
  } catch {
    // Non-blocking: auto-link failure does not prevent memory creation
  }

  return {
    created: true,
    duplicate: false,
    memory: await getEntry(store, id),
    auto_linked_entities: autoLinkResult.auto_linked_entities,
    auto_triples: autoLinkResult.auto_triples
  };
}

export async function updateEntry(store: MemoryStoreLike, id: string, patch: UpdateEntryPatch = {}): Promise<MemoryEntryWithRevisions | null> {
  await store.init();
  const existing = await getEntry(store, id);
  if (!existing) throw new Error(`memory not found: ${id}`);

  const scope = normalizeScope({
    root_path: patch.scope?.root_path ?? existing.scope_root_path,
    project_path: patch.scope?.project_path ?? existing.scope_project_path,
    branch_name: patch.scope?.branch_name ?? existing.scope_branch_name,
    topic: patch.scope?.topic ?? existing.topic,
    feature: patch.scope?.feature ?? existing.feature
  });

  const next = {
    kind: cleanString(patch.kind, 40) || existing.kind,
    title: cleanString(patch.title, 400) || existing.title,
    summary: patch.summary === undefined ? existing.summary : cleanString(patch.summary, 4000),
    content: patch.content === undefined ? existing.content : cleanString(patch.content, 20000),
    status: cleanString(patch.status, 30) || existing.status,
    importance: patch.importance === undefined ? existing.importance : clampInt(patch.importance, existing.importance, 0, 100),
    confidence: patch.confidence === undefined
      ? existing.confidence
      : Math.max(0, Math.min(1, Number(patch.confidence) || existing.confidence)),
    tags: patch.tags === undefined ? existing.tags : ensureArray(patch.tags),
    links: patch.links === undefined ? existing.links : normalizeLinks(patch.links),
    source_type: cleanString(patch.source_type, 60) || existing.source_type,
    source_ref: patch.source_ref === undefined ? existing.source_ref : cleanString(patch.source_ref, 1000)
  };

  const nest = cleanString(patch.nest ?? existing.nest ?? '', 200);
  const branch = cleanString(patch.branch ?? existing.branch ?? '', 200);

  const fingerprint = makeFingerprint({
    kind: next.kind, title: next.title, summary: next.summary,
    content: next.content, scope, tags: next.tags
  });
  const searchTerms = buildSearchTerms({
    title: next.title, summary: next.summary, content: next.content,
    scope, tags: next.tags, links: next.links, sourceRef: next.source_ref
  });
  const updatedAt = nowIso();
  const revision = (existing.revisions?.[0]?.revision || 0) + 1;

  await store.adapter.transaction(async (ad) => {
    await ad.run(
      `UPDATE memory_entries
          SET kind = ?, title = ?, summary = ?, content = ?, status = ?,
              importance = ?, confidence = ?,
              scope_root_path = ?, scope_project_path = ?, scope_branch_name = ?, topic = ?, feature = ?,
              nest = ?, branch = ?,
              tags_json = ?, search_terms_json = ?, links_json = ?, source_type = ?, source_ref = ?, fingerprint = ?, updated_at = ?
        WHERE id = ?`,
      [
        next.kind, next.title, next.summary, next.content, next.status,
        next.importance, next.confidence,
        scope.root_path, scope.project_path, scope.branch_name, scope.topic, scope.feature,
        nest, branch,
        stableJson(next.tags), stableJson(searchTerms), stableJson(next.links),
        next.source_type, next.source_ref, fingerprint, updatedAt, id
      ]
    );
    await ad.run(
      `INSERT INTO memory_revisions(
        memory_id, revision, title, summary, content, tags_json, links_json, change_note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, revision, next.title, next.summary, next.content,
        stableJson(next.tags), stableJson(next.links),
        cleanString(patch.change_note || 'Memory updated', 400), updatedAt
      ]
    );
  });

  const embedding = await embedMemory(store, { title: next.title, summary: next.summary, content: next.content });
  if (embedding) {
    await store.adapter.run(
      'UPDATE memory_entries SET embedding_json = ? WHERE id = ?',
      [JSON.stringify(embedding), id]
    );
  }

  return getEntry(store, id);
}

export async function deleteEntry(store: MemoryStoreLike, id: string): Promise<DeleteEntryResult> {
  await store.init();
  const existing = await getEntry(store, id);
  if (!existing) return { deleted: false, id };

  await store.adapter.transaction(async (ad) => {
    await ad.run('DELETE FROM memory_relations WHERE source_id = ? OR target_id = ?', [id, id]);
    await ad.run('DELETE FROM memory_revisions WHERE memory_id = ?', [id]);
    await ad.run('DELETE FROM memory_entries WHERE id = ?', [id]);
  });

  return { deleted: true, id };
}
