/**
 * @module engine
 * Synapse Cognitive Engine — the protocol-agnostic core.
 *
 * This is the single public entry point to Synapse's memory, knowledge graph,
 * retrieval, and reasoning capabilities. Everything exported here is usable
 * without any MCP server, CLI, or HTTP context.
 *
 * Milestone: v1.0.0 — Architecture Teardown & Engine Decoupling
 * Requirements satisfied: CORE-01 (SQLite isolation), CORE-02 (stateless retrieval)
 *
 * @example
 *   // Use just the DB adapter and schema
 *   import { NodeSqliteAdapter, ensureSchema } from './engine/database.js';
 *
 *   // Use the full memory domain API
 *   import { recall, addTriple, traverseGraph, MemoryStore } from './engine/memory.js';
 *
 *   // Use semantic search without a server
 *   import { SearchService, EmbeddingService } from './engine/retrieval.js';
 *
 *   // Or import everything from the barrel
 *   import { NodeSqliteAdapter, recall, SearchService } from './engine/index.js';
 */

// Database layer — SQLite adapter, schema, migrations, tuning (CORE-01)
export * from './database.js';

// Memory domain — entries, events, knowledge graph, taxonomy, audit (CORE-01)
export {
  MemoryStore,
  MemoryHooks,
  MemoryWorkflowService,
  MemoryService
} from './memory.js';
export * from './memory.js'; // Keep the rest for types and low-level ops

// Enrichment domain — LLM-powered code metadata generation
export * from './enrichment.js';

// Retrieval services — semantic search, embeddings, vector index (CORE-02)
// Explicitly re-export to resolve ambiguity with EmbeddingService interface in memory types
export {
  SearchService,
  VectorIndexService,
  EmbeddingService,
  AstChunker,
  RerankerService,
  SymbolIndexService,
  unifiedFind,
  WorkspaceService,
  UpdateService
} from './retrieval.js';

// Runtime & Infrastructure — diagnostics, health, setup
export { DiagnosticService } from '../runtime/diagnostics.js';
export type { DoctorCheckResult, DoctorReport } from '../runtime/diagnostics.js';
