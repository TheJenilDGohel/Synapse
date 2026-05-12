import fs from 'node:fs';
import path from 'node:path';
import { NodeSqliteAdapter } from '../../adapter.js';
import { applySqliteTuning } from '../../sqlite-tuning.js';
import {
  ensureSchema as ensureMemorySchema
} from '../schema.js';
import { runMigrations as runMemoryMigrations } from '../migrations.js';
import {
  getStoreStatus,
  listEntries as listMemoryEntries,
  getEntry as getMemoryEntry,
  storeEntry as storeMemoryEntry,
  updateEntry as updateMemoryEntry,
  deleteEntry as deleteMemoryEntry
} from './entries.js';
import { storeEntryBatch as storeEntryBatchFn, deleteEntryBatch as deleteEntryBatchFn } from './entries-batch.js';
import type { StoreEntryBatchInput, DeleteEntryBatchInput } from './entries-batch.js';
import {
  recall as recallFn,
  captureEvent as captureEventFn,
  listEvents as listEventsFn
} from '../events/capture.js';
import {
  suggestRelations as suggestRelationsFn,
  addRelation as addRelationFn,
  removeRelation as removeRelationFn,
  getRelated as getRelatedFn
} from '../knowledge-graph/relations.js';
import {
  listNests as listNestsFn,
  listBranches as listBranchesFn,
  getTaxonomyTree as getTaxonomyTreeFn,
  manageBranches as manageBranchesFn
} from '../taxonomy/taxonomy.js';
import { traverseGraph as traverseGraphFn, discoverBridges as discoverBridgesFn } from '../knowledge-graph/graph.js';
import { writeDiaryEntry as writeDiaryEntryFn, readDiaryEntries as readDiaryEntriesFn } from '../taxonomy/scopes.js';
import { checkDuplicate as checkDuplicateFn } from './dedup.js';
import { ingestMarkdown as ingestMarkdownFn, ingestJson as ingestJsonFn } from '../ingest/ingest.js';
import { MemoryHooks } from '../events/hooks.js';
import {
  addEntity as addEntityFn,
  getEntity as getEntityFn,
  addTriple as addTripleFn,
  invalidateTriple as invalidateTripleFn,
  queryEntityRelationships as queryEntityRelationshipsFn,
  listEntities as listEntitiesFn,
  queryTriplesAsOf as queryTriplesAsOfFn,
  getEntityTimeline as getEntityTimelineFn,
  getKgStats as getKgStatsFn,
  deleteEntity as deleteEntityFn
} from '../knowledge-graph/kg.js';
import {
  addEntityBatch as addEntityBatchFn,
  addTripleBatch as addTripleBatchFn,
  deleteEntityBatch as deleteEntityBatchFn,
  deleteTripleBatch as deleteTripleBatchFn
} from '../knowledge-graph/kg-batch.js';
import { searchTriples as searchTriplesFn } from '../knowledge-graph/kg-search.js';
import { backfillMemoryKgLinks as backfillMemoryKgLinksFn } from '../knowledge-graph/auto-link.js';
import { getFileMemoryHints as getFileMemoryHintsFn } from '../utils/proactive-hints.js';
import { whatsNew as whatsNewFn } from '../temporal.js';
import { runAudit as runAuditFn } from '../audit.js';
import type { AddEntityBatchInput, AddTripleBatchInput, DeleteEntityBatchInput, DeleteTripleBatchInput } from '../knowledge-graph/kg-batch.js';
import type {
  Adapter, EmbeddingService, ListEntriesOpts, StoreEntryInput, UpdateEntryPatch,
  RecallInput, CaptureEventInput, AddEntityInput, AddTripleInput,
  TraverseGraphOpts, DiscoverBridgesOpts, WriteDiaryInput, ReadDiaryInput,
  DuplicateCheckOpts, IngestOpts, HookEmitResult, BackfillResult,
  ProactiveHintResult, WhatsNewInput, ProjectBackfillOpts, ProjectBackfillResult,
  AuditResult
} from '../types/index.js';

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

import { DurableStore } from './DurableStore.js';
import { KnowledgeGraphService } from '../knowledge-graph/KnowledgeGraphService.js';
import { TaxonomyService } from '../taxonomy/TaxonomyService.js';
import { IngestionEngine } from '../ingest/IngestionEngine.js';

export class MemoryStore {
  enabled: boolean;
  requestedBackend: string;
  dbPath: string;
  embeddingService: EmbeddingService | null;
  hooks: MemoryHooks;
  adapter: Adapter | null;
  selectedBackend: string | null;

  // Sub-services
  private durableStore!: DurableStore;
  private kgService!: KnowledgeGraphService;
  private taxonomyService!: TaxonomyService;
  private ingestionEngine!: IngestionEngine;

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

    // Initialize sub-services
    this.durableStore = new DurableStore(this.adapter);
    this.kgService = new KnowledgeGraphService(this.adapter);
    this.taxonomyService = new TaxonomyService(this.adapter);
    this.ingestionEngine = new IngestionEngine(this.adapter, this.embeddingService, this.durableStore.hooks);
    this.hooks = this.durableStore.hooks; // Preserve hook reference for backward compatibility

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
    return this.durableStore.listEntries(args);
  }

  async getEntry(id: string) {
    return this.durableStore.getEntry(id);
  }

  async storeEntry(input: StoreEntryInput) {
    return this.durableStore.storeEntry(input);
  }

  async storeEntryBatch(input: StoreEntryBatchInput) {
    return this.durableStore.storeEntryBatch(input);
  }

  async updateEntry(id: string, patch: UpdateEntryPatch = {}) {
    return this.durableStore.updateEntry(id, patch);
  }

  async deleteEntry(id: string) {
    return this.durableStore.deleteEntry(id);
  }

  async deleteEntryBatch(input: DeleteEntryBatchInput) {
    return this.durableStore.deleteEntryBatch(input);
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
    return this.kgService.addEntity(args);
  }

  async getEntity(entityId: string) {
    return this.kgService.getEntity(entityId);
  }

  async addTriple(args: AddTripleInput) {
    return this.kgService.addTriple(args);
  }

  async invalidateTriple(tripleId: string, validTo?: string) {
    return this.kgService.invalidateTriple(tripleId, validTo);
  }

  async queryEntityRelationships(entityId: string, opts: { direction?: string; includeInvalid?: boolean }) {
    return this.kgService.queryEntityRelationships(entityId, opts);
  }

  async listEntities(opts: { type?: string; nameContains?: string; limit?: number; offset?: number } = {}) {
    return this.kgService.listEntities(opts);
  }

  async queryTriplesAsOf(entityId: string, asOfDate: string, mode?: 'event' | 'transaction') {
    return this.kgService.queryTriplesAsOf(entityId, asOfDate, mode);
  }

  async getEntityTimeline(entityId: string) {
    return this.kgService.getEntityTimeline(entityId);
  }

  async getKgStats() {
    return this.kgService.getKgStats();
  }

  async searchTriples(args: { query: string; limit?: number }) {
    return this.kgService.searchTriples(args);
  }

  async addEntityBatch(args: AddEntityBatchInput) {
    return this.kgService.addEntityBatch(args);
  }

  async addTripleBatch(args: AddTripleBatchInput) {
    return this.kgService.addTripleBatch(args);
  }

  async deleteEntity(entityId: string) {
    return this.kgService.deleteEntity(entityId);
  }

  async deleteEntityBatch(args: DeleteEntityBatchInput) {
    return this.kgService.deleteEntityBatch(args);
  }

  async deleteTripleBatch(args: DeleteTripleBatchInput) {
    return this.kgService.deleteTripleBatch(args);
  }

  async backfillMemoryKgLinks(opts: { limit?: number; offset?: number; nest?: string; branch?: string } = {}): Promise<BackfillResult> {
    return this.kgService.backfillMemoryKgLinks(opts);
  }

  async listNests() {
    return this.taxonomyService.listNests();
  }

  async listBranches(nest: string) {
    return this.taxonomyService.listBranches(nest);
  }

  async getTaxonomyTree() {
    return this.taxonomyService.getTaxonomyTree();
  }

  async manageBranches(args: { action: 'merge' | 'rename' | 'delete' | 'list_stale'; nest: string; fromBranch?: string; toBranch?: string; branch?: string; olderThanDays?: number }) {
    return this.taxonomyService.manageBranches(args);
  }

  async traverseGraph(args: TraverseGraphOpts) {
    return this.kgService.traverseGraph(args);
  }

  async discoverBridges(args: DiscoverBridgesOpts) {
    return this.kgService.discoverBridges(args);
  }

  async writeDiaryEntry(args: WriteDiaryInput) {
    await this.init();
    return writeDiaryEntryFn(this.adapter!, args);
  }

  async readDiaryEntries(args: ReadDiaryInput) {
    await this.init();
    return readDiaryEntriesFn(this.adapter!, args);
  }

  async checkDuplicate(content: string, opts: DuplicateCheckOpts = {}) {
    await this.init();
    return checkDuplicateFn(this.adapter!, this.embeddingService, content, opts);
  }

  async ingestMarkdown(opts: IngestOpts = {}) {
    return this.ingestionEngine.ingestMarkdown(opts);
  }

  async ingestJson(opts: IngestOpts = {}) {
    return this.ingestionEngine.ingestJson(opts);
  }

  async getFileMemoryHints(filePath: string, suggestUpdate: boolean = false): Promise<ProactiveHintResult> {
    await this.init();
    return getFileMemoryHintsFn(this.adapter!, filePath, suggestUpdate);
  }

  async whatsNew(args: WhatsNewInput) {
    await this.init();
    return whatsNewFn(this.adapter!, args);
  }

  async scanAndBackfillProjects(opts: ProjectBackfillOpts): Promise<ProjectBackfillResult> {
    const { scanAndBackfillProjects: scanFn } = await import('../backfill.js');
    return scanFn(this as never, opts);
  }

  async audit(): Promise<AuditResult> {
    await this.init();
    return runAuditFn(this.adapter!);
  }

  // Getter for store (DurableStore)
  get store(): DurableStore {
    return this.durableStore;
  }
}
