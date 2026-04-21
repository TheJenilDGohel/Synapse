# Phase 3: Temporal Validity - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Users can query the knowledge graph at any point in time and view fact evolution. as_of date parameter on triple queries returns only facts valid at that point. Chronological timeline view for an entity. KG statistics (entity count, triple count, relationship type breakdown).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — infrastructure phase. The kg_triples table already has valid_from and valid_to columns from Phase 2. This phase adds:
- as_of query filtering (WHERE valid_from <= ? AND (valid_to IS NULL OR valid_to > ?))
- Timeline view function (ORDER BY valid_from for a given entity)
- KG stats function (COUNT entities, triples, GROUP BY predicate)
- All functions added to kg.js, wired through store.js and service.js

</decisions>

<code_context>
## Existing Code Insights

### Key Files
- `src/services/memory/kg.js` — KG CRUD from Phase 2 (addEntity, addTriple, queryEntityRelationships, etc.)
- `src/services/memory/store.js` — Store facade with KG methods wired
- `src/services/memory/service.js` — Service facade

### Patterns
- kg.js exports pure functions: (adapter, ...args) => result
- Store/Service forward calls to kg.js functions

</code_context>

<specifics>
## Specific Ideas

No specific requirements — extend existing kg.js with temporal query functions.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
