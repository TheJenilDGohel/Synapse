---
phase: quick-260409-nyr
plan: 01
subsystem: services/update
tags: [bug-fix, cache, version-drift, regression-tests]
requires: []
provides:
  - version-aware-update-cache-invalidation
  - neutralized-getCachedStatus-on-drift
  - update-ttl-default-60min
  - compareVersions-regression-guard
affects:
  - src/services/update/service.ts
  - src/runtime/config.ts
  - test/update-service.test.js
  - src/mcp/common/status.ts (indirect: synapse_server_status tool path)
tech_stack:
  added: []
  patterns:
    - raw-cache-read-preserves-on-disk-current_version
    - version-drift-triggers-refresh
    - neutralize-stale-latest-on-drift
key_files:
  created: []
  modified:
    - src/services/update/service.ts
    - src/runtime/config.ts
    - test/update-service.test.js
decisions:
  - Fixed readCache to preserve on-disk current_version (normalizeStatusRecord was stomping it before drift detection could run)
  - Kept compareVersions in helpers.ts unchanged -- it was already correct, NOT a lexicographic bug as the initial brief hypothesized
  - Chose to neutralize getCachedStatus output (latest_version -> currentVersion, is_outdated -> false) rather than block and refresh synchronously, so the server_status fast path stays non-blocking
metrics:
  duration: 3m33s
  tasks_completed: 2
  files_modified: 3
  tests_added: 3
  tests_updated: 2
  completed: "2026-04-09T11:54:06Z"
---

# Quick Task 260409-nyr: Fix Update Cache Version-Drift Bug

Version-drift aware update cache invalidation: server no longer surfaces a pre-upgrade `latest_version` via `synapse_server_status` after a local binary upgrade.

## Root Cause

The original brief hypothesized a lexicographic `compareVersions` bug (e.g. `"0.1.0" < "0.0.3"` as strings). That was WRONG. `compareVersions` in `src/services/update/helpers.ts` already parses `major.minor.patch` as integers with prerelease handling and was not the cause.

The real defects were three:

1. **`shouldRefresh()` was version-unaware.** It only checked `last_checked_at` age. When a user upgraded Synapse locally (e.g. `0.0.3 -> 0.1.0`), the file cache still carried `latest_version: 0.0.3` from before, and nothing invalidated it because `cache.current_version` was never compared against the running binary's `this.currentVersion`.

2. **`getCachedStatus()` bypassed all staleness checks.** It read the cache file with no age check and no refresh trigger. It is called by `src/mcp/common/status.ts:163-165` on the `synapse_server_status` tool path -- which is how a 43,225-minute-old cache survived and poisoned the server status output (`current=0.1.0, latest=0.0.3, is_outdated=false`).

3. **Default TTL was too long.** `updateCheckIntervalMinutes = 120` in `src/runtime/config.ts:441`.

Additionally, a subtle mechanism defect surfaced during test execution: `readCache()` was calling `normalizeStatusRecord()`, which unconditionally overwrote `current_version` with `this.currentVersion` before the drift check could ever see the on-disk value. That meant even with a correct `shouldRefresh` rewrite, drift could never be detected because the in-memory cache always reported the running binary's version as `current_version`.

## Fix

### `src/services/update/service.ts`

1. **`shouldRefresh`** now returns `true` when:
   - `cache.current_version` drifts from `this.currentVersion` (even when time-fresh)
   - `cache.latest_version` is missing
   - (plus the pre-existing force/age/backoff conditions)

2. **`getCachedStatus`** now detects `versionDrift` and neutralizes the cache response so the server_status fast path never surfaces a stale pre-upgrade `latest_version`:
   - `latest_version -> this.currentVersion` when drift
   - `is_outdated -> false` when drift
   - `stale -> true` always when `shouldRefresh(cache, now, false)` says so, so the next `warmCheck()` or `getStatus()` call picks it up

3. **`readCache`** now preserves the on-disk `current_version` after `normalizeStatusRecord` runs, so `shouldRefresh` and `getCachedStatus` can actually see drift. This was a blocking defect discovered by a failing Task 2 test (auto-fixed under Rule 1).

### `src/runtime/config.ts`

Default `updateCheckIntervalMinutes` lowered from `120` to `60`. Env override (`SYNAPSE_UPDATE_CHECK_INTERVAL_MINUTES`) and 15/1440 clamp bounds unchanged -- backwards compatible with existing config test assertions.

### `test/update-service.test.js`

Three new assertions, one updated test:

- **Extended `compareVersions` test** with `0.1.0>0.0.3`, `0.0.3<0.1.0`, and `0.10.0>0.2.0` so a future refactor cannot silently regress to lexicographic string compare.
- **New: `getStatus invalidates cache when current_version advances past cached latest_version`** -- reproduces the exact observed bug. Cache is seeded with a 30-day-old `{current_version: 0.0.3, latest_version: 0.0.3}`, service is constructed with `currentVersion: 0.1.0`, and `getStatus({force: false})` must still call npm exactly once (not serve stale cache) and return `latest_version: 0.1.0` with `source: 'live'`.
- **New: `getCachedStatus neutralizes stale latest_version when current_version drifted`** -- covers the `synapse_server_status` fast path. Cache is FRESH (so time-based staleness alone would not trigger) but `current_version` has drifted. Asserts that `getCachedStatus()` returns `latest_version: '0.1.0'` (neutralized), `is_outdated: false`, `stale: true`, and does NOT invoke npm.
- **Updated existing `getCachedStatus overrides stale cached current_version`** test to assert the new contract: on drift, `latest_version` is neutralized to the running binary and `stale: true` is set. Previously the test expected the pre-upgrade `latest_version` (0.0.3) to leak through, which was exactly the bug.

## Deviations from Plan

### Rule 1 -- Auto-fixed bug (inside scope)

**Fixed `readCache` current_version stomping**

- **Found during:** Task 2 test run (test 16 failed `latest_version === '0.1.0'`, got '0.0.3')
- **Issue:** `readCache()` was calling `normalizeStatusRecord()`, which has the line `current_version: this.currentVersion`. That meant by the time `shouldRefresh` or `getCachedStatus` received the cache object, `cache.current_version` already equalled `this.currentVersion` and drift was undetectable. The plan's `shouldRefresh` rewrite was correct but unreachable.
- **Fix:** `readCache()` now captures the raw on-disk `current_version` from the parsed JSON and writes it back onto the normalized record, so the drift check can see it.
- **Files modified:** `src/services/update/service.ts` (readCache function)
- **Commit:** `acfbd85`

### Rule 1 -- Updated existing test to match new contract

- **Found during:** Task 2
- **Issue:** Pre-existing test `getCachedStatus overrides stale cached current_version with installed runtime version` asserted `out.latest_version === '0.0.3'` (the pre-upgrade value), which was the exact bug being fixed.
- **Fix:** Updated assertions to `latest_version === '0.0.4-beta.8'` (neutralized to running binary), `is_outdated: false`, `stale: true`.
- **Files modified:** `test/update-service.test.js`
- **Commit:** `acfbd85`

No other deviations.

## Verification

```bash
cd /mnt/da2ae3dd-9788-4b37-88e8-effd7025eb4c/Base\ Projects/synapse
npx tsc --noEmit -p tsconfig.json            # PASS
npx tsx --test test/update-service.test.js    # 16/16 PASS (was 14 tests, now 16)
npx tsx --test test/config.test.js            # 12/12 PASS
```

## Success Criteria

- [x] `shouldRefresh` returns true on `current_version` drift (unit-tested: test 15)
- [x] `getCachedStatus` neutralizes stale `latest_version` on drift (unit-tested: tests 7 and 16)
- [x] Default `updateCheckIntervalMinutes` = 60 (src/runtime/config.ts:443)
- [x] `compareVersions('0.1.0','0.0.3') === 1` regression test in place (test 1)
- [x] `tsc --noEmit` passes
- [x] `node --test test/update-service.test.js` passes
- [x] `node --test test/config.test.js` passes
- [x] No new runtime dependencies in package.json
- [x] `compareVersions` in helpers.ts unchanged

## Files Touched

| File | Lines | Reason |
| ---- | ----- | ------ |
| `src/services/update/service.ts` | 404 (was 384) | shouldRefresh drift check, getCachedStatus neutralization, readCache current_version preservation |
| `src/runtime/config.ts` | 492 | Default TTL 120 -> 60 |
| `test/update-service.test.js` | +94 lines | 3 new assertions, 1 new test (Test B), 1 new test (Test C), 1 updated test |

All files remain under the 500-line ceiling per CLAUDE.md.

## Commits

| Task | Hash | Message |
| ---- | ---- | ------- |
| 1 | `48d54f9` | fix(quick-260409-nyr): invalidate update cache on version drift, lower TTL to 60m |
| 2 | `acfbd85` | test(quick-260409-nyr): regression tests for version-drift cache invalidation |

## Breaking Changes

None. The TTL default change (120 -> 60 min) is within existing 15/1440 clamp bounds; any user with `SYNAPSE_UPDATE_CHECK_INTERVAL_MINUTES` set in their env is unaffected. The `getCachedStatus` behavior change is strictly a correctness fix -- callers could not previously rely on a stale pre-upgrade `latest_version` being surfaced (that was the bug).

## Self-Check: PASSED

- FOUND: src/services/update/service.ts (modified)
- FOUND: src/runtime/config.ts (modified)
- FOUND: test/update-service.test.js (modified)
- FOUND: commit 48d54f9
- FOUND: commit acfbd85
- FOUND: .planning/quick/260409-nyr-fix-update-cache-semver-comparison-and-t/260409-nyr-SUMMARY.md
