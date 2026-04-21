/**
 * @module engine/memory
 * Pure memory domain functions — all SQLite-backed cognitive operations.
 *
 * These functions have ZERO dependency on MCP or CLI protocols. They take either
 * an `Adapter` (low-level DB access) or a `MemoryStoreLike` context (app-level
 * store facade) — both are protocol-agnostic.
 *
 * Satisfies CORE-01: all memory store logic is accessible through this module
 * without requiring any server or CLI context.
 *
 * @example
 *   import { recall, addTriple, traverseGraph } from '../engine/memory.js';
 */

// ──────────────────────────────────────────────────────────────────────────────
// High-level MemoryStore facade (lifecycle manager — init, schema, hooks)
// ──────────────────────────────────────────────────────────────────────────────

export { MemoryStore } from '../services/memory/store.js';
export { MemoryHooks } from '../services/memory/hooks.js';
export { MemoryWorkflowService } from '../services/memory/workflow.js';
export { MemoryService } from '../services/memory/service.js';

// ──────────────────────────────────────────────────────────────────────────────
// Entry store operations (adapter-level — CORE-01)
// ──────────────────────────────────────────────────────────────────────────────

export {
  getStoreStatus,
  listEntries,
  getEntry,
  storeEntry,
  updateEntry,
  deleteEntry
} from '../services/memory/store/entries.js';

export {
  storeEntryBatch,
  deleteEntryBatch
} from '../services/memory/store/entries-batch.js';

export { checkDuplicate } from '../services/memory/store/dedup.js';

// ──────────────────────────────────────────────────────────────────────────────
// Event capture (adapter-level)
// ──────────────────────────────────────────────────────────────────────────────

export {
  recall,
  captureEvent,
  listEvents
} from '../services/memory/events/capture.js';

// ──────────────────────────────────────────────────────────────────────────────
// Knowledge graph — relations (adapter-level)
// ──────────────────────────────────────────────────────────────────────────────

export {
  suggestRelations,
  addRelation,
  removeRelation,
  getRelated
} from '../services/memory/knowledge-graph/relations.js';

// ──────────────────────────────────────────────────────────────────────────────
// Knowledge graph — entity/triple operations (adapter-level)
// ──────────────────────────────────────────────────────────────────────────────

export {
  addEntity,
  getEntity,
  addTriple,
  invalidateTriple,
  queryEntityRelationships,
  queryTriplesAsOf,
  getEntityTimeline,
  getKgStats,
  deleteEntity
} from '../services/memory/knowledge-graph/kg.js';

export {
  addEntityBatch,
  addTripleBatch,
  deleteEntityBatch,
  deleteTripleBatch
} from '../services/memory/knowledge-graph/kg-batch.js';

export { searchTriples } from '../services/memory/knowledge-graph/kg-search.js';
export { backfillMemoryKgLinks } from '../services/memory/knowledge-graph/auto-link.js';

// ──────────────────────────────────────────────────────────────────────────────
// Graph traversal (adapter-level)
// ──────────────────────────────────────────────────────────────────────────────

export {
  traverseGraph,
  discoverBridges
} from '../services/memory/knowledge-graph/graph.js';

// ──────────────────────────────────────────────────────────────────────────────
// Taxonomy — nests, branches, diary (adapter-level)
// ──────────────────────────────────────────────────────────────────────────────

export {
  listNests,
  listBranches,
  getTaxonomyTree
} from '../services/memory/taxonomy/taxonomy.js';

export {
  writeDiaryEntry,
  readDiaryEntries
} from '../services/memory/taxonomy/scopes.js';

// ──────────────────────────────────────────────────────────────────────────────
// Temporal awareness (adapter-level)
// ──────────────────────────────────────────────────────────────────────────────

export { whatsNew } from '../services/memory/temporal/whats-new.js';

// ──────────────────────────────────────────────────────────────────────────────
// Ingestion (adapter-level)
// ──────────────────────────────────────────────────────────────────────────────

export {
  ingestMarkdown,
  ingestJson
} from '../services/memory/ingest/ingest.js';

// ──────────────────────────────────────────────────────────────────────────────
// Proactive file-memory hints (adapter-level)
// ──────────────────────────────────────────────────────────────────────────────

export { getFileMemoryHints } from '../services/memory/proactive-hints.js';

// ──────────────────────────────────────────────────────────────────────────────
// Self-audit dashboard (adapter-level)
// ──────────────────────────────────────────────────────────────────────────────

export { runAudit } from '../services/memory/audit/dashboard.js';

// ──────────────────────────────────────────────────────────────────────────────
// Shared memory types — re-exported for consumers of the engine API
// ──────────────────────────────────────────────────────────────────────────────

export type {
  ListEntriesOpts,
  StoreEntryInput,
  UpdateEntryPatch,
  RecallInput,
  CaptureEventInput,
  AddEntityInput,
  AddTripleInput,
  TraverseGraphOpts,
  DiscoverBridgesOpts,
  WriteDiaryInput,
  ReadDiaryInput,
  DuplicateCheckOpts,
  IngestOpts,
  WhatsNewInput,
  BackfillResult,
  ProactiveHintResult,
  AuditResult,
  MemoryEntry,
  MemoryEntryWithRevisions
} from '../services/memory/types.js';
