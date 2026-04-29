/**
 * @module engine/retrieval
 * Stateless retrieval utilities — semantic search, vector indexing, embeddings,
 * and symbol intelligence.
 *
 * These service classes are independent of server protocols (no MCP, no CLI).
 * They can be instantiated and used in any Node.js context.
 *
 * Satisfies CORE-02: semantic embedding retrieval, hybrid search, and KG traversal
 * exist as stateless utility classes independent of server endpoints.
 *
 * @example
 *   import { SearchService, EmbeddingService } from './retrieval.js';
 *   const embedder = new EmbeddingService({ provider: 'local', model: 'all-MiniLM-L6-v2' });
 *   const searcher = new SearchService({ workspace, vectorIndex, ... });
 */

// Full-text + semantic hybrid search (CORE-02)
export { SearchService } from './retrieval/search/service.js';

// Dense vector index — JSON (default) and sqlite-vec backends
export { VectorIndexService } from './retrieval/vector-index/service.js';

// Local embedding model service (all-MiniLM-L6-v2 via @huggingface/transformers)
export { EmbeddingService } from './retrieval/embedding/service.js';

// AST-aware code chunker for tree-sitter parsing
export { AstChunker } from './retrieval/chunker/service.js';

// Cross-encoder reranker for result quality improvement
export { RerankerService } from './retrieval/reranker/service.js';

// Symbol-aware code intelligence index (functions, classes, imports)
export { SymbolIndexService } from './retrieval/symbols/index.js';

export { unifiedFind } from './unified-find/find.js';
export type { FindInput, FindResult, FindResultItem } from './unified-find/find.js';

// Workspace & Project Discovery
export { WorkspaceService } from './workspace/service.js';

// Update & Lifecycle Management
export * from './update/index.js';

