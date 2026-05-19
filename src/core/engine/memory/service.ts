import fs from 'node:fs';
import path from 'node:path';
import { MemoryStore } from './store/MemoryStore.js';
import type {
  EmbeddingService, ListEntriesOpts, StoreEntryInput, UpdateEntryPatch,
  RecallInput, CaptureEventInput, AddEntityInput, AddTripleInput,
  TraverseGraphOpts, DiscoverBridgesOpts, WriteDiaryInput, ReadDiaryInput,
  DuplicateCheckOpts, IngestOpts, WhatsNewInput, ProjectBackfillOpts
} from './types/index.js';

function parseNodeMajor(version: string | undefined): number {
  const major = Number.parseInt(String(version || '').split('.')[0] || '0', 10);
  return Number.isFinite(major) ? major : 0;
}

interface MemoryServiceConfig {
  synapseHome: string;
  enabled: boolean;
  backend: string;
  dbPath: string;
  autoCapture: boolean;
  consentDone: boolean;
  embeddingService?: EmbeddingService | null;
}

interface BackendDetection {
  requested: string;
  selected: string | null;
  available: boolean;
  reason?: string;
}

export class MemoryService {
  synapseHome: string;
  enabled: boolean;
  backend: string;
  dbPath: string;
  autoCapture: boolean;
  consentDone: boolean;
  store: MemoryStore;

  constructor({
    synapseHome,
    enabled,
    backend,
    dbPath,
    autoCapture,
    consentDone,
    embeddingService
  }: MemoryServiceConfig) {
    this.synapseHome = synapseHome;
    this.enabled = enabled;
    this.backend = backend;
    this.dbPath = dbPath;
    this.autoCapture = autoCapture;
    this.consentDone = consentDone;
    this.store = new MemoryStore({
      enabled,
      backend,
      dbPath,
      embeddingService: embeddingService || null
    });
  }

  getAdapter(): import('./types/index.js').Adapter | null {
    return this.store?.adapter ?? null;
  }

  /**
   * Release the underlying SQLite handle. Delegates to `MemoryStore.close()`
   * which performs the Windows WAL cleanup (truncate + journal_mode=DELETE)
   * before closing so `.db-wal` / `.db-shm` are also released.
   */
  async close(): Promise<void> {
    await this.store?.close?.();
  }

  async detectBackend(): Promise<BackendDetection> {
    const requested = this.backend || 'auto';
    const nodeMajor = parseNodeMajor(process.versions?.node);

    if (requested === 'node-sqlite') {
      return {
        requested,
        selected: await this._supportsNodeSqlite() ? 'node-sqlite' : null,
        available: await this._supportsNodeSqlite()
      };
    }

    if (requested === 'sqlite3') {
      return {
        requested,
        selected: null,
        available: false,
        reason: 'sqlite3 fallback is disabled in published builds due to upstream audit vulnerabilities'
      };
    }

    const supportsNodeSqlite = await this._supportsNodeSqlite();
    if (supportsNodeSqlite) {
      return {
        requested,
        selected: 'node-sqlite',
        available: true,
        reason: nodeMajor >= 22 ? 'built-in node:sqlite available' : 'node:sqlite available'
      };
    }

    return {
      requested,
      selected: null,
      available: false,
      reason: 'No supported SQLite backend detected. Use Node 22.13+ for local memory support.'
    };
  }

  async getStatus(): Promise<Record<string, unknown>> {
    const backend = await this.detectBackend();
    let storeStatus: Record<string, unknown> = {
      initialized: false
    };

    if (this.enabled && backend.available) {
      try {
        storeStatus = await this.store.getStatus() as unknown as Record<string, unknown>;
      } catch (error) {
        storeStatus = {
          initialized: false,
          error: (error as Error)?.message || String(error)
        };
      }
    }

    return {
      enabled: this.enabled,
      auto_capture: this.autoCapture,
      consent_done: this.consentDone,
      requested_backend: this.backend,
      backend,
      db_path: this.dbPath,
      db_exists: fs.existsSync(this.dbPath),
      db_dir: path.dirname(this.dbPath),
      synapse_home: this.synapseHome,
      store: storeStatus
    };
  }

  async listEntries(args: ListEntriesOpts = {}) {
    this.assertEnabled();
    return this.store.listEntries(args);
  }

  async getEntry(id: string) {
    this.assertEnabled();
    return this.store.getEntry(id);
  }

  async storeEntry(input: StoreEntryInput) {
    this.assertEnabled();
    return this.store.storeEntry(input);
  }

  async storeEntryBatch(args: { memories: Array<Record<string, unknown>>; response_format?: 'minimal' | 'verbose' }) {
    this.assertEnabled();
    return this.store.storeEntryBatch(args as any);
  }

  async updateEntry(id: string, patch: UpdateEntryPatch) {
    this.assertEnabled();
    return this.store.updateEntry(id, patch);
  }

  async deleteEntry(id: string) {
    this.assertEnabled();
    return this.store.deleteEntry(id);
  }

  async deleteEntryBatch(args: { ids: string[] }) {
    this.assertEnabled();
    return this.store.deleteEntryBatch(args);
  }

  async recall(args: RecallInput) {
    this.assertEnabled();
    return this.store.recall(args);
  }

  async captureEvent(input: CaptureEventInput) {
    this.assertEnabled();
    return this.store.captureEvent(input);
  }

  async listEvents(args: { limit?: number; offset?: number; projectPath?: string } = {}) {
    this.assertEnabled();
    return this.store.listEvents(args);
  }

  async suggestRelations(memoryId: string, options: { threshold?: number; maxResults?: number } = {}) {
    this.assertEnabled();
    return this.store.suggestRelations(memoryId, options);
  }

  async addRelation(sourceId: string, targetId: string, relationType = 'related') {
    this.assertEnabled();
    return this.store.addRelation(sourceId, targetId, relationType);
  }

  async removeRelation(sourceId: string, targetId: string) {
    this.assertEnabled();
    return this.store.removeRelation(sourceId, targetId);
  }

  async getRelated(memoryId: string) {
    this.assertEnabled();
    return this.store.getRelated(memoryId);
  }

  async addEntity(args: AddEntityInput) {
    this.assertEnabled();
    return this.store.addEntity(args);
  }

  async getEntity(entityId: string) {
    this.assertEnabled();
    return this.store.getEntity(entityId);
  }

  async addTriple(args: AddTripleInput) {
    this.assertEnabled();
    return this.store.addTriple(args);
  }

  async invalidateTriple(tripleId: string, validTo?: string) {
    this.assertEnabled();
    return this.store.invalidateTriple(tripleId, validTo);
  }

  async queryEntityRelationships(entityId: string, opts: { direction?: string; includeInvalid?: boolean } = {}) {
    this.assertEnabled();
    return this.store.queryEntityRelationships(entityId, opts);
  }

  async listEntities(opts: { type?: string; nameContains?: string; limit?: number; offset?: number } = {}) {
    this.assertEnabled();
    return this.store.listEntities(opts);
  }

  async queryTriplesAsOf(entityId: string, asOfDate: string, mode?: 'event' | 'transaction') {
    this.assertEnabled();
    return this.store.queryTriplesAsOf(entityId, asOfDate, mode);
  }

  async getEntityTimeline(entityId: string) {
    this.assertEnabled();
    return this.store.getEntityTimeline(entityId);
  }

  async getKgStats() {
    this.assertEnabled();
    return this.store.getKgStats();
  }

  async searchTriples(args: { query: string; limit?: number }) {
    this.assertEnabled();
    return this.store.searchTriples(args);
  }

  async addEntityBatch(args: { entities: Array<Record<string, unknown>>; response_format?: string }) {
    this.assertEnabled();
    return this.store.addEntityBatch(args as any);
  }

  async addTripleBatch(args: { triples: Array<Record<string, unknown>>; response_format?: string }) {
    this.assertEnabled();
    return this.store.addTripleBatch(args as any);
  }

  async deleteEntity(entityId: string) {
    this.assertEnabled();
    return this.store.deleteEntity(entityId);
  }

  async deleteEntityBatch(args: { entity_ids: string[] }) {
    this.assertEnabled();
    return this.store.deleteEntityBatch(args);
  }

  async deleteTripleBatch(args: { triple_ids: string[] }) {
    this.assertEnabled();
    return this.store.deleteTripleBatch(args);
  }

  async backfillMemoryKgLinks(opts: { limit?: number; offset?: number; nest?: string; branch?: string } = {}) {
    this.assertEnabled();
    return this.store.backfillMemoryKgLinks(opts);
  }

  async listNests() {
    this.assertEnabled();
    return this.store.listNests();
  }

  async listBranches(nest: string) {
    this.assertEnabled();
    return this.store.listBranches(nest);
  }

  async getTaxonomyTree() {
    this.assertEnabled();
    return this.store.getTaxonomyTree();
  }

  async manageBranches(args: { action: 'merge' | 'rename' | 'delete' | 'list_stale'; nest: string; fromBranch?: string; toBranch?: string; branch?: string; olderThanDays?: number }) {
    this.assertEnabled();
    return this.store.manageBranches(args);
  }

  async traverseGraph(args: TraverseGraphOpts) {
    this.assertEnabled();
    return this.store.traverseGraph(args);
  }

  async discoverBridges(args: DiscoverBridgesOpts) {
    this.assertEnabled();
    return this.store.discoverBridges(args);
  }

  async writeDiaryEntry(args: WriteDiaryInput) {
    this.assertEnabled();
    return this.store.writeDiaryEntry(args);
  }

  async readDiaryEntries(args: ReadDiaryInput) {
    this.assertEnabled();
    return this.store.readDiaryEntries(args);
  }

  async checkDuplicate(content: string, opts: DuplicateCheckOpts = {}) {
    this.assertEnabled();
    return this.store.checkDuplicate(content, opts);
  }

  async ingestMarkdown(opts: IngestOpts = {}) {
    this.assertEnabled();
    return this.store.ingestMarkdown(opts);
  }

  async ingestJson(opts: IngestOpts = {}) {
    this.assertEnabled();
    return this.store.ingestJson(opts);
  }

  async whatsNew(args: WhatsNewInput) {
    this.assertEnabled();
    return this.store.whatsNew(args);
  }

  async getFileMemoryHints(filePath: string, suggestUpdate: boolean = false) {
    this.assertEnabled();
    return this.store.getFileMemoryHints(filePath, suggestUpdate);
  }

  async scanAndBackfillProjects(opts: ProjectBackfillOpts) {
    this.assertEnabled();
    return this.store.scanAndBackfillProjects(opts);
  }

  async audit() {
    this.assertEnabled();
    return this.store.audit();
  }

  assertEnabled(): void {
    if (!this.enabled) {
      throw new Error('Local memory is disabled. Re-run synapse setup and opt in to memory.');
    }
  }

  private async _supportsNodeSqlite(): Promise<boolean> {
    try {
      const mod = await import('node:sqlite');
      return Boolean((mod as Record<string, unknown>)?.DatabaseSync);
    } catch {
      return false;
    }
  }
}
