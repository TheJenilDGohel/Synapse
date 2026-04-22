# Technology Stack

**Project:** Synapse Memory Enhancement
**Researched:** 2026-04-08

## Recommended Stack

### Core Runtime (Existing -- No Changes)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node.js | 22.13+ | Runtime | Required for node:sqlite built-in module |
| node:sqlite | built-in | SQLite access | Zero-dep, synchronous API via DatabaseSync, already in use |
| SQLite | 3.46+ (bundled) | Storage | Single-file DB, recursive CTEs for graph traversal, proven at scale |

### Embedding (Existing -- Reused)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @huggingface/transformers | latest | Embedding pipeline | Already provides MiniLM-L6-v2, reused for semantic dedup |
| all-MiniLM-L6-v2 | - | Embedding model | 384-dim vectors, fast, local, already cached |

### MCP Layer (Existing -- Extended)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| zod | latest | Schema validation | Already used for MCP tool input schemas |
| @modelcontextprotocol/sdk | latest | MCP server | Already the transport layer |

### New Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **None** | - | - | Zero new runtime dependencies required |

All new capabilities are built with existing dependencies:
- Graph traversal: SQLite recursive CTEs (built-in SQL feature)
- Entity extraction: Regex/heuristic patterns (Node.js built-in)
- Conversation parsing: String splitting + JSON.parse (Node.js built-in)
- Semantic dedup: Cosine similarity (already in retrieval/core/relevance.js)
- UUID generation: crypto.randomUUID() (already in use)
- SHA-256 hashing: crypto.createHash() (already in use)

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Graph DB | SQLite recursive CTEs | Neo4j / Memgraph | New dependency, cloud-oriented, overkill for local single-user |
| Graph DB | SQLite recursive CTEs | better-sqlite3 | node:sqlite already works, adding better-sqlite3 duplicates capability |
| Vector store | Existing embedding_json column | ChromaDB | MemPalace uses it but it adds Python dep; sqlite-vec already available |
| Entity extraction | Regex heuristics | LLM-based extraction | No LLM runtime available, offline-first constraint |
| Conversation parsing | Custom parsers | LangChain document loaders | Massive dependency for simple Markdown/JSON parsing |
| Dedup | Cosine similarity | MinHash / LSH | Overkill for <50 candidate comparisons per insert |

## Installation

```bash
# No new packages needed
# Existing install command unchanged:
npm install
```

## Sources

- Existing codebase analysis (HIGH confidence)
- [SQLite recursive CTE docs](https://sqlite.org/lang_with.html) (HIGH confidence)
- [MemPalace analysis](https://github.com/lhl/agentic-memory/blob/main/ANALYSIS-mempalace.md) -- ChromaDB adds Python dependency, avoided (HIGH confidence)
