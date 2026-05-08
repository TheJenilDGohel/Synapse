# Hardening Report: Synapse Architectural Analysis

**Analysis Date:** 2025-03-24
**Focus:** Structural Integrity, DRY/SOLID compliance, and Performance (DSA).

## 1. DRY Violations (Logic Duplication)

### 1.1 MCP Tool Normalization
- **Issue:** Duplicated response formatting logic across `src/interfaces/mcp/tools/memory-store.ts` and `src/interfaces/mcp/tools/graph-tools.ts`.
- **Evidence:** Both files manually import and apply `toMinimalWriteResponse` and `applyReadFormatToItems` within their tool handlers.
- **Impact:** Inconsistent implementation of "terse" mode if one file is updated and the other is not.
- **Fix:** Create a shared `McpResponseMapper` or decorator to handle common formatting parameters (`terse`, `item_format`) at the registration level.

### 1.2 Service Interface Definitions
- **Issue:** Redundant `MemoryService` interface definitions in `memory-store.ts` and `graph-tools.ts`.
- **Evidence:** 
  - `src/interfaces/mcp/tools/memory-store.ts` L31-L44
  - `src/interfaces/mcp/tools/graph-tools.ts` L31-L56
- **Fix:** Centralize these in `src/core/interfaces/services.ts`.

---

## 2. SOLID Violations

### 2.1 Single Responsibility Principle (SRP)
- **Primary Offender:** `MemoryStore` (`src/core/engine/memory/store/MemoryStore.ts`)
- **Violations:**
  - **Lifecycle Management:** Handles DB init, backend selection, and closing.
  - **Schema Management:** Handles migrations and metadata.
  - **Durable Storage:** Handles CRUD for memories.
  - **Knowledge Graph:** Handles entities, triples, and graph traversal.
  - **Taxonomy:** Handles nests and branches.
  - **Ingestion:** Handles Markdown/JSON parsing logic.
- **Impact:** High cognitive load, difficult to test in isolation, and "God Object" syndrome.
- **Fix:** Decompose into specialized services: `DurableStore`, `KnowledgeGraph`, `TaxonomyService`, and `IngestionEngine`.

### 2.2 Dependency Inversion Principle (DIP)
- **Primary Offender:** `CoreServiceRegistry` (`src/core/runtime/registry.ts`)
- **Violations:**
  - Hardcoded instantiations of `MemoryService`, `EmbeddingService`, and `SearchService`.
  - Tight coupling with `buildRuntimeConfig()` inside getters.
  - Excessive use of `as any` and `as unknown as` casts, indicating interface mismatches.
- **Impact:** Difficult to swap implementations (e.g., for testing or different cloud providers) without modifying the registry.
- **Fix:** Inject `RuntimeConfig` into the registry; use a factory pattern or a proper DI container; align implementation types with interfaces.

---

## 3. Performance Bottlenecks (DSA Audit)

### 3.1 AST Chunking: `buildScopePath` & `getNodeName`
- **Location:** `src/core/engine/retrieval/chunker/ast-utils.ts`
- **Problem:** For every candidate node, `buildScopePath` traverses up to the root. For each ancestor, `getNodeName` may perform a DFS search for an 'identifier' if `childForFieldName('name')` is missing.
- **Complexity:** $O(N \times D \times S)$ where $N$ is nodes, $D$ is depth, and $S$ is subtree size. This is effectively quadratic for large files.
- **Fix:** Perform a single pass to build a Node -> Name map and Node -> ScopePath map using memoization.

### 3.2 Graph Traversal: `traverseGraph`
- **Location:** `src/core/engine/memory/knowledge-graph/graph.ts`
- **Problem:** Cycle detection uses string manipulation (`INSTR(',' || r.path || ',', ...)`) inside a recursive CTE.
- **Complexity:** String operations in the inner loop of a recursive query are expensive.
- **Fix:** If SQLite 3.34+ is available, use `SEARCH DEPTH FIRST BY` or manage a visited set in a more efficient way if moving to application-layer traversal.

### 3.3 Hybrid Ranking: `fuseRankAndRerank`
- **Location:** `src/core/engine/retrieval/search/hybrid-ranking.ts`
- **Status:** Generally efficient ($O(N)$ with Map lookups), but line-by-line scanning of semantic chunks for lexical hits could be optimized into a Range Map or Interval Tree if chunk sizes grow.

---

## 4. DI Readiness Map (CoreServiceRegistry)

| Service | Dependency Status | Circular Risk |
|---------|-------------------|---------------|
| `MemoryService` | Hardcoded config, direct `EmbeddingService` dependency | Medium |
| `EmbeddingService` | Hardcoded config | Low |
| `SearchService` | Hardcoded `WorkspaceService`, null `VectorIndex` (late-bound) | High |
| `WorkspaceService` | Hardcoded config | Low |

---

## 5. Architectural Vision: Core Engine

### BEFORE: Monolithic & Coupled
```text
[ Registry ] -> [ MemoryStore (GOD OBJECT) ]
             -> [ SearchService ] -> [ WorkspaceService ]
             -> [ EmbeddingService ]
* Services create their own dependencies.
* Config is pulled, not pushed.
* Interfaces are bypassed with 'as any'.
```

### AFTER: Decomposed & Inverted
```text
[ Registry ] 
    |-- Accepts [ RuntimeConfig ]
    |-- Factory [ MemoryEngine ]
    |      |-- [ DurableStore ]
    |      |-- [ KnowledgeGraph ]
    |      |-- [ TaxonomyService ]
    |-- Factory [ SearchEngine ]
    |      |-- [ Indexer ]
    |      |-- [ RetrievalService ]
    |-- Factory [ EmbeddingEngine ]

* Dependency Injection: Services receive interfaces in constructor.
* Reactive Config: Config is pushed from the entry point.
* Type Safety: Strict interface compliance, no casting.
```

---
*Hardening Report generated for Synapse Architectural Hardening Phase.*
