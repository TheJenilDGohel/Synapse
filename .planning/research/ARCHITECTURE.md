# Architecture Patterns: AI Memory & Knowledge Graphs

**Domain:** Local-First Agent Infrastructure
**Researched:** 2025-05-22

## Recommended Architecture: "The Federated Brain"

Loci should follow a decoupled storage architecture where the **Semantic**, **Relational**, and **Temporal** layers are specialized but unified by a single query engine.

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **MCP Server Shell** | Protocol handling (JSON-RPC), tool registration. | Client (Claude Code), Core Engine. |
| **AST Parser** | Ingesting code into nodes/edges via Tree-sitter. | Graph Store, Vector Store. |
| **Hybrid Query Engine** | Orchestrating search across Vector + Graph + SQL. | All Storage Layers. |
| **Temporal Tracker** | Managing `valid_from` / `valid_to` timestamps on edges. | Graph Store. |

### Data Flow

1. **Ingestion**: `Code` → `Tree-sitter` → `AST Nodes`.
2. **Memory Extraction**: `Chat Log` → `LLM` → `Atomic Facts`.
3. **Graph Linking**: `Facts` linked to `AST Nodes` (e.g., "Feature X is implemented in function Y").
4. **Query**: `User Query` → `Vector Search (Similarity)` → `Graph Walk (Context Expansion)` → `Context Assembly`.

## Patterns to Follow

### Pattern: Incremental Graph Updates
**What:** Instead of rebuilding the graph on every file change, use a "diff-based" update.
**When:** Real-time IDE integration (Cursor/Windsurf).
**Example:**
```typescript
async function onFileChange(diff) {
  const removedNodes = parseRemoved(diff);
  const addedNodes = parseAdded(diff);
  // Mark old nodes as valid_to = now
  // Add new nodes as valid_from = now
}
```

### Pattern: Context Engineering (Zep-style)
**What:** Don't just return data; return "Context Blocks" pre-formatted for LLM consumption.
**Why:** Saves tokens and improves agent performance.

## Anti-Patterns to Avoid

### Anti-Pattern: Global Flat Context
**What:** Storing all project memories in one giant list.
**Why bad:** Lead to "Context Poisoning" where the agent confuses Project A's rules with Project B.
**Instead:** Implement strict **Task Isolation** or **Project Isolation**.

## Scalability Considerations

| Concern | At 100 files | At 10K files | At 100K files |
|---------|--------------|--------------|---------------|
| **Indexing Time** | < 1s | ~30s | 5-10m (Background thread) |
| **Query Latency** | < 50ms | < 200ms | < 500ms (Requires indexing) |
| **Disk Space** | < 10MB | ~500MB | ~5GB (Includes embeddings) |

## Sources
- [Graphiti Incremental Graph](https://github.com/getzep/graphiti)
- [MCP Architecture](https://modelcontextprotocol.io)
