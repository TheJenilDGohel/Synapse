# Phase 2: Knowledge Graph Core - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Users can store and query structured knowledge as entities and triples with provenance. Schema v6 adds kg_entities and kg_triples tables. Entity CRUD with normalized slug IDs and auto-creation on first triple reference. Triple CRUD with confidence scores and source_memory_id provenance linking.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — infrastructure phase. Follow the architecture research patterns:
- kg_entities table: id (slug), name, entity_type, properties_json, memory_id (optional FK), created_at, updated_at
- kg_triples table: id (triple_uuid), subject_id, predicate, object_id, valid_from, valid_to, confidence, source_memory_id, source_type, created_at
- Entity IDs are normalized slugs (lowercase, spaces to underscores)
- Auto-create entities on first triple reference
- Use the adapter.transaction() method from Phase 1 for atomic triple+entity creation
- New module: src/services/memory/kg.js following the existing adapter-passthrough pattern (like relations.js)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/services/memory/adapter.js` — NodeSqliteAdapter with transaction(fn) method (Phase 1)
- `src/services/memory/schema.js` — Migration infrastructure with per-version transactions (Phase 1)
- `src/services/memory/relations.js` — Pattern for adapter-passthrough function modules
- `src/services/memory/utils.js` — nowIso(), cleanString(), stableJson() utilities

### Established Patterns
- All memory service modules export pure functions accepting (adapter, ...) as first arg
- Schema migrations increment SCHEMA_VERSION constant and add to runMigrations()
- UUID generation via crypto.randomUUID()

### Integration Points
- schema.js needs v6 migration block
- store.js may need to import and wire kg.js
- service.js may need new method forwards for KG operations

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Build the foundation that Phase 3 (temporal queries), Phase 4 (nest/branch), and Phase 5 (traversal) depend on.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
