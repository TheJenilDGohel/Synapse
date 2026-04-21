# Phase 42: Bi-Temporal KG Model - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning
**Mode:** Smart discuss (accept-recommended)

<domain>
## Phase Boundary

Every row in `kg_triples` tracks both event time (`valid_from`/`valid_to` —
when the fact was true in the world) AND transaction time (`recorded_at` —
when Synapse learned the fact). `kg_as_of` can query on either axis via a
new `mode` parameter. `kg_timeline` includes `recorded_at` in its output.
Existing rows are backfilled from the current `created_at` column. The
existing `created_at` column stays as row metadata for backwards compat;
`recorded_at` becomes the canonical transaction-time axis.

Out of scope: backfilling missing `valid_from` values, changing the response
shape of `addTriple`, renaming existing columns, dropping `created_at`,
multi-version history tables (`kg_triple_history`).

</domain>

<decisions>
## Implementation Decisions

### Schema Migration — v12 Additive (Accepted)
- Add migration `version: 12` to `src/services/memory/schema.ts` that runs
  `ALTER TABLE kg_triples ADD COLUMN recorded_at TEXT NOT NULL DEFAULT ''`.
- Immediately follow with
  `UPDATE kg_triples SET recorded_at = created_at WHERE recorded_at = ''`
  to backfill every existing row from its current `created_at`.
- Add index:
  `CREATE INDEX IF NOT EXISTS idx_kg_triples_recorded_at ON kg_triples(recorded_at)`.
- No column is removed. No existing query breaks. `created_at` remains as
  row metadata (matches every other table's convention) — not the canonical
  transaction-time axis anymore.

### Insert Sites — Stamp at Write Time (Accepted)
- Update every `INSERT INTO kg_triples (...)` site to include the new
  `recorded_at` column:
  - `src/services/memory/knowledge-graph/kg.ts:221` (addTriple)
  - `src/services/memory/knowledge-graph/kg-batch.ts:222` (batch)
- Both sites pass `new Date().toISOString()` as `recorded_at` at INSERT time.
  This is typically the same timestamp as `created_at` (which is already
  set at insert time), but the two are stored independently so a future
  migration or data repair can diverge them without breaking the model.
- UPDATEs that set `valid_to` (invalidation) do NOT touch `recorded_at` —
  `recorded_at` is forever the row's original transaction time.

### `kg_as_of` Mode Parameter (Accepted)
- Extend `queryTriplesAsOf(adapter, entityId, asOfDate, mode)` with a new
  optional `mode: 'event' | 'transaction'` parameter, defaulting to `'event'`.
  Existing callers get unchanged behavior (event-time queries on
  `valid_from`/`valid_to`).
- `mode: 'transaction'` changes the WHERE clause to
  `t.recorded_at <= ? AND (t.valid_to IS NULL OR t.recorded_at < ?)` —
  actually, simpler: `t.recorded_at <= ?`. Transaction-time queries return
  every triple that Synapse knew at that time, regardless of whether the
  fact was true in the world. No `valid_to` interaction.
- Response shape adds `mode` field echoing which axis was used:
  `{ entity_id, as_of, mode, count, triples }`.
- MCP tool `synapse_kg_as_of` exposes the `mode` parameter as an optional
  input.

### `kg_timeline` Output (Accepted)
- Update `getEntityTimeline()` SELECT to include `t.recorded_at` in the
  returned rows (it's already `SELECT t.*` — wait, `SELECT t.*` already
  includes every column, so this is automatic for the query. Verify the
  `KgTripleWithNames` type includes `recorded_at` so the field surfaces in
  TypeScript callers).
- Update the `KgTriple`/`KgTripleWithNames` type definition to add
  `recorded_at: string` so downstream code gets the field typed.
- Sort order in `getEntityTimeline` changes from
  `ORDER BY t.valid_from ASC, t.created_at ASC` to
  `ORDER BY t.valid_from ASC, t.recorded_at ASC` — still deterministic,
  now canonically bi-temporal.

### Response Shape — Additive Only (Accepted)
- `addTriple` response keeps its existing 12 fields (Phase 28 CARD-06 locked
  this). `recorded_at` is added as a 13th field via `SELECT *` passthrough
  — this is additive so it doesn't break CARD-06.
- Actually verify: CARD-06 requires `addTriple` to return exactly 12 fields
  in the same order. Adding a 13th additively at the END of the object may
  or may not violate CARD-06's letter. The planner must re-read CARD-06 and
  decide whether to (a) explicitly include `recorded_at` (breaks CARD-06
  field-count), (b) explicitly exclude it from `addTriple` response while
  still storing in the table, or (c) confirm CARD-06 only locks field names
  and order for the 12 known fields, not forbidding additions.
- Default recommendation: (c) — CARD-06 locks names and order of the 12
  known fields; adding a 13th field at the end is additive and doesn't
  change anything the test asserts on. Planner confirms during plan.

### Test Strategy (Accepted)
- New `test/kg-bi-temporal.test.js` with the following assertions:
  1. v12 migration adds `recorded_at` column (introspect `PRAGMA table_info`)
  2. Existing rows backfilled: every row has non-empty `recorded_at` after
     migration, and `recorded_at === created_at` for pre-migration rows
  3. New inserts stamp `recorded_at` to NOW at insert time
  4. `queryTriplesAsOf(entity, date, 'event')` returns same results as the
     pre-phase implementation (control)
  5. `queryTriplesAsOf(entity, date, 'transaction')` returns only triples
     where `recorded_at <= date`, regardless of `valid_to`
  6. `getEntityTimeline` response includes `recorded_at` on every item
  7. `addTriple` response includes `recorded_at` as a 13th field (if
     decision (c) is taken)
- Total: 7 assertions, ≤200 lines.

### Claude's Discretion
- CARD-06 reconciliation (a/b/c above) — planner picks based on reading the
  Phase 28 test.
- Whether to add a helper `bitemporalClock()` function for clock stamping
  or inline `new Date().toISOString()`. Inline is fine; helper is future
  work.
- Whether to expose `mode` via an enum or a string literal type. String
  literal is consistent with existing MCP tool schemas.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/services/memory/schema.ts` has 11 migrations (lines 151-333). The
  next is v12. Migration pattern: `ALTER TABLE` in try/catch, then backfill.
- `src/services/memory/knowledge-graph/kg.ts:221-224` has the single-row
  `INSERT INTO kg_triples` site for `addTriple`.
- `src/services/memory/knowledge-graph/kg-batch.ts:222` has the batch
  INSERT site for `addTriplesBatch`.
- `src/services/memory/knowledge-graph/kg.ts:341-372` has `queryTriplesAsOf`
  — the target for the `mode` parameter.
- `src/services/memory/knowledge-graph/kg.ts:374-396` has `getEntityTimeline`
  — already returns `t.*` which will automatically surface the new column
  once the TypeScript type is updated.
- `KgTriple`/`KgTripleWithNames` type definitions live adjacent to these
  functions and need a `recorded_at: string` field added.

### Established Patterns
- Additive schema migrations wrap ALTER TABLE in try/catch and use IF NOT
  EXISTS on indexes. The v7 migration at schema.ts:257-271 is the closest
  template.
- MCP tool handlers that accept new optional parameters thread them through
  Zod schemas in the tool registration (`inputSchema`), then into the
  service layer function. See Phase 28 (kg_predicate_cardinality) for the
  most recent example.
- Clock stamping uses `new Date().toISOString()` consistently across the
  codebase — no helper needed.

### Integration Points
- `synapse_kg_as_of` MCP tool in `src/mcp/tools/graph-tools.ts` — update
  its inputSchema to accept `mode?: 'event' | 'transaction'` and pass it
  through to `queryTriplesAsOf`.
- `synapse_kg_timeline` MCP tool in `src/mcp/tools/graph-tools.ts` — no
  signature change needed (just returns more fields in each triple object).
- The `KgTripleWithNames` type is exported from the knowledge-graph module
  and consumed by graph-tools.ts. Updating the type surfaces the new field
  to TypeScript consumers automatically.
- Phase 28 response shape lock (`addTriple` 12 fields) is in the existing
  test suite — verify it still passes after the planned additive change.

</code_context>

<specifics>
## Specific Ideas

- The new test file `test/kg-bi-temporal.test.js` should create an
  in-memory DB fixture, run the v12 migration from a pre-v12 baseline (via
  manipulating `memory_meta.schema_version`), and assert backfill behavior.
- `queryTriplesAsOf` should throw on `mode: 'transaction'` if
  `asOfDate` is not a valid ISO string (tighter than the current
  loose string handling) — prevents accidentally comparing a date-only
  string against a full ISO timestamp.
- The MCP tool schema for `mode` should use `z.enum(['event', 'transaction']).default('event')` so omission is explicit and the default is visible in the tool's help text.

</specifics>

<deferred>
## Deferred Ideas

- Separate `kg_triple_history` versioning table — deferred. Current model
  (valid_to invalidation + recorded_at at write time) is sufficient for
  v0.3.0 bi-temporal needs.
- Renaming `created_at` → `recorded_at` — deferred forever. `created_at`
  stays as row metadata; the semantics are now explicit.
- Backfilling missing `valid_from` for pre-Phase-26 rows — deferred. Phase
  26 already auto-stamps `valid_from` on new inserts; legacy rows with
  null `valid_from` stay as-is.
- Multi-version timeline (same triple id at multiple `recorded_at`) —
  deferred. Current invalidation model uses different ids for each version.
- Bitemporal audit dashboard — deferred to Phase 38 (self-audit) if that
  ever lands.

</deferred>
