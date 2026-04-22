---
phase: 42-bi-temporal-kg-model
plan: 01
subsystem: database
tags: [sqlite, migrations, knowledge-graph, bi-temporal, recorded_at]

requires:
  - phase: 26-batch-writes
    provides: auto-stamped valid_from + kg_triples batch INSERT site reused by this plan
  - phase: 28-predicate-cardinality
    provides: v11 migration baseline this plan stacks on
provides:
  - Schema v12 migration adding kg_triples.recorded_at (NOT NULL, backfilled from created_at)
  - idx_kg_triples_recorded_at index for transaction-time queries
  - KgTriple / KgTripleWithNames type extended with recorded_at: string
  - Both INSERT sites (single addTriple, batch addTripleBatch) stamp recorded_at at write time
affects: [42-02-PLAN, bitemporal queries, kg_as_of, kg_timeline, MCP graph tools]

tech-stack:
  added: []
  patterns:
    - "Additive ALTER TABLE wrapped in try/catch for idempotent re-run safety"
    - "Backfill pattern: UPDATE ... WHERE col = '' after ADD COLUMN with empty DEFAULT"
    - "Single `now` variable from nowIso() reused for both created_at and recorded_at at INSERT time"

key-files:
  created: []
  modified:
    - src/services/memory/schema.ts (SCHEMA_VERSION 11 -> 12, v12 migration entry)
    - src/services/memory/types.ts (KgTriple.recorded_at added)
    - src/services/memory/knowledge-graph/kg.ts (addTriple INSERT column list)
    - src/services/memory/knowledge-graph/kg-batch.ts (addTripleBatch INSERT column list)

key-decisions:
  - "Additive ALTER — created_at stays as row metadata; recorded_at becomes canonical transaction-time axis"
  - "Stamp recorded_at from the same nowIso() `now` variable as created_at (no bitemporalClock helper per CONTEXT.md discretion)"
  - "addTriple response shape left at 12 fields — Plan 02 owns the CARD-06 reconciliation for a 13th field"
  - "invalidateTriple UPDATE intentionally NOT touched — recorded_at is permanent for each row"

patterns-established:
  - "Bi-temporal migration template: ADD COLUMN ... NOT NULL DEFAULT '' then UPDATE SET new = old WHERE new = '' then CREATE INDEX"
  - "Storage-first split: Plan 01 ships the column + writes; Plan 02 ships the query API + MCP wiring"

requirements-completed: [BITEMP-01]

duration: 2m 23s
completed: 2026-04-13
---

# Phase 42 Plan 01: Bi-Temporal KG Storage Layer Summary

**Additive v12 migration adds `kg_triples.recorded_at` as the canonical transaction-time axis, backfilled from `created_at`, indexed, and stamped by both `addTriple` + `addTripleBatch` INSERT sites.**

## Performance

- **Duration:** 2m 23s
- **Started:** 2026-04-13T09:15:04Z
- **Completed:** 2026-04-13T09:17:27Z
- **Tasks:** 2 / 2
- **Files modified:** 4

## Accomplishments

- Schema v12 migration in place: `ALTER TABLE kg_triples ADD COLUMN recorded_at` + backfill `UPDATE kg_triples SET recorded_at = created_at WHERE recorded_at = ''` + `CREATE INDEX IF NOT EXISTS idx_kg_triples_recorded_at`.
- `SCHEMA_VERSION` bumped from 11 to 12 and verified via direct import (`SCHEMA_VERSION = 12`).
- `KgTriple` interface extended with `recorded_at: string` as the 11th field — `KgTripleWithNames` automatically inherits it via `extends KgTriple`.
- Both `INSERT INTO kg_triples` sites now carry an 11-column list and pass the existing `now = nowIso()` value for both `created_at` and `recorded_at`.
- Full test suite (172/172) and kg-batch suite (11/11) stay green — including BATCH-06 auto-stamped valid_from tests. Zero regressions.
- `tsc --noEmit` clean after every task.

## Task Commits

1. **Task 1: Schema v12 migration (additive ALTER + backfill + index)** — `877542d` (feat)
2. **Task 2: KgTriple type + both INSERT sites stamp recorded_at** — `fa1e620` (feat)

**Plan metadata:** pending final commit after this SUMMARY.

## Files Created/Modified

- `src/services/memory/schema.ts` — bumped `SCHEMA_VERSION` to 12, appended v12 migration entry after the v11 block (376 lines, well under 500).
- `src/services/memory/types.ts` — added `recorded_at: string` to `KgTriple` as the last field after `created_at`.
- `src/services/memory/knowledge-graph/kg.ts` — `addTriple` INSERT column list and value array now include `recorded_at` (second `now` bind). Return object untouched at 12 fields.
- `src/services/memory/knowledge-graph/kg-batch.ts` — `addTripleBatch` loop INSERT column list and value array now include `recorded_at` (second `now` bind). Dedup / error-collection logic untouched.

### Exact SQL shipped (schema.ts v12 migration)

```sql
ALTER TABLE kg_triples ADD COLUMN recorded_at TEXT NOT NULL DEFAULT '';
UPDATE kg_triples SET recorded_at = created_at WHERE recorded_at = '';
CREATE INDEX IF NOT EXISTS idx_kg_triples_recorded_at ON kg_triples(recorded_at);
```

The `ALTER` is wrapped in try/catch so re-running the migration on a partially migrated DB is idempotent (same pattern as every other additive column migration in this file).

### Exact INSERT shipped (kg.ts addTriple & kg-batch.ts addTripleBatch)

```sql
INSERT INTO kg_triples (id, subject_id, predicate, object_id, valid_from,
                        valid_to, confidence, source_memory_id, source_type,
                        created_at, recorded_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

Values: `[id, subId, pred, objId, vFrom, vTo, conf, srcMemId, srcType, now, now]`

## Decisions Made

- **Additive-only schema** — `created_at` stays as row metadata forever. `recorded_at` is now the canonical transaction-time axis for bi-temporal queries. Matches the "no column removals" rule from the v0.2.0 roadmap decisions.
- **Same `now` for both timestamps at INSERT** — reuses the existing `nowIso()` call that was already in scope at both sites. Explicit semantics: a fresh row is recorded (transaction-time) at exactly the same moment it is created (row-metadata time). A future migration or data repair can diverge the two without breaking the model because they live in independent columns.
- **No `bitemporalClock()` helper** — CONTEXT.md explicitly left this to Claude's discretion; inlining `nowIso()` is consistent with the rest of the codebase and avoids introducing a wrapper used in exactly two places.
- **Response shape frozen at 12 fields** — `addTriple`'s return object is untouched. Per CARD-06 reconciliation note in CONTEXT.md option (c), Plan 02 owns the decision of whether to surface a 13th field on the response. The storage layer writes the column today; the response surface stays stable.
- **`invalidateTriple` UPDATE untouched** — per CONTEXT.md: `recorded_at` is forever the row's original transaction time. Invalidation sets `valid_to`, not `recorded_at`.

## Deviations from Plan

None — plan executed exactly as written. Every task completed on first pass, every verification gate green on first run.

## Issues Encountered

None.

## Test Results

- **kg-batch.test.js (baseline + after Task 1 + after Task 2):** 11/11 pass
- **Full `npm test` after Task 2:** 172/172 pass
- **`npx tsc --noEmit` after Task 2:** clean exit (no type errors)
- **SCHEMA_VERSION verification:** `import('./src/services/memory/schema.ts').then(m => console.log(m.SCHEMA_VERSION))` prints `12`

## User Setup Required

None — pure internal schema + code change. No external services, no env vars, no data migration scripts needed beyond the automatic migration runner.

## Next Phase Readiness (Notes for Plan 02 Executor)

Plan 02 can now assume the storage layer is fully bi-temporal. Key hand-off facts:

**1. Field name is `recorded_at`** (not `tx_time`, not `recordedAt`, not `transaction_time`). SQL column + TypeScript property agree.

**2. Migration ran clean.** Additive v12 migration uses the same try/catch + backfill + `CREATE INDEX IF NOT EXISTS` pattern as migrations v7 and v10. Idempotent on re-run. No special care needed.

**3. Exact pre-Plan-02 signature of `queryTriplesAsOf`** (src/services/memory/knowledge-graph/kg.ts:341-372) — this is what Plan 02 must extend:

```typescript
export async function queryTriplesAsOf(
  adapter: Adapter,
  entityId: string,
  asOfDate: string
): Promise<{ entity_id: string; as_of: string; count: number; triples: KgTripleWithNames[] }> {
  // ...
  const resolvedDate = !asOfDate.includes('T') ? `${asOfDate}T23:59:59.999Z` : asOfDate;

  const triples = await adapter.all<KgTripleWithNames>(
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

  return { entity_id: id, as_of: asOfDate, count: triples.length, triples };
}
```

Plan 02 must add an optional `mode: 'event' | 'transaction'` parameter (default `'event'`) per CONTEXT.md — the default branch MUST stay byte-identical to the current WHERE clause so the existing BATCH-06 queryTriplesAsOf test keeps passing unchanged.

**4. `getEntityTimeline` already surfaces `recorded_at`** — its SELECT is already `SELECT t.*, s.name AS subject_name, o.name AS object_name`, which automatically includes the new column. The only change Plan 02 needs for the timeline API is the ORDER BY swap (`ORDER BY t.valid_from ASC, t.recorded_at ASC`) per CONTEXT.md.

**5. CARD-06 field-count decision is OPEN for Plan 02.** The 12-field return object on `addTriple` (kg.ts:232-245) is untouched by this plan. Plan 02's executor should re-read the Phase 28 test that locks the field count / deep-equality, then pick (a) / (b) / (c) per CONTEXT.md. Default recommendation in CONTEXT.md is (c): CARD-06 locks names and order of the 12 known fields, so appending `recorded_at` at position 13 is additive and safe. Verify against the actual test before committing.

**6. MCP wiring** — `synapse_kg_as_of` in `src/mcp/tools/graph-tools.ts` needs a new optional `mode` input; `synapse_kg_timeline` needs no signature change (just returns richer rows). The `KgTripleWithNames` type export already includes `recorded_at` so graph-tools.ts consumers pick up the field automatically.

**7. The new test file `test/kg-bi-temporal.test.js` is Plan 02's responsibility** — explicitly not created here. CONTEXT.md's 7-assertion list is the test plan.

## Self-Check: PASSED

- `src/services/memory/schema.ts` contains SCHEMA_VERSION = 12 and v12 migration — FOUND
- `src/services/memory/types.ts` contains `recorded_at: string` on KgTriple — FOUND (line 350)
- `src/services/memory/knowledge-graph/kg.ts` INSERT column list contains `recorded_at` — FOUND (line 221)
- `src/services/memory/knowledge-graph/kg-batch.ts` INSERT column list contains `recorded_at` — FOUND (line 222)
- Commit 877542d exists in git log — FOUND
- Commit fa1e620 exists in git log — FOUND
- Full test suite 172/172 green — VERIFIED
- `tsc --noEmit` clean — VERIFIED
- SCHEMA_VERSION === 12 via runtime import — VERIFIED

---
*Phase: 42-bi-temporal-kg-model*
*Completed: 2026-04-13*
