# Phase 26: Batch Writes, Dedup, Auto valid_from - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning
**Mode:** Auto-generated (discuss bypassed — REQ-IDs in REQUIREMENTS.md are the spec)

<domain>
## Phase Boundary

Users and agents can submit hundreds of KG entities, triples, or memories in a single call and get back a one-line summary instead of per-row noise, with write-time dedup on `(subject_id, predicate, object_id)` where `valid_to IS NULL`, and auto-stamped `valid_from = NOW()` on every triple.

**In scope (REQ-IDs from REQUIREMENTS.md):**
- BATCH-01: `synapse_kg_add_entities_batch(entities: [])` accepts up to 500 entities per call
- BATCH-02: `synapse_kg_add_triples_batch(triples: [])` accepts up to 500 triples per call
- BATCH-03: `synapse_memory_store_batch(memories: [])` accepts up to 100 memories per call
- BATCH-04: Batch operations are transactional — all succeed or all roll back; partial failures reported per-item with row index
- BATCH-05: Write-time dedup on `(subject_id, predicate, object_id)` where `valid_to IS NULL` — return existing `id` instead of inserting duplicate
- BATCH-06: Auto-stamp `valid_from = NOW()` on every triple at write time when not provided

**Out of scope:**
- Terse response format (Phase 27)
- Cardinality-aware contradiction detection (Phase 28)
- Memory-KG auto-linking (Phase 29)
- Any tree-sitter / symbol work (Phase 32)

</domain>

<decisions>
## Implementation Decisions

### Batch size limits
- KG entities: 500 per call
- KG triples: 500 per call
- Memories: 100 per call (bigger payload per item than triples)
- Over-limit: return a structured error, do NOT silently truncate

### Transaction semantics
- Each batch runs inside a single SQLite transaction via existing `adapter.transaction(...)` wrapper
- Transactional rollback on unexpected errors (DB constraint failures, etc.)
- For expected "soft failures" (duplicates caught by BATCH-05): do NOT fail the batch — record as `duplicates` in the summary and continue
- For per-item validation failures (missing required fields, invalid shape): collect into `errors` array with `index` + `message`, continue processing remaining items

### Response shape
```ts
{
  created: number,      // rows actually inserted
  duplicates: number,   // rows matched existing via (subject, predicate, object) dedup
  errors: Array<{ index: number; message: string }>,
  ids?: string[]        // OPTIONAL — only included when response_format !== 'minimal'
}
```
- Default response: summary counts + errors (no ids array — that's the whole point of batch, avoid per-row noise)
- Include `ids` only when explicitly requested via `response_format: 'verbose'` (Phase 27 will formalize this)

### Dedup
- SQL query: `SELECT id FROM kg_triples WHERE subject_id = ? AND predicate = ? AND object_id = ? AND valid_to IS NULL LIMIT 1`
- If match found: do NOT insert, increment `duplicates` counter, return existing `id` in the (optional) ids array at that row's index
- If no match: insert the new triple
- Dedup runs inside the batch transaction — concurrent duplicate inserts in the same batch are handled by the same logic

### valid_from auto-stamp
- Applied in `addTriple()` and `addTripleBatch()` at the shared lowest-level insert site
- If caller provides `valid_from`: use as-is (even empty string stays null per existing semantics)
- If caller omits `valid_from`: stamp `NOW()` as ISO string (same pattern as `created_at`)
- Does NOT backfill existing rows (per milestone constraint — no data migrations)
- Existing single-insert `addTriple()` also gets the auto-stamp — this is a behavior change for single writes but it's the correct default

### Backwards compatibility
- Existing single-insert tools (`kg_add_entity`, `kg_add_triple`, `memory_store`) are UNCHANGED in API signature
- New batch tools are additive MCP tools, new names, never replace existing ones
- Existing callers who pass `valid_from: null` explicitly: still work (null stays null), no auto-stamp override

### Claude's Discretion
- Whether to share the dedup SQL with the single-insert path or duplicate it (planner decides based on whether the single-insert path currently has similar logic)
- Whether to add a new migration or reuse existing tables (should be reuseable — no schema change needed for batch support, only new tools)
- Exact error message format for validation failures

</decisions>

<code_context>
## Existing Code Insights

### Reusable assets
- `adapter.transaction(async (ad) => {...})` wrapper already handles SQLite transaction begin/commit/rollback
- `addEntity(adapter, ...)` and `addTriple(adapter, ...)` exist in `src/services/memory/knowledge-graph/kg.ts`
- `storeEntry(...)` in `src/services/memory/store/entries.ts` handles memory inserts
- MCP tool registration pattern in `src/mcp/tools/graph-tools.ts` and `src/mcp/tools/memory-store.ts` — zod schemas, handler functions, one-tool-per-registerJsonTool call

### Integration points
- Batch tool registration goes in the existing `registerGraphTools` (for KG batches) and `registerMemoryTools` or similar (for memory batch)
- Transaction batching goes inside the existing `adapter.transaction()` helper — no new infrastructure needed
- Dedup check uses existing `kg_triples` schema — no migration needed

### Established patterns
- zod input schemas for MCP tools (z.array for batch inputs)
- Return JSON objects with `data` wrapper per existing MCP conventions (see tool-utils.ts)
- Error handling: throw typed errors, let the MCP layer format them

</code_context>

<specifics>
## Specific Ideas

- MCP tool names: `synapse_kg_add_entities_batch`, `synapse_kg_add_triples_batch`, `synapse_memory_store_batch`
- Dedup SQL already shown above — single prepared statement per batch iteration
- Auto-stamp valid_from at the bottom of the existing addTriple function: `const vFrom = validFrom ?? nowIso();` instead of `const vFrom = validFrom || null;`
- Tests should cover: happy path (100 items, all succeed), dedup path (50 new + 50 existing), transaction rollback (batch with DB constraint violation rolls back all), oversized batch (>500 items returns structured error)

</specifics>

<deferred>
## Deferred Ideas

- `response_format: 'minimal'` parameter surface — Phase 27
- Terse responses for single writes — Phase 27
- Auto-extract entities from memory content to feed the batch — Phase 29
- CLI wrapper for batch operations (`synapse kg add --batch file.json`) — out of scope, may be added later

</deferred>
