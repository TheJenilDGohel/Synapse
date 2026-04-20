import fs from 'node:fs';
import path from 'node:path';
import { NodeSqliteAdapter } from './adapter.js';
import { applySqliteTuning } from './sqlite-tuning.js';
import {
  ensureSchema as ensureMemorySchema,
  runMigrations as runMemoryMigrations
} from './schema.js';
import {
  getStoreStatus,
  listEntries as listMemoryEntries,
  getEntry as getMemoryEntry,
  storeEntry as storeMemoryEntry,
  updateEntry as updateMemoryEntry,
  deleteEntry as deleteMemoryEntry
} from './store/entries.js';
import { storeEntryBatch as storeEntryBatchFn, deleteEntryBatch as deleteEntryBatchFn } from './store/entries-batch.js';
import type { StoreEntryBatchInput, DeleteEntryBatchInput } from './store/entries-batch.js';
import {
  recall as recallFn,
  captureEvent as captureEventFn,
  listEvents as listEventsFn
} from './events/capture.js';
import {
  suggestRelations as suggestRelationsFn,
  addRelation as addRelationFn,
  removeRelation as removeRelationFn,
  getRelated as getRelatedFn
} from './knowledge-graph/relations.js';
import {
  listNests as listNestsFn,
  listBranches as listBranchesFn,
  getTaxonomyTree as getTaxonomyTreeFn
} from './taxonomy/taxonomy.js';
import { traverseGraph as traverseGraphFn, discoverBridges as discoverBridgesFn } from './knowledge-graph/graph.js';
import { writeDiaryEntry as writeDiaryEntryFn, readDiaryEntries as readDiaryEntriesFn } from './taxonomy/scopes.js';
import { checkDuplicate as checkDuplicateFn } from './store/dedup.js';
import { ingestMarkdown as ingestMarkdownFn, ingestJson as ingestJsonFn } from './ingest/ingest.js';
import { MemoryHooks } from './hooks.js';
import {
  addEntity as addEntityFn,
  getEntity as getEntityFn,
  addTriple as addTripleFn,
  invalidateTriple as invalidateTripleFn,
  queryEntityRelationships as queryEntityRelationshipsFn,
  queryTriplesAsOf as queryTriplesAsOfFn,
  getEntityTimeline as getEntityTimelineFn,
  getKgStats as getKgStatsFn,
  deleteEntity as deleteEntityFn
} from './knowledge-graph/kg.js';
import {
  addEntityBatch as addEntityBatchFn,
  addTripleBatch as addTripleBatchFn,
  deleteEntityBatch as deleteEntityBatchFn,
  deleteTripleBatch as deleteTripleBatchFn
} from './knowledge-graph/kg-batch.js';
import { searchTriples as searchTriplesFn } from './knowledge-graph/kg-search.js';
import { backfillMemoryKgLinks as backfillMemoryKgLinksFn } from './knowledge-graph/auto-link.js';
import { getFileMemoryHints as getFileMemoryHintsFn } from './proactive-hints.js';
import { whatsNew as whatsNewFn } from './temporal/whats-new.js';
import { runAudit as runAuditFn } from './audit/dashboard.js';
import type { AddEntityBatchInput, AddTripleBatchInput, DeleteEntityBatchInput, DeleteTripleBatchInput } from './knowledge-graph/kg-batch.js';
import type {
  Adapter, EmbeddingService, ListEntriesOpts, StoreEntryInput, UpdateEntryPatch,
  RecallInput, CaptureEventInput, AddEntityInput, AddTripleInput,
  TraverseGraphOpts, DiscoverBridgesOpts, WriteDiaryInput, ReadDiaryInput,
  DuplicateCheckOpts, IngestOpts, HookEmitResult, BackfillResult,
  ProactiveHintResult, WhatsNewInput, ProjectBackfillOpts, ProjectBackfillResult,
  AuditResult
} from './types.js';

interface MemoryStoreConfig {
  enabled: boolean;
  backend: string;
  dbPath: string;
  embeddingService?: EmbeddingService | null;
}

interface BackendSelection {
  name: string;
  adapter: Adapter;
}

export class MemoryStore {
  enabled: boolean;
  requestedBackend: string;
  dbPath: string;
  embeddingService: EmbeddingService | null;
  hooks: MemoryHooks;
  adapter: Adapter | null;
  selectedBackend: string | null;

  constructor({
    enabled,
    backend,
    dbPath,
    embeddingService
  }: MemoryStoreConfig) {
    this.enabled = enabled;
    this.requestedBackend = backend || 'auto';
    this.dbPath = dbPath;
    this.embeddingService = embeddingService || null;
    this.hooks = new MemoryHooks();
    this.adapter = null;
    this.selectedBackend = null;
  }

  async init(): Promise<Record<string, unknown>> {
    if (!this.enabled) {
      return {
        enabled: false,
        initialized: false,
        requested_backend: this.requestedBackend,
        selected_backend: null
      };
    }

    if (this.adapter) {
      return {
        enabled: true,
        initialized: true,
        requested_backend: this.requestedBackend,
        selected_backend: this.selectedBackend
      };
    }

    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });

    const selected = await this.selectBackend();
    if (!selected) {
      throw new Error('No supported SQLite backend detected for memory store');
    }

    this.adapter = selected.adapter;
    this.selectedBackend = selected.name;
    await applySqliteTuning(this.adapter);
    await this.ensureSchema();

    return {
      enabled: true,
      initialized: true,
      requested_backend: this.requestedBackend,
      selected_backend: this.selectedBackend
    };
  }

  async selectBackend(): Promise<BackendSelection | null> {
    if (this.requestedBackend === 'node-sqlite' || this.requestedBackend === 'auto') {
      try {
        const { DatabaseSync } = await import('node:sqlite');
        const db = new DatabaseSync(this.dbPath);
        return { name: 'node-sqlite', adapter: new NodeSqliteAdapter(db as any) };
      } catch {
        if (this.requestedBackend === 'node-sqlite') return null;
      }
    }

    return null;
  }

  /**
   * Release the underlying database handle. On Windows an open SQLite
   * handle keeps the DB file locked, so tests must call this before
   * deleting temp directories or they fail with `EBUSY: unlink`.
   */
  async close(): Promise<void> {
    if (this.adapter) {
      try { await this.adapter.close?.(); } catch { /* best-effort */ }
      this.adapter = null;
      this.selectedBackend = null;
    }
  }

  async ensureSchema(): Promise<void> {
    await ensureMemorySchema(this.adapter!);
    await runMemoryMigrations({
      adapter: this.adapter!,
      getMeta: (key: string) => this.getMeta(key),
      setMeta: (key: string, value: string) => this.setMeta(key, value)
    });
  }

  async setMeta(key: string, value: string): Promise<void> {
    await this.adapter!.run(
      'INSERT OR REPLACE INTO memory_meta(key, value) VALUES (?, ?)',
      [key, String(value)]
    );
  }

  async getMeta(key: string): Promise<string | null> {
    const row = await this.adapter!.get<{ value: string }>(
      'SELECT value FROM memory_meta WHERE key = ?',
      [key]
    );
    return row ? row.value : null;
  }

  async getStatus() {
    return getStoreStatus(this as never);
  }

  async listEntries(args: ListEntriesOpts) {
    return listMemoryEntries(this as never, args);
  }

  async getEntry(id: string) {
    return getMemoryEntry(this as never, id);
  }

  async storeEntry(input: StoreEntryInput) {
    const hookResult = await this.hooks.emit('before:store', input);
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const result = await storeMemoryEntry(this as never, hookResult.payload as StoreEntryInput);
    await this.hooks.emit('after:store', result);
    return result;
  }

  async storeEntryBatch(input: StoreEntryBatchInput) {
    const hookResult = await this.hooks.emit('before:store:batch', input);
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const result = await storeEntryBatchFn(this as never, hookResult.payload as StoreEntryBatchInput);
    await this.hooks.emit('after:store:batch', result);
    return result;
  }

  async updateEntry(id: string, patch: UpdateEntryPatch = {}) {
    const hookResult = await this.hooks.emit('before:update', { id, patch });
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const payload = hookResult.payload as { id: string; patch: UpdateEntryPatch };
    const result = await updateMemoryEntry(this as never, payload.id, payload.patch);
    await this.hooks.emit('after:update', result);
    return result;
  }

  async deleteEntry(id: string) {
    const hookResult = await this.hooks.emit('before:delete', { id });
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const payload = hookResult.payload as { id: string };
    const result = await deleteMemoryEntry(this as never, payload.id);
    await this.hooks.emit('after:delete', result);
    return result;
  }

  async deleteEntryBatch(input: DeleteEntryBatchInput) {
    const hookResult = await this.hooks.emit('before:delete:batch', input);
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const result = await deleteEntryBatchFn(this as never, hookResult.payload as DeleteEntryBatchInput);
    await this.hooks.emit('after:delete:batch', result);
    return result;
  }

  async recall(args: RecallInput) {
    await this.init();
    const hookResult = await this.hooks.emit('before:recall', args);
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const result = await recallFn(this.adapter!, hookResult.payload as RecallInput);
    await this.hooks.emit('after:recall', result);
    return result;
  }

  async captureEvent(input: CaptureEventInput) {
    await this.init();
    return captureEventFn(this.adapter!, input, {
      storeEntry: ((args: StoreEntryInput) => this.storeEntry(args)) as any,
      updateEntry: ((id: string, patch: Record<string, unknown>) => this.updateEntry(id, patch as UpdateEntryPatch)) as any,
      embeddingService: this.embeddingService
    });
  }

  async listEvents(args: { limit?: number; offset?: number; projectPath?: string }) {
    await this.init();
    return listEventsFn(this.adapter!, args);
  }

  async suggestRelations(memoryId: string, opts: { threshold?: number; maxResults?: number }) {
    await this.init();
    return suggestRelationsFn(this.adapter!, memoryId, opts);
  }

  async addRelation(sourceId: string, targetId: string, relationType?: string) {
    await this.init();
    return addRelationFn(this.adapter!, sourceId, targetId, relationType);
  }

  async removeRelation(sourceId: string, targetId: string) {
    await this.init();
    return removeRelationFn(this.adapter!, sourceId, targetId);
  }

  async getRelated(memoryId: string) {
    await this.init();
    return getRelatedFn(this.adapter!, memoryId);
  }

  async addEntity(args: AddEntityInput) {
    await this.init();
    const hookResult = await this.hooks.emit('before:kg:addEntity', args);
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const result = await addEntityFn(this.adapter!, hookResult.payload as AddEntityInput);
    await this.hooks.emit('after:kg:addEntity', result);
    return result;
  }

  async getEntity(entityId: string) {
    await this.init();
    return getEntityFn(this.adapter!, entityId);
  }

  async addTriple(args: AddTripleInput) {
    await this.init();
    const hookResult = await this.hooks.emit('before:kg:addTriple', args);
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const result = await addTripleFn(this.adapter!, hookResult.payload as AddTripleInput);
    await this.hooks.emit('after:kg:addTriple', result);
    return result;
  }

  async invalidateTriple(tripleId: string, validTo?: string) {
    await this.init();
    const hookResult = await this.hooks.emit('before:kg:invalidate', { tripleId, validTo });
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const payload = hookResult.payload as { tripleId: string; validTo?: string };
    const result = await invalidateTripleFn(this.adapter!, payload.tripleId, payload.validTo);
    await this.hooks.emit('after:kg:invalidate', result);
    return result;
  }

  async queryEntityRelationships(entityId: string, opts: { direction?: string; includeInvalid?: boolean }) {
    await this.init();
    return queryEntityRelationshipsFn(this.adapter!, entityId, opts);
  }

  async queryTriplesAsOf(entityId: string, asOfDate: string, mode?: 'event' | 'transaction') {
    await this.init();
    return queryTriplesAsOfFn(this.adapter!, entityId, asOfDate, mode);
  }

  async getEntityTimeline(entityId: string) {
    await this.init();
    return getEntityTimelineFn(this.adapter!, entityId);
  }

  async getKgStats() {
    await this.init();
    return getKgStatsFn(this.adapter!);
  }

  async searchTriples(args: { query: string; limit?: number }) {
    await this.init();
    return searchTriplesFn(this.adapter!, args);
  }

  async addEntityBatch(args: AddEntityBatchInput) {
    await this.init();
    const hookResult = await this.hooks.emit('before:kg:addEntity', args);
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const result = await addEntityBatchFn(this.adapter!, hookResult.payload as AddEntityBatchInput);
    await this.hooks.emit('after:kg:addEntity', result);
    return result;
  }

  async addTripleBatch(args: AddTripleBatchInput) {
    await this.init();
    const hookResult = await this.hooks.emit('before:kg:addTriple', args);
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const result = await addTripleBatchFn(this.adapter!, hookResult.payload as AddTripleBatchInput);
    await this.hooks.emit('after:kg:addTriple', result);
    return result;
  }

  async deleteEntity(entityId: string) {
    await this.init();
    const hookResult = await this.hooks.emit('before:kg:deleteEntity', { entityId });
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const payload = hookResult.payload as { entityId: string };
    const result = await deleteEntityFn(this.adapter!, payload.entityId);
    await this.hooks.emit('after:kg:deleteEntity', result);
    return result;
  }

  async deleteEntityBatch(args: DeleteEntityBatchInput) {
    await this.init();
    const hookResult = await this.hooks.emit('before:kg:deleteEntity', args);
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const result = await deleteEntityBatchFn(this.adapter!, hookResult.payload as DeleteEntityBatchInput);
    await this.hooks.emit('after:kg:deleteEntity', result);
    return result;
  }

  async deleteTripleBatch(args: DeleteTripleBatchInput) {
    await this.init();
    const hookResult = await this.hooks.emit('before:kg:deleteTriple', args);
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const result = await deleteTripleBatchFn(this.adapter!, hookResult.payload as DeleteTripleBatchInput);
    await this.hooks.emit('after:kg:deleteTriple', result);
    return result;
  }

  async backfillMemoryKgLinks(opts: { limit?: number; offset?: number; nest?: string; branch?: string } = {}): Promise<BackfillResult> {
    await this.init();
    const hookResult = await this.hooks.emit('before:kg:backfill', opts);
    if (hookResult.cancelled) return { memories_scanned: 0, memories_linked: 0, triples_created: 0, errors: 0 };
    const result = await backfillMemoryKgLinksFn(this.adapter!, hookResult.payload as typeof opts);
    await this.hooks.emit('after:kg:backfill', result);
    return result;
  }

  async listNests() {
    await this.init();
    return listNestsFn(this.adapter!);
  }

  async listBranches(nest: string) {
    await this.init();
    return listBranchesFn(this.adapter!, nest);
  }

  async getTaxonomyTree() {
    await this.init();
    return getTaxonomyTreeFn(this.adapter!);
  }

  async traverseGraph(args: TraverseGraphOpts) {
    await this.init();
    const hookResult = await this.hooks.emit('before:graph:traverse', args);
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const result = await traverseGraphFn(this.adapter!, hookResult.payload as TraverseGraphOpts);
    await this.hooks.emit('after:graph:traverse', result);
    return result;
  }

  async discoverBridges(args: DiscoverBridgesOpts) {
    await this.init();
    const hookResult = await this.hooks.emit('before:graph:bridges', args);
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const result = await discoverBridgesFn(this.adapter!, hookResult.payload as DiscoverBridgesOpts);
    await this.hooks.emit('after:graph:bridges', result);
    return result;
  }

  async writeDiaryEntry(args: WriteDiaryInput) {
    await this.init();
    const hookResult = await this.hooks.emit('before:diary:write', args);
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const result = await writeDiaryEntryFn(this.adapter!, hookResult.payload as WriteDiaryInput);
    await this.hooks.emit('after:diary:write', result);
    return result;
  }

  async readDiaryEntries(args: ReadDiaryInput) {
    await this.init();
    return readDiaryEntriesFn(this.adapter!, args);
  }

  async checkDuplicate(content: string, opts: DuplicateCheckOpts = {}) {
    await this.init();
    const hookResult = await this.hooks.emit('before:dedup', { content, opts });
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const payload = hookResult.payload as { content: string; opts: DuplicateCheckOpts };
    const result = await checkDuplicateFn(this.adapter!, this.embeddingService, payload.content, payload.opts);
    await this.hooks.emit('after:dedup', result);
    return result;
  }

  async ingestMarkdown(opts: IngestOpts = {}) {
    await this.init();
    const hookResult = await this.hooks.emit('before:ingest', { type: 'markdown', opts });
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const payload = hookResult.payload as { type: string; opts: IngestOpts };
    const result = await ingestMarkdownFn(this.adapter!, this.embeddingService, payload.opts);
    await this.hooks.emit('after:ingest', result);
    return result;
  }

  async ingestJson(opts: IngestOpts = {}) {
    await this.init();
    const hookResult = await this.hooks.emit('before:ingest', { type: 'json', opts });
    if (hookResult.cancelled) return { cancelled: true, reason: hookResult.reason };
    const payload = hookResult.payload as { type: string; opts: IngestOpts };
    const result = await ingestJsonFn(this.adapter!, this.embeddingService, payload.opts);
    await this.hooks.emit('after:ingest', result);
    return result;
  }

  async getFileMemoryHints(filePath: string, suggestUpdate: boolean = false): Promise<ProactiveHintResult> {
    await this.init();
    const result = await getFileMemoryHintsFn(this.adapter!, filePath, suggestUpdate);
    await this.hooks.emit(suggestUpdate ? 'after:file:changed' : 'after:file:read', result);
    return result;
  }

  async whatsNew(args: WhatsNewInput) {
    await this.init();
    return whatsNewFn(this.adapter!, args);
  }

  async scanAndBackfillProjects(opts: ProjectBackfillOpts): Promise<ProjectBackfillResult> {
    await this.init();
    const hookResult = await this.hooks.emit('before:graph:backfill_projects', opts);
    if (hookResult.cancelled) {
      return { root_path: opts.rootPath, projects_found: 0, projects_backfilled: 0, projects_skipped: 0, dry_run: !!opts.dryRun, projects: [] };
    }
    const { scanAndBackfillProjects: scanFn } = await import('./backfill/project-scan.js');
    const result = await scanFn(this as never, hookResult.payload as ProjectBackfillOpts);
    await this.hooks.emit('after:graph:backfill_projects', result);
    return result;
  }

  async audit(): Promise<AuditResult> {
    await this.init();
    return runAuditFn(this.adapter!);
  }
}
