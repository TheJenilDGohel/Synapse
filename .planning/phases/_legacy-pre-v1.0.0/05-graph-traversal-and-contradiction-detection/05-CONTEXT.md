# Phase 5: Graph Traversal and Contradiction Detection - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Multi-hop graph traversal via SQLite recursive CTEs — Synapse's key differentiator (MemPalace has NO multi-hop). Cross-nest bridge discovery (entities connected across different nests). Write-time contradiction detection (flag when new triple conflicts with existing valid triple on same subject+predicate).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
- New module: src/services/memory/graph.js
- Recursive CTE with cycle detection (track visited entity IDs)
- Max hops configurable, default 2, hard cap at 5
- Path tracking: each result includes the hop sequence
- Cross-nest bridges: traversal that finds entities whose triples span different nests
- Contradiction detection: on addTriple, check if another valid triple exists with same subject_id + predicate but different object_id — include warning in response, don't block
- Wire through store.js and service.js

</decisions>

<code_context>
## Existing Code Insights

### Key Files
- `src/services/memory/kg.js` — Has addTriple (add contradiction check here), entity/triple queries
- `src/services/memory/taxonomy.js` — Has nest listing (needed for cross-nest bridge detection)
- `src/services/memory/store.js` — Wire graph methods
- `src/services/memory/service.js` — Wire graph methods

</code_context>

<specifics>
## Specific Ideas

Use SQLite recursive CTE pattern:
```sql
WITH RECURSIVE reachable(entity_id, depth, path) AS (
  SELECT ?, 0, ?
  UNION ALL
  SELECT t.object_id, r.depth + 1, r.path || ',' || t.object_id
  FROM kg_triples t JOIN reachable r ON t.subject_id = r.entity_id
  WHERE r.depth < ? AND r.path NOT LIKE '%' || t.object_id || '%'
    AND (t.valid_to IS NULL)
)
SELECT DISTINCT entity_id, depth, path FROM reachable WHERE entity_id != ?
```

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
