# Phase 27: Terse Response Format - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode — decisions fully specified by REQUIREMENTS.md)

<domain>
## Phase Boundary

Every write tool gets a `response_format: "minimal" | "verbose"` parameter. Minimal returns `{id, ok}` for single writes, `{created, duplicates, errors}` for batches. Read tools strip empty fields and redundant scores. Target 70% token reduction on write workflows.

</domain>

<decisions>
## Implementation Decisions

### Response Format Parameter
- Add `response_format` input to every write tool (TERSE-01)
- Single write defaults: `verbose` (backwards compat). Batch defaults: `minimal` (already done in Phase 26)
- Minimal single write response shape: `{id: string, ok: true}` (TERSE-02)
- Minimal batch response shape: `{created, duplicates, errors}` — already implemented in Phase 26

### Read Tool Cleanup
- Strip empty string fields (`nest`, `branch`, `topic`, `feature`) from read responses when blank (TERSE-03)
- Strip duplicate `scope_*` prefix fields when non-prefixed equivalents exist (TERSE-03)
- Drop `raw_score` when `score` is also present (TERSE-04)

### Benchmark
- Create a fixed benchmark conversation exercising 10 write calls + 5 read calls (TERSE-05)
- Measure token count before and after — target 70% reduction on write portion

### Claude's Discretion
- Implementation approach: utility function vs per-tool cleanup — Claude decides
- Benchmark conversation content — Claude decides
- Whether to add response_format to read tools too — not required by spec, skip

</decisions>

<code_context>
## Existing Code Insights

### Write Tools Needing response_format
- `synapse_memory_store` (memory-store.ts)
- `synapse_memory_update` (memory-store.ts)
- `synapse_memory_delete` (memory-store.ts)
- `synapse_memory_capture_event` (memory-store.ts)
- `synapse_capture_outcome` (memory-workflow.ts)
- `synapse_kg_add_entity` (graph-tools.ts)
- `synapse_kg_add_triple` (graph-tools.ts)
- `synapse_kg_invalidate` (graph-tools.ts)
- `synapse_diary_write` (graph-tools.ts)
- `synapse_ingest_markdown` (graph-tools.ts)
- `synapse_ingest_json` (graph-tools.ts)
- `synapse_memory_add_relation` (memory-store.ts — if exists)
- `synapse_memory_remove_relation` (memory-store.ts — if exists)

### Batch Tools (Already Have response_format from Phase 26)
- `synapse_kg_add_entities_batch` — default minimal
- `synapse_kg_add_triples_batch` — default minimal
- `synapse_memory_store_batch` — default minimal

### Read Tools Needing Cleanup
- `synapse_memory_recall` (memory-workflow.ts)
- `synapse_search_hybrid` (retrieval.ts)
- `synapse_memory_get` (memory-store.ts)
- `synapse_memory_list` (memory-store.ts)

### Established Patterns
- Tools registered via `registerJsonTool` in src/mcp/tools/*.ts
- Each tool delegates to MemoryService methods
- Response shaping happens at the MCP tool layer, not in service

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond TERSE-01..05 — implementation follows the spec.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
