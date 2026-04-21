# Phase 43: WAL Mode & Performance Tuning - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning
**Mode:** Smart discuss (accept-recommended)

<domain>
## Phase Boundary

All three SQLite databases that Synapse opens (main memory, sqlite-vec
index, symbols index) apply a uniform set of production-tuned PRAGMAs at
open time: `journal_mode=WAL`, `synchronous=NORMAL`, `cache_size=-64000`
(64 MB cache), and `mmap_size=268435456` (256 MB memory map). A regression
test asserts that a batch insert of 500 triples completes in under 2
seconds on a fresh DB, guarding against any future change that silently
regresses the tuning.

Out of scope: per-database custom tuning, schema migration, query
optimization, index changes, removing or replacing existing PRAGMAs,
benchmarking the read path, exposing the tuning to MCP tool surface.

</domain>

<decisions>
## Implementation Decisions

### Shared Helper (Accepted)
- Create `src/services/memory/sqlite-tuning.ts` (~40 lines) exporting:
  ```ts
  export function applySqliteTuning(adapter: { exec(sql: string): void | Promise<void> }): Promise<void>
  ```
  The helper accepts any `Adapter` (existing memory adapter) OR a raw
  `DatabaseSync` instance via duck-typing on `exec(sql)`.
- Helper executes the 4 PRAGMAs in this order:
  1. `PRAGMA journal_mode=WAL;`
  2. `PRAGMA synchronous=NORMAL;`
  3. `PRAGMA cache_size=-64000;`
  4. `PRAGMA mmap_size=268435456;`
- Returns a promise that awaits each `exec` so async adapters work
  identically to sync `DatabaseSync.exec`.
- Idempotent — safe to call repeatedly. SQLite ignores re-applying same
  PRAGMA values silently.

### Apply To All 3 Open Sites (Accepted)
- `src/services/memory/store.ts:135-136` — replace the inline 2-PRAGMA block
  with `await applySqliteTuning(this.adapter)`.
- `src/services/retrieval/sqlite-vec/service.ts:162-164` — replace the
  inline 3-PRAGMA block with `applySqliteTuning(this.db)` (note: the vec
  DB uses a raw `DatabaseSync` instance, so the helper must work on both
  Adapter and DatabaseSync via duck-typing).
- `src/services/retrieval/symbols/index.ts:44` — currently has ZERO PRAGMAs;
  add `applySqliteTuning(this.db)` immediately after `new DatabaseSync(...)`
  in `ensureDb()`.
- All 3 sites get the same 4-PRAGMA tuning. No per-DB customization.

### Adapter Compatibility (Accepted)
- The existing `Adapter` interface in `src/services/memory/adapter.ts`
  exposes `exec(sql)` returning `Promise<void>`. The raw `DatabaseSync` class
  exposes `exec(sql)` returning `void` (synchronous).
- The helper uses `Promise.resolve(adapter.exec(sql))` to normalize both
  call shapes, then awaits each in sequence.
- TypeScript signature accepts a structural type:
  `interface SqliteExecHost { exec(sql: string): void | Promise<void> }`.

### Performance Regression Test (Accepted)
- New `test/sqlite-tuning.test.js` (~150 lines) with these assertions:
  1. **PRAGMA values applied:** after opening a fresh DB and running
     `applySqliteTuning`, assert via `PRAGMA <name>` queries that all 4
     PRAGMAs return their expected values
     (`wal`, `1` for synchronous=NORMAL, `-64000`, `268435456`).
  2. **Idempotent re-apply:** calling `applySqliteTuning` twice doesn't
     throw and the values are unchanged.
  3. **Batch insert benchmark (WAL-03):** open a fresh DB, run schema
     migration, insert 500 triples via `addTriplesBatch`, assert wall-clock
     duration < 2000 ms.
  4. **Symbols index DB tuning:** create a fresh symbols DB instance,
     index a small file, then assert PRAGMAs match.
- The benchmark should use `process.hrtime.bigint()` for high-resolution
  timing.
- Use a temp dir (`fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-'))`)
  for the test DBs and clean up after.

### Backwards Compat (Accepted)
- The existing 2 PRAGMAs in `store.ts` and 3 PRAGMAs in `vec/service.ts`
  are REPLACED by the helper call. No new PRAGMAs are added beyond the 4
  in WAL-01/WAL-02.
- Existing tests that depend on the memory store working must still pass —
  WAL behavior is the same, only cache and mmap change.
- The helper does NOT touch any database-level configuration (wal_autocheckpoint,
  journal_size_limit, etc.) — only the 4 PRAGMAs from WAL-01/02.

### Claude's Discretion
- Whether to fold the existing `health-monitor.ts` PRAGMA wal_checkpoint
  call into the helper or leave it standalone. Leave standalone — it's
  a runtime maintenance call, not a startup tuning call.
- Whether to log the applied PRAGMAs at startup. Skip — adds noise.
- Whether to add an env var to override `cache_size` / `mmap_size` for
  resource-constrained environments. Skip — over-engineering for v0.3.0.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Adapter` interface at `src/services/memory/adapter.ts:3-13` exposes
  `exec(sql: string): Promise<void>` — async.
- Raw `DatabaseSync` class from `node:sqlite` exposes
  `exec(sql: string): void` — sync.
- Both `store.ts` and `vec/service.ts` already call `PRAGMA journal_mode=WAL`
  and `PRAGMA synchronous=NORMAL` — the helper is a strict superset.

### Established Patterns
- Test files use `fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-'))` for
  isolated DB fixtures (see `test/kg-batch.test.js`).
- Benchmark assertions use `assert.ok(duration < 2000, ...)` with the
  duration computed from `process.hrtime.bigint()` deltas converted to ms.
- Helpers under `src/services/memory/` are imported via the relative path
  `'../memory/sqlite-tuning.js'` from peer services.

### Integration Points
- `store.ts` initialization happens via `MemoryStore.initialize()` which
  is called once at server startup.
- `sqlite-vec/service.ts` initialization happens via `SqliteVecService.init()`
  on demand when the vec backend is first selected.
- `symbols/index.ts` initialization happens lazily via `ensureDb()` —
  first call to any symbol method opens the DB.
- All three are independent — no cross-DB transaction or shared state.

</code_context>

<specifics>
## Specific Ideas

- The benchmark test should use the SAME `addTriplesBatch` code path that
  Phase 26 ships, so any future regression in batch insert performance
  surfaces here.
- Use `node:test` test name `'WAL-03: 500 triple batch insert completes in
  under 2 seconds'` so failure messages are searchable.
- The PRAGMA value assertion for `journal_mode` should be case-insensitive
  (some SQLite builds return 'wal', others 'WAL').
- The helper file should have NO side effects — pure function exporting
  one named function.

</specifics>

<deferred>
## Deferred Ideas

- Per-DB custom tuning (vec DB might benefit from higher cache_size, etc.)
  — deferred. Uniform tuning is simpler and the 64 MB cache is well within
  any modern dev machine's RAM budget.
- `PRAGMA wal_autocheckpoint` tuning — deferred. SQLite default (1000
  pages) is fine.
- `PRAGMA temp_store=MEMORY` — deferred. Default is FILE which is safer
  for low-RAM systems.
- Auto-checkpointing on graceful shutdown — deferred. WAL files self-heal
  on next open.
- Read-only DB connection support — out of scope. Synapse is single-user
  read-write throughout.
- Exposing tuning values via MCP tool — deferred. Internal implementation
  detail.

</deferred>
