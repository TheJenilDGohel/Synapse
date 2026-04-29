# Architecture Patterns

**Domain:** AI Context / MCP
**Researched:** April 2026

## Recommended Architecture

Synapse follows a **Domain-Driven Multi-Layered Architecture** with a strict "downwards isolation" principle.

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `src/interfaces` | External boundaries (CLI, MCP). Orchestrates services. | `src/services`, `src/core` |
| `src/services` | Business logic (Memory, Retrieval, Unified-Find). | `src/core` |
| `src/core` | System fundamentals (Engine, Migrations, Runtime, Setup). | External dependencies (SQLite, fs) |

### Data Flow

1. **Request:** MCP Tool called (e.g., `search_hybrid`).
2. **Orchestration:** `src/interfaces/mcp/tools` delegates to `SearchService`.
3. **Retrieval:**
   - `SearchService` triggers lexical search (Ripgrep).
   - `SearchService` triggers semantic search (`VectorIndex`).
4. **Fusion:** `hybrid-ranking.ts` combines and scores results.
5. **Memory Recall:** (If applicable) `MemoryStore` recalls relevant context, enriched by 1-hop KG facts.
6. **Response:** Unified context returned to AI agent.

## Patterns to Follow

### Pattern 1: Semantic Dedup
**What:** Prevent duplicate memories by checking cosine similarity before storage.
**When:** During `memory_store`.
**Example:**
```typescript
const score = await checkDuplicate(content);
if (score > 0.92) return { status: 'duplicate', id: existingId };
```

### Pattern 2: Temporal Knowledge Graph
**What:** Store triples with `valid_from` and `valid_to` timestamps.
**When:** Every KG modification.
**Rationale:** Enables "time-travel" queries to see architecture state at a specific point in history.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Monolithic Interface
**What:** Putting business logic directly into MCP tool handlers.
**Why bad:** Makes logic untestable without the MCP runtime; prevents reuse in CLI.
**Instead:** Keep interfaces thin; move logic to `services`.

## Scalability Considerations

| Concern | At 1K files | At 100K files |
|---------|--------------|---------------|
| Indexing Time | Seconds | Minutes (needs incremental) |
| Search Latency | <100ms | <500ms (needs HNSW/ANN) |
| Memory Usage | Low | Moderate (embedding model loading) |

## Sources

- `C:\Jenil\synapse\ARCHITECTURE.md`
- `C:\Jenil\synapse\src\core\engine\retrieval\search\service.ts`
- `C:\Jenil\synapse\src\core\engine\memory\store\recall.ts`
