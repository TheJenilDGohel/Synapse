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
 *   import { SearchService, EmbeddingService } from '../engine/retrieval.js';
 *   const embedder = new EmbeddingService({ provider: 'local', model: 'all-MiniLM-L6-v2' });
 *   const searcher = new SearchService({ workspace, vectorIndex, ... });
 */

// Full-text + semantic hybrid search (CORE-02)
export { SearchService } from '../services/retrieval/search/service.js';

// Dense vector index — JSON (default) and sqlite-vec backends
export { VectorIndexService } from '../services/retrieval/vector-index/service.js';

// Local embedding model service (all-MiniLM-L6-v2 via @huggingface/transformers)
export { EmbeddingService } from '../services/retrieval/embedding/service.js';

// AST-aware code chunker for tree-sitter parsing
export { AstChunker } from '../services/retrieval/chunker/service.js';

// Cross-encoder reranker for result quality improvement
export { RerankerService } from '../services/retrieval/reranker/service.js';

// Symbol-aware code intelligence index (functions, classes, imports)
export { SymbolIndexService } from '../services/retrieval/symbols/index.js';
