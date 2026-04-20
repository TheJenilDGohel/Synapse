# Phase 31: Unified Search `find` - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning
**Mode:** Auto-generated (discuss bypassed -- REQ-IDs in REQUIREMENTS.md are the spec)

<domain>
## Phase Boundary

Agents can call `synapse_find(query)` once and receive fused results from memory entries, code chunks, and KG triples with cross-source re-ranking and clear source tagging. One tool replaces three separate searches.

**In scope (REQ-IDs from REQUIREMENTS.md):**
- FIND-01: `synapse_find(query)` searches memory entries, code chunks, and KG triples in a single call
- FIND-02: Results are re-ranked across all three sources using normalized scores
- FIND-03: Each result includes a `source: "memory" | "code" | "triple"` field
- FIND-04: Returns top 10 across all sources by default, configurable via `limit`

**Out of scope:**
- Symbol-aware code intelligence / tree-sitter (Phase 32)
- Temporal awareness `whats_new` (Phase 33)
- Agent surface slim-down / SKILL.md (Phase 34)
- Batch writes (Phase 26) -- dependency already met
- Terse responses (Phase 27)
- Predicate cardinality (Phase 28)
- Memory-KG auto-linking (Phase 29) -- dependency, assumed complete

</domain>

<decisions>
## Implementation Decisions

### Three data sources
1. **Memory**: reuse existing `recall()` from `src/services/memory/store/recall.ts` which returns `RecallResultItem[]` with `score` (normalized 0-1 via `normalizeRecallScore`) and `raw_score`
2. **Code**: reuse existing `SearchService.searchHybrid()` from `src/services/retrieval/search/service.ts` which returns `FusedResult[]` with `final_score` (RRF-based 0-1 range, typically 0.001-0.03 scale)
3. **KG triples**: new SQL query against `kg_triples` + `kg_entities` with text matching on entity names and predicate, returning scored rows

### Score normalization strategy
Each source produces scores in a different range:
- Memory recall: `normalizeRecallScore()` already outputs 0-1 via `1 - exp(-raw/12)`
- Code hybrid: `final_score` is RRF-based, small numbers (0.001-0.03); normalize by dividing by the max score in the batch to get 0-1
- KG triples: text match scoring (term overlap on subject_name, predicate, object_name); normalize same way

After per-source normalization to 0-1, apply **Reciprocal Rank Fusion (RRF)** across all three ranked lists with k=60 (same constant used in existing hybrid-ranking.ts). This produces a single `find_score` for cross-source ranking.

### Response shape
```ts
interface FindResultItem {
  source: 'memory' | 'code' | 'triple';
  score: number;            // normalized cross-source score (0-1)
  // Memory-specific (when source === 'memory')
  memory_id?: string;
  title?: string;
  summary?: string;
  kind?: string;
  // Code-specific (when source === 'code')
  file?: string;
  start_line?: number;
  end_line?: number;
  snippet?: string;
  // Triple-specific (when source === 'triple')
  subject?: string;
  predicate?: string;
  object?: string;
  triple_id?: string;
}

interface FindResult {
  query: string;
  count: number;
  sources: { memory: number; code: number; triple: number };
  items: FindResultItem[];
}
```

### Per-source fetch limits
- Memory: recall with `limit: max(limit * 2, 20)` to get enough candidates for re-ranking
- Code: searchHybrid with `maxResults: max(limit * 3, 30)` (lexical + semantic oversampling)
- KG: SQL query with `LIMIT max(limit * 2, 20)`

### KG text search implementation
- No FTS5 or embeddings needed -- simple term matching against `kg_entities.name` joined to `kg_triples`
- SQL: match each query term against `subject_name` or `object_name` or `predicate`, score by number of terms matched
- Only search active triples (`valid_to IS NULL`)
- This is intentionally lightweight; semantic KG search can be enhanced in a future phase

### File placement
- New module: `src/services/unified-find/find.ts` (~200-300 lines)
- New MCP tool registration: `src/mcp/tools/find-tools.ts` (~80-100 lines)
- Wire into `src/app/register-tools.ts` alongside existing tool registrations
- Export from `src/mcp/tools/index.ts`

### Optional parameters
- `query`: required, string
- `limit`: optional, default 10, max 50
- `project_path`: optional, passed to both memory recall and code search
- `all_roots`: optional, passed to code search
- `sources`: optional, array of `'memory' | 'code' | 'triple'` to filter which sources are queried (default: all three)

### No new runtime dependencies
- All scoring, normalization, and fusion logic is pure TypeScript
- Reuses existing services via dependency injection

### Claude's discretion
- Whether to run the three source queries in parallel via Promise.all or sequentially
- Exact scoring weights if RRF proves too flat
- Whether to include `related_facts` on memory items (already present in recall output)

</decisions>

<code_context>
## Existing Code Insights

### Reusable assets
- `recall(adapter, opts)` in `src/services/memory/store/recall.ts` -- returns `RecallResult` with normalized scores
- `SearchService.searchHybrid(opts)` in `src/services/retrieval/search/service.ts` -- returns `HybridSearchResult` with fused code results
- `normalizeRecallScore(raw)` in `src/services/memory/utils.ts` -- `1 - exp(-raw/12)`, outputs 0-1
- `fuseRankAndRerank()` in `src/services/retrieval/search/hybrid-ranking.ts` -- RRF fusion with k=60
- `registerJsonTool` pattern from all existing tool files
- `splitTerms(query)` in `src/services/memory/utils.ts` -- tokenizes query into lowercase terms
- `cleanString()` and `nowIso()` utilities

### Integration points
- `registerAppTools()` in `src/app/register-tools.ts` calls all tool registrars; add `registerFindTools()` here
- `services.memory` provides `MemoryService` with `.recall()` method
- `services.search` provides `SearchService` with `.searchHybrid()` method
- Memory adapter is accessed via `memory.store` -> private `adapter` field; for KG queries in find, add a dedicated method on MemoryService/MemoryStore

### Established patterns
- Tool files export a `register*Tools({ registerJsonTool, ...deps })` function
- Service interfaces are defined locally in each tool file (not imported from service files)
- zod schemas define MCP input validation
- All tool handlers are async

### Key score ranges (empirical)
- `RecallResultItem.score`: 0.0-1.0 (sigmoid-normalized)
- `FusedResult.final_score`: ~0.001-0.03 (RRF scale with k=60)
- `FusedResult.rrf_score`: same range as final_score unless reranker applied
- `SemanticResult.semantic_score`: 0.0-1.0 (cosine similarity)

</code_context>

<specifics>
## Specific Ideas

- Run all three source queries in parallel with `Promise.all` for minimum latency
- For KG triple search: `SELECT t.id, s.name AS subject_name, t.predicate, o.name AS object_name FROM kg_triples t JOIN kg_entities s ON s.id = t.subject_id JOIN kg_entities o ON o.id = t.object_id WHERE t.valid_to IS NULL AND (lower(s.name) LIKE ? OR lower(o.name) LIKE ? OR lower(t.predicate) LIKE ?) LIMIT ?`
- Score KG results by counting how many query terms appear in subject_name + predicate + object_name, then normalize to 0-1 by dividing by the max score in the batch
- For cross-source fusion: assign each item a per-source rank (1-based), compute RRF score = 1/(k + rank) per source, sum across sources where the item appears, sort by total RRF score descending
- The `sources` filter parameter lets agents skip expensive code search when they only need memory + KG, or skip memory when they only need code
- Memory items map: `source: 'memory'`, `memory_id`, `title`, `summary`, `kind`, `score`
- Code items map: `source: 'code'`, `file`, `start_line`, `end_line`, `snippet`, `score`
- Triple items map: `source: 'triple'`, `subject`, `predicate`, `object`, `triple_id`, `score`

</specifics>

<deferred>
## Deferred Ideas

- Embedding-based KG search (compute query embedding, compare to entity name embeddings) -- future enhancement
- FTS5 index on kg_entities.name for faster text search -- only needed at scale
- Cross-source boosting (e.g., boost a code result if a related KG entity was also found) -- future phase
- Caching find results across repeated queries -- premature optimization
- Adding `source: 'file'` for file path matches (synapse_search_files) -- could be added later

</deferred>
