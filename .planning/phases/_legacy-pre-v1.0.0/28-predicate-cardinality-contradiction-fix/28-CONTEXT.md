# Phase 28: Predicate Cardinality & Contradiction Fix - Context

**Gathered:** 2026-04-10
**Status:** Complete (pre-implemented by quick task 260409-ohq)

<domain>
## Phase Boundary

Contradiction detection only fires for functional predicates. Multi-valued and unknown predicates skip the check. DB override table allows per-predicate cardinality control.

All CARD-01..06 requirements implemented by commits fa6a529 (schema v11) and 24596d8 (cardinality gating in kg.ts).

</domain>

<decisions>
## Implementation Decisions

### Already Decided (quick task 260409-ohq)
- 12 hardcoded functional predicates in FUNCTIONAL_PREDICATES Set
- Per-process cardinalityCache Map for fast lookups
- isPredicateFunctional() helper: cache -> DB override -> hardcoded -> default multi
- Contradiction SELECT gated behind isPredicateFunctional check
- Unknown predicates default to multi-valued (permissive)
- addTriple return shape unchanged (12 fields)

</decisions>

<code_context>
## Existing Code Insights

Already committed and working. No additional code changes needed.

</code_context>

<specifics>
## Specific Ideas

None — fully implemented.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
