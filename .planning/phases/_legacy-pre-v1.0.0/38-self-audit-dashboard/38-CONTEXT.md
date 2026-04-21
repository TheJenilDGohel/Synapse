# Phase 38: Self-Audit Dashboard -- Context

**Created:** 2026-04-10
**Requirements:** AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04
**Depends on:** Phase 37 (last phase of v0.2.0; audits everything built before it)

## Goal

Users can call `synapse_audit()` once and receive a health report covering memory coverage, KG density, orphaned entities, broken bridges, and stale memories -- the final integrity check for v0.2.0.

## Requirements

| REQ | Description |
|-----|-------------|
| AUDIT-01 | `synapse_audit()` reports memory coverage by project (with/without memories, count per project) |
| AUDIT-02 | `synapse_audit()` reports KG density metrics: total entities, total triples, connected component count, orphaned entities, duplicate triples |
| AUDIT-03 | `synapse_audit()` reports unpopulated nests (memories with empty nest/branch) and broken bridges |
| AUDIT-04 | `synapse_audit()` reports stale memories (never recalled, low importance, older than 30 days) |

## Existing Assets

- `memory_entries` table: has `scope_project_path`, `nest`, `branch`, `last_recalled_at`, `recall_count`, `importance`, `created_at`
- `kg_entities` table: `id`, `name`, `entity_type`, `memory_id`
- `kg_triples` table: `subject_id`, `object_id`, `predicate`, `valid_to`, `source_memory_id`
- `getKgStats()` in `knowledge-graph/kg.ts`: returns entity count, triple count, active triples, by_predicate
- `discoverBridges()` in `knowledge-graph/graph.ts`: finds cross-nest bridges
- MCP tool registration via `registerJsonTool` pattern in `src/mcp/tools/*.ts`
- Store/Service delegation pattern: audit logic -> `store.ts` -> `service.ts` -> MCP tool

## Constraints

- Zero new runtime dependencies
- Files under 500 lines
- Pure SQLite queries (no new tables needed)
- Additive only -- no breaking changes
