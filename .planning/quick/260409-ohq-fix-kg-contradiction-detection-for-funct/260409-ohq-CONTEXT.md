---
name: 260409-ohq-CONTEXT
description: Locked decisions for the KG contradiction detection fix
type: quick-context
---

# Quick Task 260409-ohq: Fix KG contradiction detection for functional vs multi-valued predicates — Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Task Boundary

Fix the false-positive contradiction detection in `src/services/memory/knowledge-graph/kg.ts` `addTriple()`. Current logic flags any `(same subject, same predicate, different object, still valid)` as a contradiction. This is wrong for multi-valued predicates like `explores`, `uses`, `depends_on`, `related_to`, `has_tag`, `member_of`.

Introduce a cardinality concept so only FUNCTIONAL predicates (entity can have exactly one valid object at a time) run the contradiction check. Functional examples: `status_is`, `version_is`, `owned_by`, `located_at`, `assigned_to`, `current_state`.

**Real bug instance:** adding `tensorflow_tryon explores Augmented Reality` was flagged as contradicting `tensorflow_tryon explores Artificial Intelligence`. Both should coexist.

**In scope:**
- Cardinality constant in `kg.ts` (hardcoded default list of functional predicates)
- Gating the existing conflict query on cardinality lookup
- Optional `kg_predicate_cardinality` DB table for user overrides (additive migration)
- Regression tests: one multi-valued case (should no longer flag), one functional case (should still flag), one unknown-predicate case (should default to multi-valued, skip check)

**Out of scope:**
- Changing the `addTriple` return shape (same fields, just fewer false-positive contradictions)
- Backfilling or migrating existing triples (contradictions are computed at write time, not stored)
- Auto-invalidation behavior on functional conflict
- UI / MCP tool surface changes beyond the optional override table
- An audit script scanning historical data

</domain>

<decisions>
## Implementation Decisions

### Storage — Hardcoded constant + optional DB override
- Ship a sensible default `FUNCTIONAL_PREDICATES` const in `kg.ts` (or a new `knowledge-graph/cardinality.ts` helper if kg.ts gets too long) with ~15-20 known functional predicates: `status_is`, `version_is`, `owned_by`, `located_at`, `assigned_to`, `current_state`, `parent_of`, `member_of` (questionable — could be multi), `has_type`, `rooted_at`, etc.
- Add an additive schema migration for a new table `kg_predicate_cardinality (predicate TEXT PRIMARY KEY, cardinality TEXT CHECK(cardinality IN ('functional','multi')) NOT NULL, updated_at TEXT NOT NULL)`.
- Lookup order at write time: DB override first (if table has a row for this predicate), then hardcoded default, then fallback.
- Cache the lookup per process to avoid repeated queries on every addTriple — small `Map<string, 'functional' | 'multi'>` seeded from the default list and topped up from DB on first miss.

### Default for unknown predicates — Multi-valued (skip check)
- Permissive default. If a predicate isn't in the hardcoded list AND not in the DB override table, treat it as multi-valued and skip the contradiction query entirely.
- Rationale: most custom predicates agents invent are relations (`explores`, `tagged_with`, `relates_to`). Zero false positives beats zero false negatives for the Synapse use case.
- A real functional predicate that users forgot to register will silently allow conflicting facts — that's acceptable; users can fix it by adding a row to `kg_predicate_cardinality`.

### Migration — No data migration
- Contradictions are computed at write time only. The response's `contradictions` field is never persisted to `kg_triples`. Nothing in the schema needs backfilling.
- The only schema change is the new `kg_predicate_cardinality` table (empty by default — all rules come from hardcoded const unless user adds overrides).
- Deploy risk: zero. Old triples are untouched. Reading them behaves identically.

### Behavior on functional conflict — Preserve current contract
- Writes succeed regardless of contradiction status.
- Response still returns `contradictions: [...]` and `has_contradiction: boolean` — same fields, same shape. The ONLY change is that multi-valued predicates never populate these anymore.
- Callers that want to act on functional conflicts continue to call `kg_invalidate` manually.
- No breaking change for any existing caller. This is a pure bug fix.

### Claude's Discretion
- Exact composition of the default functional predicate list — plan should use the list above as a starting point but can refine based on what Synapse actually uses in its existing code (check `src/services/memory/ingest/ingest.ts` `buildTriples()` to see which predicates conversation ingestion produces, and make sure none of those are accidentally in the functional list).
- Whether to split into a new `knowledge-graph/cardinality.ts` file or inline in `kg.ts` — depends on final kg.ts line count after changes. Both are fine.
- Whether to expose the DB override table via an MCP tool (`synapse_kg_set_cardinality`) — RECOMMEND deferring this to a future task; shipping the table without an MCP setter is fine because users can still write to it via direct SQL or CLI, and the hardcoded list covers the common case. Adding an MCP tool is scope creep for this fix.

</decisions>

<specifics>
## Specific Ideas

### Default functional predicate list (starting point)
```
status_is
version_is
owned_by
located_at
assigned_to
current_state
has_type
parent_of
rooted_at
primary_language
license_is
created_by
```

**Verify first:** Run `grep -r "predicate:" src/services/memory/ingest/` to check what conversation ingestion actually produces, and make sure none of those appear in the functional list. If ingestion uses `mentions`, `references`, `discusses` — those are all multi-valued and should NOT be in the list.

### Minimal code shape
```ts
// In kg.ts or new cardinality.ts
const FUNCTIONAL_PREDICATES = new Set<string>([/* list above */]);
const cardinalityCache = new Map<string, 'functional' | 'multi'>();

async function isPredicateFunctional(adapter: Adapter, predicate: string): Promise<boolean> {
  if (cardinalityCache.has(predicate)) return cardinalityCache.get(predicate) === 'functional';
  // Check DB override
  const row = await adapter.get<{cardinality: string}>(
    'SELECT cardinality FROM kg_predicate_cardinality WHERE predicate = ?',
    [predicate]
  );
  if (row) {
    cardinalityCache.set(predicate, row.cardinality as 'functional' | 'multi');
    return row.cardinality === 'functional';
  }
  // Fallback to hardcoded
  const isFunctional = FUNCTIONAL_PREDICATES.has(predicate);
  cardinalityCache.set(predicate, isFunctional ? 'functional' : 'multi');
  return isFunctional;
}
```

Then in `addTriple`, gate the existing conflict query:
```ts
let conflicting: ConflictRow[] = [];
if (await isPredicateFunctional(ad, pred)) {
  conflicting = await ad.all<ConflictRow>(/* existing query */);
}
```

### Regression tests to add
1. `addTriple({predicate: 'explores', ...})` twice with different objects → `contradictions.length === 0` on both
2. `addTriple({predicate: 'status_is', ...})` twice with different objects → second call returns `contradictions.length === 1`
3. `addTriple({predicate: 'some_made_up_predicate', ...})` twice with different objects → `contradictions.length === 0` (unknown defaults to multi)
4. Insert row into `kg_predicate_cardinality` marking `version_is` as multi-valued (override), then add two `version_is` triples with different objects → `contradictions.length === 0`

</specifics>

<canonical_refs>
## Canonical References

- `src/services/memory/knowledge-graph/kg.ts` lines 109-189 — current `addTriple()` implementation, including the broken contradiction query at lines 148-158
- `src/services/memory/schema.ts` — where the new additive migration goes (check current schema version first, bump by 1)
- `src/services/memory/ingest/ingest.ts` — look at `buildTriples()` to see which predicates conversation ingestion uses, to validate the functional list doesn't trap any of them
- CLAUDE.md — "files under 500 lines" rule; kg.ts should stay under the limit after changes

</canonical_refs>
