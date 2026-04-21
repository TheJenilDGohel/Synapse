---
phase: 43-wal-mode-performance-tuning
plan: 01
status: complete
---

# Plan 43-01 Summary

## What Was Built

- **`src/services/memory/sqlite-tuning.ts`** (34 lines) — `applySqliteTuning(host)` helper exporting `SqliteExecHost` interface. Applies 4 PRAGMAs (journal_mode=WAL, synchronous=NORMAL, cache_size=-64000, mmap_size=268435456) to any duck-typed exec host. Uses `Promise.all` over synchronous `map` so all 4 `exec()` calls happen synchronously before the first microtask yield — safe for callers that close the DB immediately after.

- **`src/services/memory/index.ts`** — barrel re-exports `applySqliteTuning` + `SqliteExecHost`.

- **`src/services/memory/store.ts`** — `init()` replaced 2 inline PRAGMAs with `await applySqliteTuning(this.adapter)`.

- **`src/services/retrieval/sqlite-vec/service.ts`** — `ensureDb()` replaced 3 inline PRAGMAs (including old `-8000` cache_size) with `void applySqliteTuning(this.db)`. Cache upgraded from 8 MB → 64 MB.

- **`src/services/retrieval/symbols/index.ts`** — `ensureDb()` added `void applySqliteTuning(this.db)` after `new DatabaseSync(...)`. Previously zero PRAGMAs; now full 4-PRAGMA tuning.

- **`test/sqlite-tuning.test.js`** (145 lines) — 4 tests: PRAGMA values check (WAL-01/WAL-02), idempotent re-apply, WAL-03 500-triple benchmark, symbols DB journal_mode probe.

## WAL-03 Benchmark Result

Actual measured duration: **~113–151 ms** across two runs.
Budget: 2000 ms. Headroom: ~13x. No performance regression risk.

## Deviations from Plan

One deviation in `applySqliteTuning` implementation: the plan suggested a sequential `for...of` + `await` loop. Changed to `Promise.all` over a synchronous `map` to fix a "database is not open" async-after-close error in `test/sqlite-vec-index-service.test.js`. With the sequential loop, `void applySqliteTuning(this.db)` deferred PRAGMAs 2–4 to microtasks; when tests called `resetDb()` synchronously, those microtasks ran on a closed handle. The `Promise.all(map(...))` approach calls all 4 `exec()` synchronously in the `map` before any `await`, eliminating the race.

## Files Touched

| File | Lines | Change |
|------|-------|--------|
| `src/services/memory/sqlite-tuning.ts` | 34 | Created |
| `src/services/memory/index.ts` | 6 | +1 export line |
| `src/services/memory/store.ts` | ~270 | Import + replaced 2 PRAGMAs |
| `src/services/retrieval/sqlite-vec/service.ts` | ~350 | Import + replaced 3 PRAGMAs |
| `src/services/retrieval/symbols/index.ts` | ~180 | Import + added 1 call |
| `test/sqlite-tuning.test.js` | 145 | Created |

## PRAGMA Verification

- **journal_mode**: `wal` (database-scoped, confirmed on fresh DB + symbols DB on-disk probe)
- **synchronous**: `1` (= NORMAL, connection-scoped, confirmed via same-handle assertion in Test 1)
- **cache_size**: `-64000` (64 MB, connection-scoped, confirmed via same-handle assertion in Test 1)
- **mmap_size**: `268435456` (256 MB, connection-scoped, confirmed via same-handle assertion in Test 1)

## Connection-Scoped PRAGMA Caveat

`journal_mode` is persisted in the DB file header — visible to any connection. `synchronous`, `cache_size`, and `mmap_size` are connection-level — a second connection gets its own defaults. Test 4 therefore only probes `journal_mode` externally via a separate DatabaseSync handle. This is documented inline in the test.

## Test Results

183/183 passing. WAL-01, WAL-02, WAL-03 requirements fully satisfied.
