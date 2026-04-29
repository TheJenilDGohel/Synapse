# Domain Pitfalls

**Domain:** AI Development Context
**Researched:** April 2026

## Critical Pitfalls

### Pitfall 1: SQLite Extension Fragmentation
**What goes wrong:** `sqlite-vec` or other extensions fail to load due to OS-specific binary incompatibilities (musl vs glibc, Windows DLLs).
**Why it happens:** In-process extensions require specific compilation for the host environment.
**Consequences:** Semantic search breaks; "vector not supported" errors.
**Prevention:** Use pre-compiled binaries for major platforms; provide clear fallback or troubleshooting guides.

### Pitfall 2: Context Window Pollution
**What goes wrong:** Returning too many irrelevant memories or code chunks.
**Why it happens:** Weak scoring or low similarity thresholds.
**Consequences:** AI agent becomes "confused" by irrelevant context; token cost increases.
**Prevention:** Strict semantic dedup (0.92 threshold) and hybrid ranking (fusing lexical and semantic).

### Pitfall 3: Stale Indices
**What goes wrong:** Search results point to old code or deleted files.
**Why it happens:** Incremental indexing fails to catch every change or is not triggered frequently enough.
**Consequences:** AI attempts to edit non-existent code or uses outdated patterns.
**Prevention:** File-watchers or pre-query staleness checks (as seen in `SearchService.checkStaleness`).

## Moderate Pitfalls

### Pitfall 1: Memory Scoping Leakage
**What goes wrong:** Agent A sees memories intended for Agent B.
**Why it happens:** Flat storage without proper isolation tags.
**Prevention:** Implement "Nests" and "Branches" (agent-scoped isolation) as done in Synapse's `MemoryService`.

## Minor Pitfalls

### Pitfall 1: Resource Exhaustion during Indexing
**What goes wrong:** CPU/RAM spikes when indexing massive repositories.
**Prevention:** AST-aware chunking limits and batching (seen in `src/core/engine/retrieval/sqlite-vec/indexer.ts`).

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Semantic Backend | Performance wall at 10M+ vectors | Transition to `vec1` or HNSW-based store. |
| Metadata Enrichment | High latency during background indexing | Cache by file signature; use small models (1.5B). |
| Multi-Language | Tree-sitter grammar missing | Fallback to line-based chunking. |

## Sources

- `C:\Jenil\synapse\docs\docs\guides\future-retrieval-roadmap.md`
- `C:\Jenil\synapse\src\core\engine\retrieval\search\service.ts`
- `C:\Jenil\synapse\src\core\engine\memory\service.ts`
