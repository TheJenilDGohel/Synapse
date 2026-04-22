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
 *   import { recall, addTriple, traverseGraph } from './memory.js';
 */

// ──────────────────────────────────────────────────────────────────────────────
// High-level MemoryStore facade (lifecycle manager — init, schema, hooks)
// ──────────────────────────────────────────────────────────────────────────────

export { MemoryStore } from './memory/store/MemoryStore.js';
export { MemoryHooks } from './memory/events/hooks.js';
export { MemoryWorkflowService } from './memory/workflow/MemoryWorkflow.js';
export { MemoryService } from './memory/service.js';

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
} from './memory/store/entries.js';

export {
  storeEntryBatch,
  deleteEntryBatch
} from './memory/store/entries-batch.js';

export { checkDuplicate } from './memory/store/dedup.js';

// ──────────────────────────────────────────────────────────────────────────────
// Event capture (adapter-level)
// ──────────────────────────────────────────────────────────────────────────────

export {
  recall,
  captureEvent,
  listEvents
} from './memory/events/capture.js';

// ──────────────────────────────────────────────────────────────────────────────
// Knowledge graph — relations (adapter-level)
// ──────────────────────────────────────────────────────────────────────────────

export {
  suggestRelations,
  addRelation,
  removeRelation,
  getRelated
} from './memory/knowledge-graph/relations.js';

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
} from './memory/knowledge-graph/kg.js';

export {
  addEntityBatch,
  addTripleBatch,
  deleteEntityBatch,
  deleteTripleBatch
} from './memory/knowledge-graph/kg-batch.js';

export { searchTriples } from './memory/knowledge-graph/kg-search.js';
export { backfillMemoryKgLinks } from './memory/knowledge-graph/auto-link.js';

// ──────────────────────────────────────────────────────────────────────────────
// Graph traversal (adapter-level)
// ──────────────────────────────────────────────────────────────────────────────

export {
  traverseGraph,
  discoverBridges
} from './memory/knowledge-graph/graph.js';

// ──────────────────────────────────────────────────────────────────────────────
// Taxonomy — nests, branches, diary (adapter-level)
// ──────────────────────────────────────────────────────────────────────────────

export {
  listNests,
  listBranches,
  getTaxonomyTree
} from './memory/taxonomy/taxonomy.js';

export {
  writeDiaryEntry,
  readDiaryEntries
} from './memory/taxonomy/scopes.js';

// ──────────────────────────────────────────────────────────────────────────────
// Temporal awareness (adapter-level)
// ──────────────────────────────────────────────────────────────────────────────

export { whatsNew } from './memory/temporal.js';

// ──────────────────────────────────────────────────────────────────────────────
// Ingestion (adapter-level)
// ──────────────────────────────────────────────────────────────────────────────

export {
  ingestMarkdown,
  ingestJson
} from './memory/ingest/ingest.js';

// ──────────────────────────────────────────────────────────────────────────────
// Proactive file-memory hints (adapter-level)
// ──────────────────────────────────────────────────────────────────────────────

export { getFileMemoryHints } from './memory/utils/proactive-hints.js';

// ──────────────────────────────────────────────────────────────────────────────
// Self-audit dashboard (adapter-level)
// ──────────────────────────────────────────────────────────────────────────────

export { runAudit } from './memory/audit.js';

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
} from './memory/types/index.js';

export { applySqliteTuning } from './sqlite-tuning.js';
export type { SqliteExecHost } from './sqlite-tuning.js';
