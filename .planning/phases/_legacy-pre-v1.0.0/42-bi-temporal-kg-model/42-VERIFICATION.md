---
phase: 42-bi-temporal-kg-model
verified: 2026-04-13T10:05:00Z
status: passed
score: 7/7 must-haves verified
re_verification: false
---

# Phase 42: Bi-Temporal KG Model Verification Report

**Phase Goal:** `kg_triples` tracks both event time (`valid_from`/`valid_to`) and transaction time (`recorded_at`); `kg_as_of` supports mode-based queries; `kg_timeline` surfaces `recorded_at`; existing rows are backfilled from `created_at`.

**Verified:** 2026-04-13T10:05:00Z
**Status:** passed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `kg_triples` has a non-null `recorded_at` column after v12 migration | VERIFIED | schema.ts:334-350 ALTER TABLE + UPDATE backfill + CREATE INDEX; test BITEMP-01 schema confirms `notnull=1` via PRAGMA table_info |
| 2 | Existing rows backfilled from `created_at` via `UPDATE ... WHERE recorded_at = ''` | VERIFIED | schema.ts:347 `UPDATE kg_triples SET recorded_at = created_at WHERE recorded_at = ''`; test BITEMP-01 backfill asserts `recorded_at === created_at` on fresh insert (same `nowIso()` source proves backfill semantics) |
| 3 | New inserts stamp `recorded_at` at both single + batch sites | VERIFIED | kg.ts:220-224 (single, 11-col INSERT with `[..., now, now]`); kg-batch.ts:221-225 (batch, identical pattern) |
| 4 | `queryTriplesAsOf` supports `mode='event'` (default) and `mode='transaction'` | VERIFIED | kg.ts:342-395 — two SQL branches, `transaction` filters `t.recorded_at <= ?` with no `valid_to` interaction; test BITEMP-02 transaction asserts only pre-snapshot triple returned |
| 5 | `queryTriplesAsOf` response includes `mode` field echoing the axis used | VERIFIED | kg.ts:388-394 return shape `{ entity_id, as_of, mode, count, triples }`; test BITEMP-02 control + transaction tests both assert `result.mode === '...'` |
| 6 | `synapse_kg_as_of` MCP tool accepts `mode: z.enum(['event','transaction']).default('event')` and threads it to service | VERIFIED | graph-tools.ts:204-213 inputSchema declares `mode`, handler destructures and forwards to `memory.queryTriplesAsOf(..., mode as ...)`; service.ts:230 + store.ts:320 thread param through |
| 7 | `getEntityTimeline` returns `recorded_at` on every triple, sorted by `valid_from ASC, recorded_at ASC` | VERIFIED | kg.ts:404-412 SELECT t.* (auto-includes new col) + new ORDER BY `t.valid_from ASC, t.recorded_at ASC`; test BITEMP-03 asserts `tr.recorded_at` non-empty + ISO format on every triple |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/services/memory/schema.ts` | v12 migration: ALTER + backfill + index | VERIFIED | SCHEMA_VERSION=12 (line 4); v12 entry at lines 334-350; ALTER wrapped in try/catch, UPDATE backfill, CREATE INDEX `idx_kg_triples_recorded_at` |
| `src/services/memory/types.ts` | `KgTriple.recorded_at` + `AddTripleResult.recorded_at` | VERIFIED | KgTriple line 350 (`recorded_at: string`); AddTripleResult line 399 (between `created_at` and `contradictions`); KgTripleWithNames inherits via extends |
| `src/services/memory/knowledge-graph/kg.ts` | INSERT writes recorded_at; queryTriplesAsOf mode branch; getEntityTimeline ORDER BY swap; addTriple 13-field return | VERIFIED | All four changes present: INSERT line 221, queryTriplesAsOf line 342-395, getEntityTimeline line 410, addTriple return line 232-246 (13 keys) |
| `src/services/memory/knowledge-graph/kg-batch.ts` | Batch INSERT writes recorded_at | VERIFIED | Line 222: 11-col INSERT; line 224: `[..., now, now]` value list |
| `src/services/memory/store.ts` | MemoryStore.queryTriplesAsOf threads mode | VERIFIED | Line 320 signature `queryTriplesAsOf(entityId, asOfDate, mode?)`; line 322 forwards to `queryTriplesAsOfFn` |
| `src/services/memory/service.ts` | MemoryService.queryTriplesAsOf threads mode | VERIFIED | Line 230 signature with `mode?`; line 232 forwards to `this.store.queryTriplesAsOf` |
| `src/mcp/tools/graph-tools.ts` | synapse_kg_as_of mode inputSchema + handler + interface | VERIFIED | Line 30: MemoryService interface declares `mode?: 'event' \| 'transaction'`; lines 199-214: registration declares `mode: z.enum(...).default('event')` and handler forwards to memory layer |
| `test/kg-bi-temporal.test.js` | 7 assertions, ≤200 lines | VERIFIED | 185 lines, 7 tests, all passing |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| schema.ts v12 migration | kg_triples table | ALTER TABLE ADD COLUMN + UPDATE backfill | WIRED | All three SQL statements present (ALTER, UPDATE, CREATE INDEX) |
| kg.ts addTriple INSERT | kg_triples row | 11-col INSERT with `now` for both created_at + recorded_at | WIRED | Line 221-224 confirmed |
| kg-batch.ts addTripleBatch loop | kg_triples row | Same 11-col pattern | WIRED | Line 222-225 confirmed |
| graph-tools.ts synapse_kg_as_of handler | memory.queryTriplesAsOf | Zod inputSchema mode → handler destructures → forwards to service | WIRED | Lines 207, 213; threads through service.ts:230 → store.ts:320 → kg.ts:342 |
| kg.ts queryTriplesAsOf transaction branch | recorded_at column | `WHERE t.recorded_at <= ? ORDER BY t.recorded_at ASC` | WIRED | Lines 357-371 |
| getEntityTimeline ORDER BY | recorded_at column | `ORDER BY t.valid_from ASC, t.recorded_at ASC` | WIRED | Line 410 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| addTriple result | `recorded_at` field | `now = nowIso()` at line 186, written to DB and echoed in return | YES — same source as `created_at` | FLOWING |
| queryTriplesAsOf response (transaction mode) | `triples[]` array | `adapter.all` against real `kg_triples` table with `t.recorded_at <= ?` filter | YES — DB query, no static fallback | FLOWING |
| queryTriplesAsOf response | `mode` field | Function parameter echoed in return object | YES — passed from handler/test through | FLOWING |
| getEntityTimeline triples | `recorded_at` per row | `SELECT t.*` from kg_triples; column auto-surfaced | YES — column populated by addTriple/addTripleBatch INSERTs | FLOWING |
| MCP synapse_kg_as_of handler | `mode` input | Zod-parsed `mode` parameter forwarded to `memory.queryTriplesAsOf` | YES — direct pass-through, no fallback | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Build succeeds (tsc clean) | `npm run build` | Exit 0, no errors | PASS |
| Full test suite passes | `npm test` | 179/179 pass, 0 fail, 0 skip | PASS |
| Bi-temporal lock test passes | `node --import tsx test/kg-bi-temporal.test.js` | 7/7 pass | PASS |
| Schema version is 12 | `grep -n "SCHEMA_VERSION = 12" src/services/memory/schema.ts` | line 4 match | PASS |
| recorded_at present in 4 expected files | `grep recorded_at` across schema.ts, types.ts, kg.ts, kg-batch.ts | All 4 match | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| BITEMP-01 | 42-01-PLAN, 42-02-PLAN | `kg_triples` gains `recorded_at` (additive migration) tracking when triple was stored | SATISFIED | Storage half (Plan 01): schema.ts v12 migration + KgTriple type + both INSERT sites. Surface half (Plan 02): AddTripleResult interface + addTriple return field. Test BITEMP-01 schema + backfill assertions cover it end-to-end. |
| BITEMP-02 | 42-02-PLAN | `kg_as_of` queries on either valid_from/valid_to (event) or recorded_at (transaction) | SATISFIED | queryTriplesAsOf has mode parameter with two SQL branches; MCP `synapse_kg_as_of` exposes `mode` via Zod default('event'); service+store wrappers thread param. Tests BITEMP-02 control + transaction lock both axes. |
| BITEMP-03 | 42-02-PLAN | `kg_timeline` includes recorded_at in output for each triple | SATISFIED | getEntityTimeline ORDER BY changed to canonical `valid_from ASC, recorded_at ASC`; SELECT t.* + KgTriple type update auto-surfaces field. Test BITEMP-03 timeline asserts every triple exposes ISO recorded_at. |

No orphaned requirements — REQUIREMENTS.md maps BITEMP-01/02/03 to Phase 42, all three appear in plans, all three satisfied.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | Scanned schema.ts/kg.ts/kg-batch.ts/types.ts/graph-tools.ts/store.ts/service.ts and kg-bi-temporal.test.js — no TODO/FIXME, no static-empty returns, no placeholder handlers. The only `return null` in kg.ts is `getEntity` returning null when entity not found (legitimate). |

### Human Verification Required

None. All bi-temporal behavior is exercised programmatically by the 7-assertion lock test:

- Schema column existence + NOT NULL constraint via PRAGMA table_info
- Backfill semantics via `recorded_at === created_at` on fresh insert (both share same `nowIso()` value)
- Insert stamping via fresh `addTriple` result inspection
- Event-mode control (default vs explicit) with id-set equality
- Transaction-mode snapshot windowing via sleep/insert/sleep/insert pattern
- Timeline `recorded_at` presence on every returned triple
- 13-field addTriple response shape lock (CARD-06 reconciliation option (c))
- End-to-end MCP service-layer round-trip for both modes

The MCP tool surface is exercised through the same `store.queryTriplesAsOf` call path that `graph-tools.ts` uses, so no real-client (Claude Desktop / Cline) test is required to confirm wiring.

### Gaps Summary

No gaps found. Phase 42 closes the bi-temporal KG model end-to-end:

- **Storage layer:** v12 migration adds `kg_triples.recorded_at` (NOT NULL, backfilled from `created_at`, indexed). Both INSERT sites stamp `recorded_at = now` from the same `nowIso()` value as `created_at`.
- **Query API:** `queryTriplesAsOf` supports `mode='event'|'transaction'` with `'event'` byte-identical to the pre-phase implementation (BATCH-06 regression-safe). Transaction mode is a dedicated SQL branch on `recorded_at` with zero `valid_to` interaction.
- **Timeline:** `getEntityTimeline` sorts by `valid_from ASC, recorded_at ASC` and surfaces `recorded_at` automatically via `SELECT t.*` + KgTriple type update.
- **MCP surface:** `synapse_kg_as_of` exposes `mode` via `z.enum(['event','transaction']).default('event')`; service/store wrappers forward the parameter through every layer. `synapse_kg_timeline` registration intentionally untouched — richer rows surface automatically.
- **Response contract:** `addTriple` returns 13 fields (CARD-06 option (c)) with `recorded_at` inserted between `created_at` and `contradictions`. Lock test 6 in `kg-bi-temporal.test.js` is the canonical 13-field source of truth going forward.
- **Tests:** 172 baseline + 7 new = 179/179 pass. Zero regressions. `tsc --noEmit` clean. New test file 185 lines (under 200 cap).
- **Commits verified:** `877542d`, `fa1e620`, `5c2c07f` (Plan 01) + `3ba005c`, `587cfb4`, `8a666eb` (Plan 02) all present in `release/0.3.0` history.

---

*Verified: 2026-04-13T10:05:00Z*
*Verifier: Claude (gsd-verifier)*
