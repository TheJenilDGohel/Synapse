---
phase: quick-260409-ohq
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/services/memory/schema.ts
  - src/services/memory/knowledge-graph/kg.ts
  - test/kg-cardinality.test.js
autonomous: true
requirements:
  - QUICK-260409-OHQ-01
must_haves:
  truths:
    - "Calling addTriple twice with the same subject and a multi-valued predicate (e.g. explores) and different objects returns has_contradiction: false on both calls."
    - "Calling addTriple twice with the same subject and a functional predicate (e.g. status_is) and different objects returns has_contradiction: true on the second call, with contradictions[0] referencing the first triple."
    - "Calling addTriple twice with an unknown predicate (e.g. some_made_up_predicate) and different objects returns has_contradiction: false on both calls (unknown defaults to multi)."
    - "Inserting a DB override row marking version_is as multi in kg_predicate_cardinality causes subsequent version_is writes with different objects to return has_contradiction: false."
    - "Conversation ingestion (ingest.ts buildTriples uses mentioned_by and co_occurs_with) continues to work without producing false-positive contradictions — neither predicate is on the functional list."
    - "The addTriple return object still contains exactly these fields and no others: id, subject_id, predicate, object_id, valid_from, valid_to, confidence, source_memory_id, source_type, created_at, contradictions, has_contradiction."
    - "Schema migration v11 creates kg_predicate_cardinality as an empty table with no data backfill; all pre-existing kg_triples and kg_entities rows are untouched."
  artifacts:
    - path: "src/services/memory/schema.ts"
      provides: "Schema version bumped from 10 -> 11 with additive migration creating kg_predicate_cardinality table"
      contains: "kg_predicate_cardinality"
    - path: "src/services/memory/knowledge-graph/kg.ts"
      provides: "FUNCTIONAL_PREDICATES constant, cardinalityCache Map, isPredicateFunctional() helper, and gated contradiction query inside addTriple()"
      contains: "FUNCTIONAL_PREDICATES"
    - path: "test/kg-cardinality.test.js"
      provides: "Regression tests for all 4 required cases (multi, functional, unknown, DB override)"
      contains: "kg cardinality"
  key_links:
    - from: "src/services/memory/knowledge-graph/kg.ts addTriple"
      to: "isPredicateFunctional helper"
      via: "gating call before the existing conflicting SELECT query at lines 149-158"
      pattern: "if \\(await isPredicateFunctional"
    - from: "isPredicateFunctional helper"
      to: "kg_predicate_cardinality table"
      via: "SELECT cardinality FROM kg_predicate_cardinality WHERE predicate = ?"
      pattern: "FROM kg_predicate_cardinality"
    - from: "src/services/memory/schema.ts runMigrations"
      to: "kg_predicate_cardinality table"
      via: "migration version 11 in migrations array"
      pattern: "version: 11"
---

<objective>
Fix the false-positive contradiction detection in `addTriple()` by introducing predicate cardinality. Multi-valued predicates (explores, uses, depends_on, mentioned_by, co_occurs_with, etc.) must no longer flag conflicting objects as contradictions — only FUNCTIONAL predicates (status_is, version_is, owned_by, etc.) should trigger the contradiction query.

Purpose: The current implementation at `src/services/memory/knowledge-graph/kg.ts:149-158` runs a blanket contradiction query for every predicate, producing false positives like "tensorflow_tryon explores Augmented Reality" being flagged as contradicting "tensorflow_tryon explores Artificial Intelligence". Both statements should coexist.

Output:
- Schema migration v11 adding empty `kg_predicate_cardinality` override table
- Hardcoded `FUNCTIONAL_PREDICATES` set + per-process cache + `isPredicateFunctional()` helper in `kg.ts`
- Gated contradiction query — only runs when `isPredicateFunctional(pred)` returns true
- 4 regression tests covering multi-valued, functional, unknown, and DB-override cases
- Preserved `addTriple` return shape (no new fields, no renames, no removals)
- Zero new runtime dependencies
- kg.ts stays under 500 lines (currently 363, est. ~420 after changes)
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/260409-ohq-fix-kg-contradiction-detection-for-funct/260409-ohq-CONTEXT.md
@CLAUDE.md
@src/services/memory/knowledge-graph/kg.ts
@src/services/memory/schema.ts
@src/services/memory/ingest/ingest.ts
@src/services/memory/types.ts
@src/services/memory/store.ts
@test/memory-store.test.js

<interfaces>
<!-- Key contracts the executor needs. Extracted from the codebase verbatim. -->
<!-- Executor should use these directly — no codebase exploration needed. -->

From src/services/memory/knowledge-graph/kg.ts (current broken contradiction query, lines 140-189):
```typescript
const result = await adapter.transaction(async (ad) => {
  if (!subId && subjectName) {
    subId = await ensureEntity(ad, subjectName);
  }
  if (!objId && objectName) {
    objId = await ensureEntity(ad, objectName);
  }

  // Contradiction detection: same subject + predicate, different object, still valid
  const conflicting = await ad.all<ConflictRow>(
    `SELECT t.id, t.object_id, e.name AS object_name
       FROM kg_triples t
       JOIN kg_entities e ON e.id = t.object_id
      WHERE t.subject_id = ?
        AND t.predicate = ?
        AND t.object_id != ?
        AND t.valid_to IS NULL`,
    [subId, pred, objId]
  );

  await ad.run(
    `INSERT INTO kg_triples (id, subject_id, predicate, object_id, valid_from, valid_to, confidence, source_memory_id, source_type, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, subId, pred, objId, vFrom, vTo, conf, srcMemId, srcType, now]
  );

  const contradictions = conflicting.map(c => ({
    existing_triple_id: c.id,
    existing_object_id: c.object_id,
    existing_object_name: c.object_name
  }));

  return {
    id, subject_id: subId, predicate: pred, object_id: objId,
    valid_from: vFrom, valid_to: vTo, confidence: conf,
    source_memory_id: srcMemId, source_type: srcType, created_at: now,
    contradictions,
    has_contradiction: contradictions.length > 0
  };
});
```
CRITICAL: The return shape (fields listed above) is the LOCKED contract — no field may be added, renamed, or removed. Only the `conflicting` query must be gated.

From src/services/memory/schema.ts (current schema state, lines 1-5 and 310-318):
```typescript
export const SCHEMA_VERSION = 10;
// ...
{
  version: 10,
  migrate: async (ad) => {
    await ad.exec(`CREATE INDEX IF NOT EXISTS idx_kg_triples_subject_valid ON kg_triples(subject_id, valid_to, object_id)`);
    await ad.exec(`CREATE INDEX IF NOT EXISTS idx_memory_entries_status_embedding ON memory_entries(status) WHERE embedding_json IS NOT NULL`);
    await ad.exec(`CREATE INDEX IF NOT EXISTS idx_kg_triples_pred_subject ON kg_triples(predicate, subject_id)`);
  }
}
```
Bump SCHEMA_VERSION to 11. Append a new entry with `version: 11` after the existing version 10 entry.

From src/services/memory/ingest/ingest.ts buildTriples (lines 229-259) — predicates conversation ingestion produces:
```typescript
function buildTriples(entities: ExtractedEntity[], turnRole: string, sourceMemoryId: string): TripleDef[] {
  // Each entity "mentioned_in" conversation by role
  triples.push({ ...predicate: 'mentioned_by' ... });
  // Co-occurrence: pairs of entities in same turn
  triples.push({ ...predicate: 'co_occurs_with' ... });
}
```
VERIFIED: ingestion uses only `mentioned_by` and `co_occurs_with`. BOTH are multi-valued relations. NEITHER may appear in FUNCTIONAL_PREDICATES — if they did, conversation ingestion would start flagging every cross-turn entity mention as a contradiction and re-introduce the exact class of bug this task is fixing.

From src/services/memory/types.ts — the Adapter interface (used by isPredicateFunctional helper):
```typescript
// Adapter exposes: get<T>(sql, params) -> T|null, all<T>(sql, params) -> T[],
// run(sql, params) -> {changes}, exec(sql) -> void, transaction(fn) -> result
```

From test/memory-store.test.js — established test conventions for this project:
```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { MemoryStore } from '../src/services/memory/index.js';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-memory-test-'));
}

async function hasSupportedBackend() {
  try {
    const mod = await import('node:sqlite');
    if (mod?.DatabaseSync) return true;
  } catch { /* ignore */ }
  return false;
}

test('name', async (t) => {
  if (!await hasSupportedBackend()) {
    t.skip('No supported sqlite backend available');
    return;
  }
  const root = makeTempDir();
  const store = new MemoryStore({ enabled: true, backend: 'auto', dbPath: path.join(root, 'memory.db') });
  // ... exercise store.addTriple(...)
  fs.rmSync(root, { recursive: true, force: true });
});
```
Tests live flat under `test/` (singular), use `.test.js` extension, `node:test` + `node:assert/strict`, run with `npm test` (which is `tsx --test`). MemoryStore is the public surface; it exposes `addTriple({ subjectName, predicate, objectName, ... })` via `store.ts:263`.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Additive schema migration v11 for kg_predicate_cardinality override table</name>
  <files>src/services/memory/schema.ts</files>
  <action>
Edit `src/services/memory/schema.ts`:

1. Change line 5 from `export const SCHEMA_VERSION = 10;` to `export const SCHEMA_VERSION = 11;`.

2. Append a new migration entry to the `migrations` array AFTER the existing `version: 10` entry (which ends around line 317). The new entry must be:

```typescript
{
  version: 11,
  migrate: async (ad) => {
    // Additive: create the predicate cardinality override table.
    // Empty by default — all rules come from the hardcoded FUNCTIONAL_PREDICATES
    // set in knowledge-graph/kg.ts unless users add rows here.
    // Fixes false-positive contradiction detection for multi-valued predicates.
    await ad.exec(`
      CREATE TABLE IF NOT EXISTS kg_predicate_cardinality (
        predicate TEXT PRIMARY KEY,
        cardinality TEXT NOT NULL CHECK(cardinality IN ('functional','multi')),
        updated_at TEXT NOT NULL
      )
    `);
  }
}
```

3. DO NOT modify `ensureSchema()` — the new table uses `CREATE TABLE IF NOT EXISTS` inside the migration, matching the pattern already used by versions 6, 8, and 9 (which create kg_entities, agent_diary, conversation_sources respectively). Do NOT add the CREATE TABLE to ensureSchema's big block; keeping it only in the migration avoids ordering issues and matches prior art.

4. No backfill, no data migration, no index beyond the implicit PRIMARY KEY. The table is empty until users explicitly insert override rows.

Per D-Migration (CONTEXT.md): "Contradictions are computed at write time only. Nothing in the schema needs backfilling." Deploy risk is zero — old triples are untouched.

Reference pattern: migration for version 9 (lines 294-307) creates `conversation_sources` using the exact same shape this migration should follow.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>
- `SCHEMA_VERSION` constant is `11`
- `migrations` array contains a `version: 11` entry that executes `CREATE TABLE IF NOT EXISTS kg_predicate_cardinality (predicate TEXT PRIMARY KEY, cardinality TEXT NOT NULL CHECK(cardinality IN ('functional','multi')), updated_at TEXT NOT NULL)`
- `ensureSchema()` is unchanged
- `tsc --noEmit` passes with zero errors
- No other tables modified, no indexes added to existing tables
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Gate contradiction query behind isPredicateFunctional in kg.ts</name>
  <files>src/services/memory/knowledge-graph/kg.ts</files>
  <behavior>
Inlined in kg.ts (NOT extracted to cardinality.ts — current file is 363 lines and this change adds ~55 lines, final ~418, well under the 500 limit):

- Module-scoped `FUNCTIONAL_PREDICATES: Set<string>` containing exactly these 12 predicates (all validated against ingest.ts buildTriples — none of these are `mentioned_by` or `co_occurs_with`):
  `status_is`, `version_is`, `owned_by`, `located_at`, `assigned_to`, `current_state`, `has_type`, `parent_of`, `rooted_at`, `primary_language`, `license_is`, `created_by`

- Module-scoped `cardinalityCache: Map<string, 'functional' | 'multi'>` — per-process, unbounded (acceptable: predicate vocabulary is small and bounded by user usage).

- Helper `async function isPredicateFunctional(adapter: Adapter, predicate: string): Promise<boolean>`:
  1. If predicate is in cardinalityCache → return cached === 'functional' (no DB hit)
  2. Otherwise query `SELECT cardinality FROM kg_predicate_cardinality WHERE predicate = ?`
  3. If row exists → cache its value, return row.cardinality === 'functional'
  4. If no row → fall back to `FUNCTIONAL_PREDICATES.has(predicate)`, cache as 'functional' or 'multi' accordingly, return that boolean
  5. Unknown predicates default to multi (permissive) per D-Default in CONTEXT.md

- Gating inside addTriple (inside the existing transaction at current lines 140-186):
  - BEFORE calling the existing conflict query at lines 149-158, check `if (await isPredicateFunctional(ad, pred))`
  - Only run the conflict query when the check returns true
  - When the check returns false, `conflicting` stays as an empty array
  - `contradictions` mapping and return shape stay EXACTLY as they are today

Expected behavior matrix (verified by Task 3 regression tests):
| Predicate           | Cardinality source                  | Second write contradictions |
|---------------------|--------------------------------------|-----------------------------|
| explores            | unknown -> default multi             | 0                           |
| status_is           | FUNCTIONAL_PREDICATES                | 1                           |
| some_made_up_pred   | unknown -> default multi             | 0                           |
| version_is (override row 'multi') | DB override              | 0                           |
| mentioned_by        | unknown -> default multi             | 0 (protects ingestion)      |
| co_occurs_with      | unknown -> default multi             | 0 (protects ingestion)      |
  </behavior>
  <action>
Edit `src/services/memory/knowledge-graph/kg.ts`. DO NOT create a new file — inline the helper in kg.ts.

**Step 1 — Add module-level declarations** (after the `toSlug` function at line 14, before `addEntity` at line 16):

```typescript
// Functional predicates: entities can have exactly one valid object at a time.
// Adding a triple with a different object flags the existing one as a contradiction.
// Multi-valued predicates (explores, uses, depends_on, mentioned_by, co_occurs_with, etc.)
// are the default — they skip the contradiction query entirely.
//
// VERIFIED against src/services/memory/ingest/ingest.ts buildTriples():
//   ingestion emits `mentioned_by` and `co_occurs_with` — neither appears below,
//   so conversation ingestion never triggers false-positive contradictions.
//
// Users can override via the kg_predicate_cardinality table (see migration v11).
const FUNCTIONAL_PREDICATES: Set<string> = new Set([
  'status_is',
  'version_is',
  'owned_by',
  'located_at',
  'assigned_to',
  'current_state',
  'has_type',
  'parent_of',
  'rooted_at',
  'primary_language',
  'license_is',
  'created_by'
]);

// Per-process cache: DB overrides win, then hardcoded set, then 'multi' fallback.
// Cleared only on process restart. Bounded by the user's predicate vocabulary.
const cardinalityCache: Map<string, 'functional' | 'multi'> = new Map();

interface CardinalityRow {
  cardinality: string;
}

async function isPredicateFunctional(adapter: Adapter, predicate: string): Promise<boolean> {
  const cached = cardinalityCache.get(predicate);
  if (cached !== undefined) {
    return cached === 'functional';
  }
  // Check DB override table first (populated only if users add explicit rows)
  const row = await adapter.get<CardinalityRow>(
    'SELECT cardinality FROM kg_predicate_cardinality WHERE predicate = ?',
    [predicate]
  );
  if (row) {
    const value: 'functional' | 'multi' = row.cardinality === 'functional' ? 'functional' : 'multi';
    cardinalityCache.set(predicate, value);
    return value === 'functional';
  }
  // Fall back to hardcoded set. Unknown predicates default to 'multi' (permissive).
  const isFunctional = FUNCTIONAL_PREDICATES.has(predicate);
  cardinalityCache.set(predicate, isFunctional ? 'functional' : 'multi');
  return isFunctional;
}
```

**Step 2 — Gate the contradiction query in addTriple**. The current code at lines 149-158 is:
```typescript
// Contradiction detection: same subject + predicate, different object, still valid
const conflicting = await ad.all<ConflictRow>(
  `SELECT t.id, t.object_id, e.name AS object_name
     FROM kg_triples t
     JOIN kg_entities e ON e.id = t.object_id
    WHERE t.subject_id = ?
      AND t.predicate = ?
      AND t.object_id != ?
      AND t.valid_to IS NULL`,
  [subId, pred, objId]
);
```

Replace it with:
```typescript
// Contradiction detection: only run for FUNCTIONAL predicates (entity can have
// exactly one valid object at a time). Multi-valued predicates (explores, uses,
// mentioned_by, co_occurs_with, etc.) permit multiple concurrent objects —
// running this query for them produced false positives (see task 260409-ohq).
let conflicting: ConflictRow[] = [];
if (await isPredicateFunctional(ad, pred)) {
  conflicting = await ad.all<ConflictRow>(
    `SELECT t.id, t.object_id, e.name AS object_name
       FROM kg_triples t
       JOIN kg_entities e ON e.id = t.object_id
      WHERE t.subject_id = ?
        AND t.predicate = ?
        AND t.object_id != ?
        AND t.valid_to IS NULL`,
    [subId, pred, objId]
  );
}
```

**Step 3 — Do NOT touch**:
- The `contradictions` mapping at lines 166-170 (unchanged)
- The return object shape at lines 172-185 (unchanged — all 12 fields preserved: `id, subject_id, predicate, object_id, valid_from, valid_to, confidence, source_memory_id, source_type, created_at, contradictions, has_contradiction`)
- Any other function in kg.ts (`addEntity`, `ensureEntity`, `getEntity`, `invalidateTriple`, `queryEntityRelationships`, `queryTriplesAsOf`, `getEntityTimeline`, `getKgStats`, the `toSlug` export)

**Constraints check**:
- No new runtime dependencies (only uses `Adapter` type already imported from `../types.js`)
- kg.ts stays under 500 lines (363 + ~55 new = ~418)
- `addTriple` return shape is byte-identical to what callers see today
- Per D-Storage (CONTEXT.md): lookup order is cache → DB override → hardcoded → 'multi' fallback
- Per D-Default (CONTEXT.md): unknown predicates default to multi (skip check)
- Per D-Behavior (CONTEXT.md): writes always succeed; only the `contradictions` array contents change
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>
- `FUNCTIONAL_PREDICATES` set exists at module scope with exactly the 12 listed predicates
- `mentioned_by` and `co_occurs_with` are NOT in the set (verified against ingest.ts buildTriples)
- `cardinalityCache` Map exists at module scope
- `isPredicateFunctional(adapter, predicate)` helper exists with cache-first -> DB-override -> hardcoded -> 'multi' fallback order
- `addTriple` still runs inside a transaction; the contradiction query now executes ONLY when `isPredicateFunctional(ad, pred)` returns true
- Return shape is unchanged — `id, subject_id, predicate, object_id, valid_from, valid_to, confidence, source_memory_id, source_type, created_at, contradictions, has_contradiction` all present, nothing added, nothing removed, nothing renamed
- kg.ts line count is under 500 (confirm with `wc -l src/services/memory/knowledge-graph/kg.ts`)
- `tsc --noEmit` passes with zero errors
- `npm run lint` passes with zero warnings (`--max-warnings=0`)
  </done>
</task>

<task type="auto">
  <name>Task 3: Regression tests for cardinality-gated contradiction detection</name>
  <files>test/kg-cardinality.test.js</files>
  <action>
Create a NEW file `test/kg-cardinality.test.js` (flat under `test/`, matches existing convention — see `test/memory-store.test.js` as the reference pattern).

The file must contain 4 tests, all using the same `MemoryStore` bootstrap pattern from `memory-store.test.js`. DO NOT use any new test helpers, mocking frameworks, or dependencies — `node:test` + `node:assert/strict` only.

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { MemoryStore } from '../src/services/memory/index.js';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-kg-cardinality-test-'));
}

async function hasSupportedBackend() {
  try {
    const mod = await import('node:sqlite');
    if (mod?.DatabaseSync) return true;
  } catch {
    // Ignore and treat kg cardinality test as unavailable on this runtime.
  }
  return false;
}

function makeStore(root) {
  return new MemoryStore({
    enabled: true,
    backend: 'auto',
    dbPath: path.join(root, 'memory.db')
  });
}

test('kg cardinality: multi-valued predicate (explores) allows multiple objects without contradiction', async (t) => {
  if (!await hasSupportedBackend()) { t.skip('No sqlite backend'); return; }
  const root = makeTempDir();
  const store = makeStore(root);

  const first = await store.addTriple({
    subjectName: 'tensorflow_tryon',
    predicate: 'explores',
    objectName: 'Artificial Intelligence'
  });
  assert.equal(first.has_contradiction, false, 'first explores write should not flag contradictions');
  assert.equal(first.contradictions.length, 0);

  const second = await store.addTriple({
    subjectName: 'tensorflow_tryon',
    predicate: 'explores',
    objectName: 'Augmented Reality'
  });
  assert.equal(second.has_contradiction, false, 'second explores write with different object must NOT be flagged — this is the exact bug being fixed');
  assert.equal(second.contradictions.length, 0);

  fs.rmSync(root, { recursive: true, force: true });
});

test('kg cardinality: functional predicate (status_is) still flags conflicting objects', async (t) => {
  if (!await hasSupportedBackend()) { t.skip('No sqlite backend'); return; }
  const root = makeTempDir();
  const store = makeStore(root);

  const first = await store.addTriple({
    subjectName: 'project_alpha',
    predicate: 'status_is',
    objectName: 'active'
  });
  assert.equal(first.has_contradiction, false, 'first status_is write has nothing to contradict');
  assert.equal(first.contradictions.length, 0);

  const second = await store.addTriple({
    subjectName: 'project_alpha',
    predicate: 'status_is',
    objectName: 'completed'
  });
  assert.equal(second.has_contradiction, true, 'second status_is write with different object MUST still be flagged — status_is is functional');
  assert.equal(second.contradictions.length, 1);
  assert.equal(second.contradictions[0].existing_triple_id, first.id);
  assert.equal(second.contradictions[0].existing_object_id, first.object_id);

  // Return shape must be preserved (no new/renamed/missing fields)
  const expectedKeys = [
    'id', 'subject_id', 'predicate', 'object_id',
    'valid_from', 'valid_to', 'confidence',
    'source_memory_id', 'source_type', 'created_at',
    'contradictions', 'has_contradiction'
  ].sort();
  assert.deepEqual(Object.keys(second).sort(), expectedKeys, 'addTriple return shape must be byte-identical');

  fs.rmSync(root, { recursive: true, force: true });
});

test('kg cardinality: unknown predicate defaults to multi (no contradiction)', async (t) => {
  if (!await hasSupportedBackend()) { t.skip('No sqlite backend'); return; }
  const root = makeTempDir();
  const store = makeStore(root);

  const first = await store.addTriple({
    subjectName: 'widget_x',
    predicate: 'some_made_up_predicate',
    objectName: 'option_one'
  });
  assert.equal(first.has_contradiction, false);

  const second = await store.addTriple({
    subjectName: 'widget_x',
    predicate: 'some_made_up_predicate',
    objectName: 'option_two'
  });
  assert.equal(second.has_contradiction, false, 'unknown predicates default to multi-valued — no contradiction');
  assert.equal(second.contradictions.length, 0);

  fs.rmSync(root, { recursive: true, force: true });
});

test('kg cardinality: DB override row can downgrade functional predicate to multi', async (t) => {
  if (!await hasSupportedBackend()) { t.skip('No sqlite backend'); return; }
  const root = makeTempDir();
  const store = makeStore(root);

  // Force schema init by doing a throwaway write first.
  await store.addTriple({
    subjectName: 'seed_entity',
    predicate: 'has_type',
    objectName: 'seed'
  });

  // Insert override BEFORE any version_is writes so the cache is still cold.
  // We need raw adapter access — MemoryStore exposes store.adapter after init.
  // If no public adapter, reach through store.store.adapter (service -> store -> adapter).
  // Confirm the path when implementing; adjust based on the actual MemoryStore surface.
  const adapter = store.adapter || store.store?.adapter;
  assert.ok(adapter, 'expected MemoryStore to expose an adapter for this test');
  await adapter.run(
    `INSERT INTO kg_predicate_cardinality (predicate, cardinality, updated_at) VALUES (?, ?, ?)`,
    ['version_is', 'multi', new Date().toISOString()]
  );

  // IMPORTANT: the cardinalityCache is module-scoped so if a prior test already
  // resolved 'version_is' in this same process it will be cached as 'functional'
  // and the DB override will be ignored. Use a fresh predicate name in prior tests
  // to avoid contamination — this test is the ONLY one that touches version_is.

  const first = await store.addTriple({
    subjectName: 'package_a',
    predicate: 'version_is',
    objectName: '1.0.0'
  });
  assert.equal(first.has_contradiction, false);

  const second = await store.addTriple({
    subjectName: 'package_a',
    predicate: 'version_is',
    objectName: '2.0.0'
  });
  assert.equal(second.has_contradiction, false, 'DB override marked version_is as multi — second write must not flag');
  assert.equal(second.contradictions.length, 0);

  fs.rmSync(root, { recursive: true, force: true });
});
```

**Implementation notes while writing the test file:**

1. The DB override test reaches the adapter via `store.adapter` or `store.store?.adapter`. If neither path works, check `src/services/memory/index.ts` and `src/services/memory/store.ts` for the actual exposed surface. Do NOT import the low-level adapter module directly — use whatever public handle MemoryStore offers. If neither handle exists, fall back to passing `new NodeSqliteAdapter` with the same dbPath opened as a second connection — but only as a last resort, because that bypasses the MemoryStore lifecycle.

2. The `cardinalityCache` is module-scoped inside `kg.ts`, so it persists across tests in the same `npm test` process. This is why the 4 tests use DIFFERENT predicates (`explores`, `status_is`, `some_made_up_predicate`, `version_is`) — to prevent cache contamination. Do not reuse predicate names between tests.

3. Each test uses its own `makeTempDir()` / fresh SQLite DB — no shared state across DB files. But the in-process predicate cache IS shared; the predicate-name discipline above handles that.

4. Each test cleans up its temp dir with `fs.rmSync`.

5. If any of the 4 test names need adjustment to stay under the 120-char conventional test name length, keep the intent clear — the 4 cases are locked.
  </action>
  <verify>
    <automated>npm test -- --test-name-pattern="kg cardinality"</automated>
  </verify>
  <done>
- `test/kg-cardinality.test.js` exists with exactly 4 tests matching the 4 cases in CONTEXT.md specifics
- Test 1 (multi-valued `explores`): second write has `has_contradiction === false`
- Test 2 (functional `status_is`): second write has `has_contradiction === true`, `contradictions.length === 1`, `contradictions[0].existing_triple_id` matches first write's `id`, and return shape has exactly the 12 expected keys
- Test 3 (unknown `some_made_up_predicate`): second write has `has_contradiction === false`
- Test 4 (DB override `version_is`): after inserting a `multi` row into `kg_predicate_cardinality`, second write has `has_contradiction === false`
- All 4 tests pass when running `npm test`
- Running the FULL `npm test` suite shows no regressions in any existing test
- No new runtime dependencies added; test uses only `node:test`, `node:assert/strict`, `node:fs`, `node:path`, `node:os`, and `MemoryStore`
  </done>
</task>

</tasks>

<verification>
Run in order after all three tasks complete:

1. `npx tsc --noEmit` — zero errors (catches type regressions in kg.ts and schema.ts)
2. `npm run lint` — zero warnings (`--max-warnings=0` is enforced by the script)
3. `wc -l src/services/memory/knowledge-graph/kg.ts` — must report under 500 lines
4. `npm test` — full test suite passes, including the 4 new kg-cardinality tests
5. Grep sanity check: `grep -n "mentioned_by\|co_occurs_with" src/services/memory/knowledge-graph/kg.ts` — must return NOTHING (these predicates must never appear in kg.ts)
6. Grep sanity check: `grep -n "FUNCTIONAL_PREDICATES" src/services/memory/knowledge-graph/kg.ts` — must return the Set definition AND the `FUNCTIONAL_PREDICATES.has(predicate)` lookup
7. Schema sanity: start a throwaway MemoryStore against a temp dbPath and confirm `kg_predicate_cardinality` table exists via `SELECT name FROM sqlite_master WHERE type='table' AND name='kg_predicate_cardinality'` — the Task 3 tests implicitly validate this by inserting into the table

Observable end-state checklist (must all be true):
- [ ] Repeated `explores` writes never flag contradictions
- [ ] Repeated `status_is` writes with different objects still flag contradictions
- [ ] Unknown predicates never flag contradictions
- [ ] DB override rows take precedence over the hardcoded set
- [ ] `mentioned_by` and `co_occurs_with` (conversation ingestion predicates) are NOT on the functional list
- [ ] `addTriple` return object has the same 12 fields it had before
- [ ] kg.ts under 500 lines
- [ ] Zero new runtime dependencies in package.json
- [ ] Schema version is 11
- [ ] Existing kg_triples / kg_entities rows are untouched (additive-only migration)
</verification>

<success_criteria>
The original bug is fixed when:
1. `addTriple({subjectName: 'tensorflow_tryon', predicate: 'explores', objectName: 'Artificial Intelligence'})` followed by `addTriple({subjectName: 'tensorflow_tryon', predicate: 'explores', objectName: 'Augmented Reality'})` returns `has_contradiction: false` on both calls with `contradictions: []`.
2. The functional case still works: `addTriple({subjectName: 'project_alpha', predicate: 'status_is', objectName: 'active'})` followed by the same with `objectName: 'completed'` returns `has_contradiction: true` on the second call.
3. No caller of `addTriple` needs any code change — the return shape is preserved exactly.
4. Conversation ingestion (`ingestMarkdown` / `ingestJson`) runs without new contradiction noise because `mentioned_by` and `co_occurs_with` default to multi.
5. `npm test` passes end-to-end. `tsc --noEmit` and `npm run lint` pass with zero errors and zero warnings.
6. The `kg_predicate_cardinality` table exists but is empty by default; users can add override rows via direct SQL.
</success_criteria>

<output>
After completion, create `.planning/quick/260409-ohq-fix-kg-contradiction-detection-for-funct/260409-ohq-SUMMARY.md` summarizing:
- Files changed (schema.ts, kg.ts, test/kg-cardinality.test.js)
- Final line count of kg.ts (must be under 500)
- Final count and names of the 12 functional predicates shipped
- Confirmation that `mentioned_by` and `co_occurs_with` are NOT on the functional list
- Migration version shipped (11)
- Test pass/fail summary
</output>
