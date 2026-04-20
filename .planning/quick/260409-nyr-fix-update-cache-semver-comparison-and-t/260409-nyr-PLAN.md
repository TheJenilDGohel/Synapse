---
phase: quick-260409-nyr
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/services/update/service.ts
  - src/runtime/config.ts
  - test/update-service.test.js
autonomous: true
requirements:
  - QUICK-260409-nyr-01
  - QUICK-260409-nyr-02
  - QUICK-260409-nyr-03

must_haves:
  truths:
    - "When current_version on disk is newer than cached latest_version, the server reports is_outdated=false AND refreshes the cache (does not surface a stale latest_version from a previous install)."
    - "The default latest-version cache TTL is 60 minutes (not 120)."
    - "synapse_server_status no longer surfaces unbounded-stale cache data -- it either triggers a refresh when stale or returns cache with an accurate staleness flag consistent with the configured TTL."
    - "compareVersions('0.1.0','0.0.3') > 0 is verified by an automated test (guards against future regression to string compare)."
  artifacts:
    - path: "src/services/update/service.ts"
      provides: "shouldRefresh now invalidates cache on current_version mismatch; getCachedStatus honors age/version-mismatch as stale signal."
    - path: "src/runtime/config.ts"
      provides: "updateCheckIntervalMinutes default lowered from 120 to 60."
    - path: "test/update-service.test.js"
      provides: "Regression tests for version-mismatch invalidation, lowered default TTL behavior, and 0.1.0>0.0.3 compareVersions assertion."
  key_links:
    - from: "src/mcp/common/status.ts"
      to: "src/services/update/service.ts::getCachedStatus"
      via: "updates.getCachedStatus() in buildServerStatus"
      pattern: "updates\\.getCachedStatus"
    - from: "src/services/update/service.ts::getStatus"
      to: "src/services/update/service.ts::shouldRefresh"
      via: "stale check on current_version change"
      pattern: "cache\\.current_version.*this\\.currentVersion"
---

<objective>
Fix the `synapse_update_self` / `synapse_update_status` stale cache bug reported in an earlier session: server showed `current=0.1.0, latest=0.0.3, is_outdated=false` with a 43,225-minute-old (~30 day) cache.

Purpose: The root cause is NOT a lexicographic comparator bug (the task brief hypothesized that, but `compareVersions` in `src/services/update/helpers.ts` already parses `major.minor.patch` as integers -- see lines 16-65). The real defects are:

1. `shouldRefresh()` in `src/services/update/service.ts` only checks time-based age. When the user upgrades Synapse locally (e.g. 0.0.3 -> 0.1.0), the file cache still carries `latest_version: 0.0.3` from before, and nothing invalidates it because `cache.current_version` isn't compared against `this.currentVersion`.

2. `getCachedStatus()` (service.ts:165) is invoked by `src/mcp/common/status.ts:163-165` in the `synapse_server_status` tool path, and it reads the cache WITHOUT any age check and WITHOUT triggering a refresh. That is how a 43,225-minute-old cache survives.

3. Default `updateCheckIntervalMinutes = 120` in `src/runtime/config.ts:441` is too long per the task brief (reasonable: 60 min).

Output: Corrected version-aware cache invalidation, a 60-minute default TTL, regression tests covering each failure mode, and an explicit `compareVersions('0.1.0','0.0.3') > 0` assertion so no future refactor regresses to lexicographic compare.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@CLAUDE.md

@src/services/update/service.ts
@src/services/update/helpers.ts
@src/runtime/config.ts
@src/mcp/common/status.ts
@test/update-service.test.js

<interfaces>
<!-- Key contracts the executor will touch. Extracted verbatim from the codebase. -->
<!-- Executor should use these directly; no further codebase exploration required. -->

From src/services/update/service.ts (current behavior BEFORE fix):

```typescript
// Line 125-131 -- version-unaware staleness check
shouldRefresh(cache: UpdateStatus | null, now: number, force: boolean): boolean {
  if (force) return true;
  if (!cache?.last_checked_at) return true;
  const ageMs = now - parseIsoTime(cache.last_checked_at);
  const backoffMinutes = cache.last_check_ok ? this.checkIntervalMinutes : this.failureBackoffMinutes;
  return ageMs >= backoffMinutes * 60 * 1000;
}

// Line 165-190 -- getCachedStatus serves cache without refreshing
getCachedStatus(now: number = Date.now()): UpdateStatus & StatusMetadata {
  const cache = this.readCache();
  if (cache) {
    return this.withStatusMetadata({
      ...cache,
      stale: this.shouldRefresh(cache, now, false),
      source: 'cache'
    }, now);
  }
  // ... uninitialized fallback
}
```

From src/services/update/helpers.ts (compareVersions -- ALREADY CORRECT, do not rewrite):

```typescript
export function compareVersions(a: string, b: string): number {
  // Parses major.minor.patch as Number.parseInt, then field-by-field compare.
  // Handles prerelease (0.0.3-beta.1 < 0.0.3). Already proven by existing tests.
  // DO NOT add a semver library. DO NOT rewrite this function.
}
```

From src/runtime/config.ts:441-452 (TTL defaults to change):

```typescript
updateCheckIntervalMinutes: parseIntEnvClamped(
  env.SYNAPSE_UPDATE_CHECK_INTERVAL_MINUTES,
  120,   // <-- CHANGE THIS DEFAULT TO 60
  15,
  1440
),
updateFailureBackoffMinutes: parseIntEnvClamped(
  env.SYNAPSE_UPDATE_FAILURE_BACKOFF_MINUTES,
  15,
  5,
  240
),
```

From src/mcp/common/status.ts:162-166 (the code path that surfaces stale cache):

```typescript
const memoryStatus = await memory.getStatus();
const updateStatus = updates.getCachedStatus
  ? updates.getCachedStatus()
  : await updates.getStatus({ force: false });
```

From test/update-service.test.js:13-18 (existing compareVersions test -- EXTEND, do not replace):

```javascript
test('compareVersions handles stable and prerelease ordering', () => {
  assert.equal(compareVersions('0.0.4', '0.0.3'), 1);
  assert.equal(compareVersions('0.0.3', '0.0.3'), 0);
  assert.equal(compareVersions('0.0.3-beta.1', '0.0.3'), -1);
  assert.equal(compareVersions('0.0.3-beta.2', '0.0.3-beta.1'), 1);
});
```

From test/config.test.js:149-158 (existing TTL default assertions -- MUST BE UPDATED):

```javascript
assert.equal(runtimeLow.updateCheckIntervalMinutes, 15);   // min clamp (unchanged)
assert.equal(runtimeHigh.updateCheckIntervalMinutes, 1440); // max clamp (unchanged)
// There is no existing assertion on the unclamped DEFAULT value, so the
// 60-min change is backwards compatible with config tests.
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Version-aware cache invalidation + lowered default TTL</name>
  <files>src/services/update/service.ts, src/runtime/config.ts</files>
  <behavior>
    - `shouldRefresh(cache, now, force)` must return `true` when `cache.current_version !== this.currentVersion` (even when the cache is time-fresh). This invalidates stale `latest_version` after a local upgrade (0.0.3 -> 0.1.0).
    - `shouldRefresh` must also return `true` when `cache.latest_version` is missing/null.
    - `getCachedStatus()` must set `stale: true` in its returned object whenever `shouldRefresh(cache, now, false)` is true, AND when `cache.current_version !== this.currentVersion` it must additionally overwrite the returned `latest_version` with `this.currentVersion` and `is_outdated` with `false`, so the server_status tool NEVER surfaces a latest_version that predates the running binary. (We keep `source: 'cache'` but mark it stale so the background warmCheck or the next explicit `getStatus` call refreshes.)
    - `getStatus()` live-refresh branch already writes `current_version: this.currentVersion` into the cache (line 229-243); no change needed -- just verify the new `shouldRefresh` version-mismatch path still falls through to the live branch.
    - `src/runtime/config.ts` default for `updateCheckIntervalMinutes` changes from `120` to `60` (keep the 15/1440 clamp bounds, keep the env override `SYNAPSE_UPDATE_CHECK_INTERVAL_MINUTES`).
  </behavior>
  <action>
    Edit `src/services/update/service.ts`:

    1. Update `shouldRefresh` (around line 125) to ALSO trigger refresh when cache version drifts:
       ```ts
       shouldRefresh(cache: UpdateStatus | null, now: number, force: boolean): boolean {
         if (force) return true;
         if (!cache?.last_checked_at) return true;
         if (!cache.latest_version) return true;
         // Invalidate when the running binary has moved past what the cache knew.
         if (cache.current_version && cache.current_version !== this.currentVersion) return true;
         const ageMs = now - parseIsoTime(cache.last_checked_at);
         const backoffMinutes = cache.last_check_ok ? this.checkIntervalMinutes : this.failureBackoffMinutes;
         return ageMs >= backoffMinutes * 60 * 1000;
       }
       ```

    2. Update `getCachedStatus` (around line 165) so the fast-path server_status tool can't surface a stale `latest_version` across upgrades. When version has drifted, reset `latest_version`/`is_outdated` to neutral-safe values and mark stale:
       ```ts
       getCachedStatus(now: number = Date.now()): UpdateStatus & StatusMetadata {
         const cache = this.readCache();
         if (cache) {
           const versionDrift = Boolean(
             cache.current_version && cache.current_version !== this.currentVersion
           );
           const stale = this.shouldRefresh(cache, now, false);
           const safeLatest = versionDrift ? this.currentVersion : cache.latest_version;
           const safeOutdated = versionDrift
             ? false
             : Boolean(cache.is_outdated);
           return this.withStatusMetadata({
             ...cache,
             current_version: this.currentVersion,
             latest_version: safeLatest,
             is_outdated: safeOutdated,
             stale,
             source: 'cache'
           }, now);
         }
         // ... existing uninitialized fallback, unchanged
       }
       ```
       Leave the uninitialized fallback branch (the `return this.withStatusMetadata({...})` block starting at line 175) untouched.

    3. Do NOT touch `compareVersions` in `src/services/update/helpers.ts` -- it is already correct. Do NOT add a semver dependency.

    Edit `src/runtime/config.ts` line 441-446:
    - Change the default argument passed to `parseIntEnvClamped(env.SYNAPSE_UPDATE_CHECK_INTERVAL_MINUTES, 120, 15, 1440)` from `120` to `60`.
    - Leave `updateFailureBackoffMinutes` (line 447-452) alone.

    Reference CLAUDE.md constraints:
    - No new runtime dependencies (satisfied -- pure TS edits)
    - Files under 500 lines (service.ts at 384, config.ts checked -- both fine)
  </action>
  <verify>
    <automated>cd "/mnt/da2ae3dd-9788-4b37-88e8-effd7025eb4c/Base Projects/synapse" &amp;&amp; npx tsc --noEmit -p tsconfig.json</automated>
  </verify>
  <done>
    - `src/services/update/service.ts` `shouldRefresh` returns true on `current_version` mismatch.
    - `src/services/update/service.ts` `getCachedStatus` neutralizes `latest_version`/`is_outdated` when version drift detected.
    - `src/runtime/config.ts` default TTL is 60 (was 120).
    - `tsc --noEmit` passes.
  </done>
</task>

<task type="auto">
  <name>Task 2: Regression tests for version-drift invalidation and semver compare</name>
  <files>test/update-service.test.js</files>
  <action>
    Add three new tests to `test/update-service.test.js` (append near the bottom, before any trailing helper exports). Use the same mocking pattern already in the file (`commandRunner: () => ({ status: 0, stdout: '"x.y.z"', stderr: '' })`, `makeTempHome()`, pre-seeding the cache file via `fs.writeFileSync`).

    Test A -- compareVersions regression for the 0.1.0 vs 0.0.3 case (extends the existing block at line 13-18, or adds a new assert inside it):
    ```js
    assert.equal(compareVersions('0.1.0', '0.0.3'), 1);  // guards against lexicographic regression
    assert.equal(compareVersions('0.0.3', '0.1.0'), -1);
    assert.equal(compareVersions('0.10.0', '0.2.0'), 1); // multi-digit minor component
    ```

    Test B -- cache invalidation on current_version drift (the exact observed bug):
    ```js
    test('getStatus invalidates cache when current_version advances past cached latest_version', async () => {
      const home = makeTempHome();
      const cachePath = buildLocalnestPaths(home).updateStatusPath;
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
      // Simulate: a month ago, user was on 0.0.3 and latest was 0.0.3
      fs.writeFileSync(cachePath, `${JSON.stringify({
        package_name: 'synapse-mcp',
        current_version: '0.0.3',
        latest_version: '0.0.3',
        update_channel: 'stable',
        is_outdated: false,
        last_checked_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        last_check_ok: true
      }, null, 2)}\n`, 'utf8');

      let npmCalls = 0;
      const service = new UpdateService({
        synapseHome: home,
        packageName: 'synapse-mcp',
        currentVersion: '0.1.0',   // user has since upgraded
        checkIntervalMinutes: 60,
        failureBackoffMinutes: 15,
        commandRunner: () => {
          npmCalls += 1;
          return { status: 0, stdout: '"0.1.0"\n', stderr: '' };
        }
      });

      // force:false should STILL refresh, because current_version drifted
      const out = await service.getStatus({ force: false });
      assert.equal(npmCalls, 1, 'version drift must force a refresh even when time-fresh');
      assert.equal(out.current_version, '0.1.0');
      assert.equal(out.latest_version, '0.1.0');
      assert.equal(out.is_outdated, false);
      assert.equal(out.source, 'live');
    });
    ```

    Test C -- getCachedStatus neutralizes stale latest_version on version drift (the server_status tool path):
    ```js
    test('getCachedStatus neutralizes stale latest_version when current_version drifted', () => {
      const home = makeTempHome();
      const cachePath = buildLocalnestPaths(home).updateStatusPath;
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
      fs.writeFileSync(cachePath, `${JSON.stringify({
        package_name: 'synapse-mcp',
        current_version: '0.0.3',
        latest_version: '0.0.3',
        update_channel: 'stable',
        is_outdated: false,
        last_checked_at: new Date().toISOString(),
        last_check_ok: true
      }, null, 2)}\n`, 'utf8');

      const service = new UpdateService({
        synapseHome: home,
        packageName: 'synapse-mcp',
        currentVersion: '0.1.0',
        checkIntervalMinutes: 60,
        failureBackoffMinutes: 15,
        commandRunner: () => { throw new Error('getCachedStatus must not invoke npm'); }
      });

      const snapshot = service.getCachedStatus();
      assert.equal(snapshot.current_version, '0.1.0');
      assert.equal(snapshot.latest_version, '0.1.0', 'must not surface pre-upgrade latest_version');
      assert.equal(snapshot.is_outdated, false);
      assert.equal(snapshot.stale, true, 'must flag as stale so warmCheck refreshes');
    });
    ```

    Notes:
    - Reuse imports already at the top of the file (`UpdateService`, `compareVersions`, `buildLocalnestPaths`, `fs`, `path`, `makeTempHome`).
    - Do NOT modify the other existing tests; they must still pass untouched.
    - Do NOT create a new test file -- CLAUDE.md forbids root-level test files, and update-service.test.js already exists.
  </action>
  <verify>
    <automated>cd "/mnt/da2ae3dd-9788-4b37-88e8-effd7025eb4c/Base Projects/synapse" &amp;&amp; node --test test/update-service.test.js</automated>
  </verify>
  <done>
    - All pre-existing tests in update-service.test.js still pass.
    - Test A asserts compareVersions('0.1.0','0.0.3') === 1.
    - Test B proves version-drift triggers a live npm refresh under force:false.
    - Test C proves getCachedStatus surfaces the current_version as latest_version (neutralized) when drift is detected, and flags stale=true.
    - `node --test test/update-service.test.js` exits 0.
  </done>
</task>

</tasks>

<verification>
Full regression sweep after both tasks:

```bash
cd "/mnt/da2ae3dd-9788-4b37-88e8-effd7025eb4c/Base Projects/synapse"
npx tsc --noEmit -p tsconfig.json
node --test test/update-service.test.js
node --test test/config.test.js
```

All three must exit 0. The `config.test.js` existing assertions only check clamp bounds (15 and 1440), not the default, so the default change from 120 -> 60 is backwards compatible.
</verification>

<success_criteria>
- [ ] `shouldRefresh` returns true on `current_version` drift (unit-tested)
- [ ] `getCachedStatus` neutralizes stale `latest_version` on drift (unit-tested)
- [ ] Default `updateCheckIntervalMinutes` = 60
- [ ] `compareVersions('0.1.0','0.0.3') === 1` regression test in place
- [ ] `tsc --noEmit` passes
- [ ] `node --test test/update-service.test.js` passes
- [ ] `node --test test/config.test.js` passes
- [ ] No new runtime dependencies in package.json
- [ ] `compareVersions` in helpers.ts unchanged (the brief's hypothesis was wrong -- documented in plan objective)
</success_criteria>

<output>
After completion, create `.planning/quick/260409-nyr-fix-update-cache-semver-comparison-and-t/260409-nyr-SUMMARY.md` using the summary template, documenting:

1. Root cause: version-drift cache invalidation missing + `getCachedStatus` no-age-check bypass (NOT a lexicographic compareVersions bug, contrary to the initial hypothesis -- compareVersions was already correct).
2. Fix: version-aware `shouldRefresh`, neutralizing `getCachedStatus`, TTL default lowered 120 -> 60 min.
3. Files touched: `src/services/update/service.ts`, `src/runtime/config.ts`, `test/update-service.test.js`.
4. Tests added: 3 (compareVersions regression, live-refresh on drift, cached-path neutralization).
5. Breaking changes: none (default TTL change is within existing 15-1440 min clamp bounds; env override unchanged).
</output>
