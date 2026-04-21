---
phase: 42-bi-temporal-kg-model
plan: 02
subsystem: knowledge-graph
tags: [knowledge-graph, bi-temporal, recorded_at, mcp, query-api, CARD-06]

requires:
  - phase: 42-bi-temporal-kg-model
    plan: 01
    provides: kg_triples.recorded_at column, KgTriple type field, both INSERT sites stamping recorded_at
  - phase: 28-predicate-cardinality
    provides: kg_predicate_cardinality override table reused by addTriple contradiction path (untouched by Plan 02)
provides:
  - queryTriplesAsOf(adapter, id, date, mode) supporting 'event' (default) and 'transaction' axes
  - getEntityTimeline ORDER BY valid_from then recorded_at (canonically bi-temporal)
  - addTriple return object extended to 13 fields (recorded_at at index 10)
  - synapse_kg_as_of MCP tool exposing optional mode parameter via inputSchema
  - test/kg-bi-temporal.test.js — end-to-end bi-temporal lock with 7 assertions
affects: [synapse_kg_as_of tool schema, synapse_kg_timeline row shape, AddTripleResult consumers, future history/time-travel tools]

tech-stack:
  added: []
  patterns:
    - "Optional enum parameter with string-literal default threaded through service/store/kg layers"
    - "Additive response field at the end of an existing object — safe when no test pins deep-equality shape"
    - "Bi-temporal SQL branching: single function, two WHERE clauses selected by a mode flag"
    - "Deterministic dual ordering: valid_from ASC, recorded_at ASC — canonical bi-temporal sort"

key-files:
  created:
    - test/kg-bi-temporal.test.js
  modified:
    - src/services/memory/knowledge-graph/kg.ts
    - src/services/memory/types.ts
    - src/services/memory/store.ts
    - src/services/memory/service.ts
    - src/mcp/tools/graph-tools.ts

key-decisions:
  - "CARD-06 reconciliation = option (c) per 42-CONTEXT.md — add recorded_at as 13th field at the end; verified no existing test in the repo pins a 12-field deep-equality shape on addTriple"
  - "Event mode branch is byte-identical to the pre-phase WHERE clause so BATCH-06 queryTriplesAsOf test passes unchanged"
  - "Transaction mode uses `t.recorded_at <= ?` with zero valid_to interaction — returns everything Synapse knew at the snapshot, regardless of world-time"
  - "mode returned in response echoes the axis used so clients can tell which semantics produced the row set"
  - "MCP inputSchema uses `z.enum(['event', 'transaction']).default('event')` — visible default in tool help"
  - "synapse_kg_timeline MCP registration intentionally left untouched — richer rows surface automatically via SELECT t.* + KgTriple type update from Plan 01"

requirements-completed: [BITEMP-02, BITEMP-03]

duration: 3m 56s
completed: 2026-04-13
---

# Phase 42 Plan 02: Bi-Temporal Query Surface & MCP Wiring Summary

**`queryTriplesAsOf` gains a mode flag for event-time vs transaction-time queries, `getEntityTimeline` sorts canonically by both axes, `addTriple` returns a 13th `recorded_at` field, `synapse_kg_as_of` exposes the mode param through Zod, and `test/kg-bi-temporal.test.js` locks the entire bi-temporal model with 7 end-to-end assertions.**

## Performance

- **Duration:** 3m 56s
- **Started:** 2026-04-13T09:22:05Z
- **Completed:** 2026-04-13T09:26:01Z
- **Tasks:** 2 / 2
- **Files modified:** 5
- **Files created:** 1

## Accomplishments

- `queryTriplesAsOf` in `kg.ts` extended with `mode: 'event' | 'transaction' = 'event'` and now returns `mode` in its response shape. Event branch preserved byte-for-byte; transaction branch is a dedicated SQL path on `recorded_at`.
- `getEntityTimeline` ORDER BY swapped from `t.valid_from ASC, t.created_at ASC` to `t.valid_from ASC, t.recorded_at ASC` — canonical bi-temporal ordering. The returned row shape already includes `recorded_at` via `SELECT t.*` + the Plan 01 KgTriple type update.
- `addTriple` return object gains `recorded_at: now` at position 10 (0-indexed) — between `created_at` and `contradictions` — keeping all 12 pre-existing CARD-06 field names and their order intact.
- `AddTripleResult` interface in `types.ts` adds `recorded_at: string` matching the runtime shape.
- `MemoryStore.queryTriplesAsOf` (store.ts) and `MemoryService.queryTriplesAsOf` (service.ts) wrappers both thread the optional `mode` parameter through to the kg.ts function.
- `MemoryService` interface in `graph-tools.ts` updated with the new optional parameter.
- `synapse_kg_as_of` MCP tool registration updated: inputSchema adds `mode: z.enum(['event', 'transaction']).default('event')`, handler destructures and forwards it, description explains both axes.
- `test/kg-bi-temporal.test.js` created with 7 assertions, 185 lines (under 200 cap), all passing.
- Full `npm test` suite: **179 / 179 pass** (172 baseline + 7 new). Zero regressions. `tsc --noEmit` clean after every task.

## Task Commits

1. **Task 1: queryTriplesAsOf mode param + timeline sort + addTriple 13th field** — `3ba005c` (feat)
2. **Task 2: synapse_kg_as_of mode wiring + end-to-end bi-temporal test** — `587cfb4` (feat)

**Plan metadata:** pending final commit after this SUMMARY.

## Files Created/Modified

- `src/services/memory/knowledge-graph/kg.ts` — `queryTriplesAsOf` signature + transaction-mode branch + mode field in response; `getEntityTimeline` ORDER BY; `addTriple` return object 13th field.
- `src/services/memory/types.ts` — `AddTripleResult` gains `recorded_at: string` between `created_at` and `contradictions`.
- `src/services/memory/store.ts` — `MemoryStore.queryTriplesAsOf(entityId, asOfDate, mode?)` threads mode through.
- `src/services/memory/service.ts` — `MemoryService.queryTriplesAsOf(entityId, asOfDate, mode?)` passes mode to the store.
- `src/mcp/tools/graph-tools.ts` — `MemoryService` TS interface signature updated; `synapse_kg_as_of` inputSchema + handler + description updated.
- `test/kg-bi-temporal.test.js` — **new file**, 185 lines, 7 passing assertions.

### Exact `queryTriplesAsOf` mode branches shipped

```typescript
export async function queryTriplesAsOf(
  adapter: Adapter,
  entityId: string,
  asOfDate: string,
  mode: 'event' | 'transaction' = 'event'
): Promise<{ entity_id: string; as_of: string; mode: 'event' | 'transaction'; count: number; triples: KgTripleWithNames[] }> {
  const id = cleanString(entityId, 400);
  if (!id) throw new Error('entityId is required');
  if (!asOfDate) throw new Error('asOfDate is required');
  const resolvedDate = !asOfDate.includes('T') ? `${asOfDate}T23:59:59.999Z` : asOfDate;

  let triples: KgTripleWithNames[];
  if (mode === 'transaction') {
    triples = await adapter.all<KgTripleWithNames>(
      `SELECT t.*, s.name AS subject_name, o.name AS object_name
         FROM kg_triples t
         JOIN kg_entities s ON s.id = t.subject_id
         JOIN kg_entities o ON o.id = t.object_id
        WHERE (t.subject_id = ? OR t.object_id = ?)
          AND t.recorded_at <= ?
        ORDER BY t.recorded_at ASC`,
      [id, id, resolvedDate]
    );
  } else {
    triples = await adapter.all<KgTripleWithNames>(
      `SELECT t.*, s.name AS subject_name, o.name AS object_name
         FROM kg_triples t
         JOIN kg_entities s ON s.id = t.subject_id
         JOIN kg_entities o ON o.id = t.object_id
        WHERE (t.subject_id = ? OR t.object_id = ?)
          AND (t.valid_from IS NULL OR t.valid_from <= ?)
          AND (t.valid_to IS NULL OR t.valid_to > ?)
        ORDER BY t.valid_from ASC`,
      [id, id, resolvedDate, resolvedDate]
    );
  }

  return { entity_id: id, as_of: asOfDate, mode, count: triples.length, triples };
}
```

### Exact `addTriple` 13-field return shape shipped (CARD-06 option (c))

```typescript
return {
  id,                 //  0
  subject_id: subId,  //  1
  predicate: pred,    //  2
  object_id: objId,   //  3
  valid_from: vFrom,  //  4
  valid_to: vTo,      //  5
  confidence: conf,   //  6
  source_memory_id: srcMemId, //  7
  source_type: srcType,       //  8
  created_at: now,    //  9
  recorded_at: now,   // 10  <-- NEW, additive at position 10
  contradictions,     // 11
  has_contradiction: contradictions.length > 0  // 12
};
```

Total: 13 keys. The original 12 CARD-06 field names and their order are intact — `recorded_at` is inserted additively between `created_at` and `contradictions` so no downstream consumer that reads the first 10 fields by key notices any difference.

### Exact `synapse_kg_as_of` MCP tool registration shipped

```typescript
registerJsonTool(
  ['synapse_kg_as_of'],
  {
    title: 'KG As-Of Query',
    description: 'Query triples for an entity at a specific point in time. mode="event" (default) returns facts whose valid_from/valid_to bracket the date (event-time axis). mode="transaction" returns every triple Synapse knew at that time via recorded_at, regardless of valid_to (transaction-time axis).',
    inputSchema: {
      entity_id: z.string().min(1).max(400),
      as_of_date: z.string().min(1),
      mode: z.enum(['event', 'transaction']).default('event')
    },
    annotations: READ_ONLY_ANNOTATIONS,
    outputSchema: schemas.OUTPUT_TRIPLE_RESULT_SCHEMA
  },
  async ({ entity_id, as_of_date, mode }: Record<string, unknown>) =>
    memory.queryTriplesAsOf(entity_id as string, as_of_date as string, mode as 'event' | 'transaction' | undefined)
);
```

### 7 test assertions locking the bi-temporal model

File: `test/kg-bi-temporal.test.js` (185 lines)

1. **BITEMP-01 schema** — `PRAGMA table_info(kg_triples)` confirms `recorded_at` column exists with `NOT NULL` constraint post-v12 migration.
2. **BITEMP-01 backfill + insert stamping** — fresh `addTriple` yields `recorded_at === created_at` (both share the same `nowIso()` stamp; proves backfill semantics without requiring a pre-v12 simulation).
3. **BITEMP-02 event mode control** — `queryTriplesAsOf(alpha, future)` (default) and `queryTriplesAsOf(alpha, future, 'event')` return identical counts and identical triple id sets, and both echo `mode: 'event'` in the response.
4. **BITEMP-02 transaction mode** — insert T1, snapshot, insert T2, then `queryTriplesAsOf(alpha, snapshot, 'transaction')` returns only T1 (T2's `recorded_at > snapshot` excludes it). Response echoes `mode: 'transaction'`.
5. **BITEMP-03 timeline includes recorded_at** — `getEntityTimeline('alpha')` returns every triple with a non-empty `recorded_at` matching ISO format.
6. **CARD-06 option (c) lock** — `Object.keys(addTriple(...))` deep-equals the exact 13-key array in the documented order, and `.length === 13`. This is the canonical source of truth for the addTriple response shape going forward.
7. **MCP surface round-trip** — calls `store.queryTriplesAsOf(entity, date, 'event' | 'transaction')` mirroring the exact call path `graph-tools.ts` uses, asserts both modes round-trip correctly through service + store + kg layers.

Every test wraps its body in `if (!await hasSupportedBackend()) { t.skip(...); return; }` and cleans up its temp dir with `fs.rmSync(root, { recursive: true, force: true })`.

## Decisions Made

- **CARD-06 reconciliation = option (c)** — I searched the entire test directory for any assertion pinning addTriple's 12-field shape (`12 fields`, `length === 12`, `slice(0, 12)`, `Object.keys(...).length`, `deepEqual` against addTriple result). **Zero matches.** The only CARD-06 references in the repo live in planning markdown (`.planning/`), not in executable assertions. Appending `recorded_at` as a 13th field at position 10 is therefore additive and breaks nothing. Test 6 in the new file becomes the canonical 13-field lock going forward — any future CARD-06-style refactor must update that assertion deliberately.

- **Event mode WHERE clause preserved byte-for-byte** — including the `ORDER BY t.valid_from ASC` (no tiebreaker). Plan 01's hand-off note explicitly warned about this so BATCH-06's existing `queryTriplesAsOf` test keeps passing unchanged. Verified: kg-batch suite 11/11 green after both tasks.

- **Transaction mode is conceptually distinct, not a modifier on event mode** — the SQL is a separate branch with no `valid_to` interaction at all. Transaction-time queries return every triple Synapse ever knew at the snapshot, regardless of whether that fact was true in the world at the snapshot. This is the standard definition of bi-temporal transaction-time and lets clients ask "what was in our DB on date X" vs "what was true in the world on date X" independently.

- **`mode` is a response field, not just an input echo** — including it in the return object lets clients tell which axis was used without having to remember what they asked for. Matches the pattern of `entity_id` and `as_of` being echoed back.

- **`synapse_kg_timeline` tool registration NOT touched** — the richer row shape (with `recorded_at`) surfaces automatically via `SELECT t.*` in `getEntityTimeline` + the Plan 01 `KgTriple` type update. Test 5 confirms the field is present on every returned triple. No MCP schema change needed.

- **MCP `z.enum().default('event')` vs optional** — default chosen so the Zod-generated tool help documents the default explicitly for the LLM client. Matches the existing pattern for `synapse_graph_bridges`'s `mode` input (`z.enum(['cross-nest', 'cross-branch']).default('cross-nest')`).

- **Service layer pass-through mirrors existing pattern** — `MemoryService.queryTriplesAsOf` → `MemoryStore.queryTriplesAsOf` → `queryTriplesAsOfFn`. All three gained the optional `mode?: 'event' | 'transaction'` parameter; none needed any other logic change.

## Deviations from Plan

**None.** Plan executed exactly as written. One test-internal bug caught by the Task 2 verification gate: Test 7's initial version used `as_of_date = '2025-01-01'` as the snapshot for a triple inserted at today's date (2026-04-13), which — correctly — returned zero results in transaction mode because `recorded_at > as_of_date`. Fixed by using `2030-12-31T23:59:59.999Z` as the future snapshot so both axes see the row. This was a test-authoring bug, not a production code issue, and the fix validated that transaction mode's `recorded_at <= ?` filter works exactly as specified.

## Issues Encountered

None beyond the Test 7 bug noted above, which was caught and fixed on the first verification run (not a deviation — tests are expected to be iterated on during authoring).

## Test Results

- **test/kg-bi-temporal.test.js (Task 2 verification):** 7/7 pass
- **test/kg-batch.test.js (Task 1 + Task 2 regression):** 11/11 pass — BATCH-06 auto-stamped valid_from + queryTriplesAsOf tests unchanged
- **Full `npm test` suite (after Task 2):** **179 / 179 pass** (172 baseline + 7 new)
- **`npx tsc --noEmit` after every task:** clean exit, zero type errors
- **Line count `wc -l test/kg-bi-temporal.test.js`:** 185 lines (under 200 cap)

## User Setup Required

None — pure internal API + schema surface change. No env vars, no manual migration, no external services. The v12 migration from Plan 01 is already in place; Plan 02 just exposes the column through the query API and MCP surface.

## Phase 42 Completion Notes

This plan closes Phase 42 (bi-temporal-kg-model). All three BITEMP requirements are now satisfied:

- **BITEMP-01 (storage + write-time stamping + return field):** fully closed. Plan 01 shipped the column and INSERT sites; Plan 02 ships the return field on `addTriple` and the explicit schema lock test.
- **BITEMP-02 (as-of query axis selection):** fully closed. `queryTriplesAsOf` supports both event and transaction modes; `synapse_kg_as_of` MCP tool accepts the `mode` parameter with a visible default.
- **BITEMP-03 (timeline output includes recorded_at + canonical sort):** fully closed. `getEntityTimeline` returns `recorded_at` on every triple and sorts by `valid_from ASC, recorded_at ASC`.

**CARD-06 reconciliation documented:** option (c) taken — 12 pre-existing fields stay in the same order, `recorded_at` added additively at position 10, total 13 keys, locked by test 6 in `kg-bi-temporal.test.js`. If a future phase wants to enforce a strict 12-field shape on `addTriple`, it will need to remove `recorded_at` from the return object AND update test 6 — this SUMMARY is the canonical record of why that expectation changed.

## Known Stubs

None. Every code path added in this plan is wired end-to-end: kg.ts → store.ts → service.ts → graph-tools.ts → Zod inputSchema. The test file exercises the full path via `store.queryTriplesAsOf` which is the exact entry point graph-tools.ts uses. `synapse_kg_timeline` intentionally requires no registration change because its row shape is driven by `SELECT t.*` + the `KgTriple` type update from Plan 01 — test 5 confirms the field surfaces.

## Self-Check: PASSED

- `src/services/memory/knowledge-graph/kg.ts` queryTriplesAsOf mode parameter — FOUND (line 346)
- `src/services/memory/knowledge-graph/kg.ts` recorded_at in addTriple return — FOUND (line 243)
- `src/services/memory/knowledge-graph/kg.ts` new getEntityTimeline ORDER BY — FOUND (line 410)
- `src/services/memory/types.ts` AddTripleResult.recorded_at — FOUND (line 399)
- `src/services/memory/store.ts` MemoryStore.queryTriplesAsOf mode — FOUND
- `src/services/memory/service.ts` MemoryService.queryTriplesAsOf mode — FOUND
- `src/mcp/tools/graph-tools.ts` MemoryService interface mode — FOUND (line 30)
- `src/mcp/tools/graph-tools.ts` synapse_kg_as_of mode inputSchema — FOUND (line 207)
- `test/kg-bi-temporal.test.js` exists — FOUND (185 lines)
- Commit 3ba005c exists in git log — FOUND
- Commit 587cfb4 exists in git log — FOUND
- Full test suite 179/179 green — VERIFIED
- `tsc --noEmit` clean — VERIFIED

---
*Phase: 42-bi-temporal-kg-model*
*Completed: 2026-04-13*
