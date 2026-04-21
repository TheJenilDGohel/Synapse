# Phase 29: Memory <-> KG Auto-Linking - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode)

<domain>
## Phase Boundary

Every memory capture auto-extracts entities, creates KG triples with source_memory_id provenance, and surfaces 1-hop KG neighbors in recall. Existing disconnected memories can be backfilled retroactively.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices at Claude's discretion — autonomous mode. Key constraints from requirements:
- Entity extraction uses existing regex heuristics (no LLM)
- Auto-link only connects to entities already in KG (no entity spam)
- All auto-link operations non-blocking (memory write succeeds regardless)
- Uses source_type = 'auto_link' for traceability

</decisions>

<code_context>
## Existing Code Insights

Codebase context gathered during plan-phase research.

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond FUSE-01..06.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
