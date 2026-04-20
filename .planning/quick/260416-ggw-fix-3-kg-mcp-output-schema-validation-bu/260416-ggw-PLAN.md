# Quick Task 260416-ggw: Fix KG MCP output schema validation bugs

**Created:** 2026-04-16
**Status:** Ready

## Task 1: Fix kg_query, kg_timeline, kg_as_of output schemas

**Files:** `src/mcp/tools/graph-tools.ts`
**Action:** Change `outputSchema` from `schemas.OUTPUT_TRIPLE_RESULT_SCHEMA` to `schemas.OUTPUT_BUNDLE_RESULT_SCHEMA` for `synapse_kg_query`, `synapse_kg_timeline`, and `synapse_kg_as_of`.

**Why:** These tools return `{entity_id, count, triples: [...]}` objects — bundle-shaped responses, not single-triple or triple-array shapes. The `TRIPLE_RESULT_SCHEMA` union requires `{id: string}` or `[{id}]` or `{items: []}`, none of which match.

**Verify:** Build passes, output validation no longer errors for these 3 tools.

## Task 2: Fix kg_delete_entity output schema

**Files:** `src/mcp/tools/kg-delete-tools.ts`
**Action:** Change import to include `ACK_RESULT_SCHEMA` and change `synapse_kg_delete_entity` `outputSchema` from `BATCH_RESULT_SCHEMA` to `ACK_RESULT_SCHEMA`.

**Why:** `deleteEntity()` returns `{deleted: boolean, entity_id, triples_removed}`. `BATCH_RESULT_SCHEMA` types `deleted` as `z.number().int()` — boolean fails validation. `ACK_RESULT_SCHEMA` uses `.passthrough()` and accepts this shape.

**Verify:** Build passes, delete entity no longer errors on output validation.
