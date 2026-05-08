# Domain Pitfalls: AI Memory & Knowledge Graphs

**Domain:** Agent Memory & Code Intelligence
**Researched:** 2025-05-22

## Critical Pitfalls

Mistakes that cause rewrites or major performance bottlenecks.

### Pitfall 1: The "Everything is a Node" Trap
**What goes wrong:** Trying to represent every single character or minor token as a graph node.
**Why it happens:** Over-enthusiasm for "completeness" in AST representation.
**Consequences:** The graph becomes unqueryable and memory usage explodes (GBs for small repos).
**Prevention:** Use **AST Chunking**. Only index high-level structures (Functions, Classes, Imports, Exports) as nodes. Keep the rest as metadata/text.

### Pitfall 2: Context Drift (Outdated Facts)
**What goes wrong:** The memory says `function X` takes 2 arguments, but it was refactored to take 3. The agent hallucinate based on the old memory.
**Prevention:** Implement **Temporal Validity**. Every memory/link must have a timestamp and be "invalidated" when the underlying code changes (via Git hashes or timestamps).

### Pitfall 3: Vector Similarity Noise
**What goes wrong:** High similarity score for unrelated code (e.g., boilerplate, licensing headers).
**Prevention:** Use **Metadata Filtering**. Filter out `.gitignore` files, node_modules, and use "Recency-Weighted" search.

## Moderate Pitfalls

### Pitfall 1: Entity Resolution Failure
**What goes wrong:** "The Auth Module" and `src/core/auth.ts` are treated as separate things.
**Prevention:** Use LLM-based entity resolution during ingestion to link natural language facts to code paths.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Ingestion** | Large file timeouts | Use worker threads and stream file reading. |
| **Search** | Irrelevant context | Implement "Context Ranking" (reranking) after initial retrieval. |
| **Memory** | Privacy leaks | Use local-first embeddings (e.g. `nomic-embed`). |

## Sources
- [Zep Context Hallucination Post-Mortem](https://getzep.com/blog)
- [Neo4j GraphRAG Best Practices](https://neo4j.com/developer/graph-rag/)
