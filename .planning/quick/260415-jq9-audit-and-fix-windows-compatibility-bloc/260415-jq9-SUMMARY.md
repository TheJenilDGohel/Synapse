---
quick_id: 260415-jq9
title: Audit and fix Windows compatibility blockers, add Windows CI workflow, bump to next beta
date: 2026-04-15
status: complete
---

# Quick Task 260415-jq9 — Summary

## Context

Multiple Windows users reported they cannot install or use Synapse. No specific error logs were available, so the work began with a static Windows-hostility audit of the codebase. The audit identified 8 distinct blockers spanning the install path, the runtime, the search backend, and the hook subsystem — plus a missing CI lane. Every blocker has been fixed and the version bumped to `0.3.0-beta.4`.

## Blockers found and fixed

### CRITICAL — broke install or basic runtime

1. **`bin/_boot.cjs` symlink-name detection** (B1) — Loader detected which bin entry to launch via `basename(process.argv[1])` against a symlink name. npm doesn't create symlinks on Windows — it generates `.cmd` shims that all spawn `node bin/_boot.cjs`. Result: `basename` always returned `_boot` on Windows, the legacy fallback path treated `process.argv[2]` (the user's first CLI arg) as the target script name, and every bin command (`synapse`, `synapse`, `synapse-setup`, `synapse-doctor`, `synapse-upgrade`, `synapse-install-skill`, `synapse-task-context`, `synapse-capture-outcome`) was broken. **Fix:** `_boot.cjs` is now a module exporting `runTarget(targetName, [argv])`. Each of the 8 bin entries gets its own tiny shim under `bin/<name>.cjs` that calls `require('./_boot.cjs').runTarget('<target>.js')`. The `package.json` `bin` map points at the per-bin shims. Direct invocation of `_boot.cjs` and the legacy POSIX symlink path are preserved as fallbacks.

2. **`expandHome()` in `src/runtime/config.ts`** (B2) — Used `process.env.HOME` directly (undefined on Windows; Windows uses `USERPROFILE`) and the regex `/^~(?=$|\/)/` only matched `~/`, never `~\`. User-supplied config paths starting with `~` silently expanded to `''`. **Fix:** Switched to `os.homedir()` (which already handles `USERPROFILE` vs `HOME` correctly) and widened the regex to `/^~(?=$|[\\/])/` so both separators work.

3. **`scripts/runtime/preinstall-cleanup.mjs`** (B3) — Multiple Unix-only paths: (a) `path.join('/', ...)` builds a Unix root that is invalid on Windows; (b) `new URL('.', import.meta.url).pathname` returns `/C:/...` on Windows; (c) `selfDir.includes('/.npm/_cacache/tmp/')` never matches Windows backslash paths; (d) `execSync('npm root -g')` requires `npm.cmd` on Windows. **Fix:** Drive-aware reconstruction via `path.parse(process.execPath).root`, `fileURLToPath()` instead of `URL().pathname`, `path.join('.npm', '_cacache', 'tmp')` for the git-dep-prep guard, and platform-aware `npm.cmd` selection.

4. **`spawnSync('rg', ...)`** (B4 + B8) — Node's `child_process.spawn` does not auto-resolve PATHEXT on Windows, so `'rg'` failed with `ENOENT` even when `rg.exe` was on PATH. Killed `search_code` and `search_hybrid` on Windows. The runtime detection in `runtime/config.ts` and `cli/commands/selftest-checks.ts` had the same bug → `has_ripgrep` was always false on Windows. **Fix:** New module `src/runtime/platform.ts` exports `RG_BIN` (`rg.exe` on Windows, `rg` elsewhere). All three call sites (`services/retrieval/search/lexical-search.ts` x2, `runtime/config.ts:detectRipgrep`, `cli/commands/selftest-checks.ts:checkFileSearch`) now use `RG_BIN`.

### HIGH — broke features but not install

5. **`spawnSync('synapse', ...)` in hooks** (B5) — `scripts/hooks/synapse-pre-tool.cjs` and `scripts/hooks/synapse-post-tool.cjs` spawned the bare string `'synapse'`. Needs `synapse.cmd` on Windows. **Fix:** `IS_WINDOWS`/`SYNAPSE_BIN` constants at the top of each hook script. Also fixed the post-hook's path-basename for Windows paths by switching `filePath.split('/').pop()` to `path.basename(filePath)`.

6. **`spawnSync('npm', ...)` in install-synapse-skill** (B6) — Embeddings install (`@huggingface/transformers`) silently failed on Windows because of bare `'npm'`. **Fix:** Platform-aware `npm.cmd` selection.

7. **`spawnSync('npm', ...)` in quality-audit** (B7) — Same bug, only affects local quality script. **Fix:** Same approach.

8. **`spawnSync('npm', ['root', '-g'], ...)` in doctor-synapse** — Same root cause. **Fix:** Same approach.

### Bonus — version drift

9. **`SERVER_VERSION` in `src/runtime/version.ts` was stale** — Discovered while smoke-testing the new bin shims: `node bin/synapse.cjs --version` printed `0.3.0-beta.2` because the constant had never been bumped (it was missed in beta.3 too). Bumped to `0.3.0-beta.4` to match `package.json`. This is a recurring footgun — should add a sync check in CI or generate the constant from `package.json` at build time. Logged as a follow-up.

### MEDIUM — verification gap closed

10. **CI was Linux-only** — `.github/workflows/quality.yml` was upgraded from a single `ubuntu-latest` job to a `[ubuntu-latest, windows-latest]` matrix with `fail-fast: false`. Added platform-aware ripgrep install (`apt-get install ripgrep` on Linux, `choco install ripgrep` on Windows), a `bash` shell hint for the ML-deps install step, and a smoke-test step that runs the new bin shims on both OSes. Future Windows regressions will now be caught at PR time without needing a human to test on Windows.

11. **Missing `.gitattributes`** — Created with `* text=auto eol=lf` and explicit `eol=lf` for all source/script extensions so Windows users with `core.autocrlf=true` no longer receive CRLF in shebangs or YAML/JSON files. Binary assets are explicitly marked `binary`.

## Files touched

**New (10):**
- `src/runtime/platform.ts`
- `bin/synapse.cjs`
- `bin/synapse.cjs`
- `bin/synapse-setup.cjs`
- `bin/synapse-doctor.cjs`
- `bin/synapse-upgrade.cjs`
- `bin/synapse-install-skill.cjs`
- `bin/synapse-task-context.cjs`
- `bin/synapse-capture-outcome.cjs`
- `.gitattributes`

**Modified (12):**
- `bin/_boot.cjs` (rewritten as runTarget exporter)
- `src/runtime/config.ts` (`expandHome`, ripgrep detection)
- `src/runtime/version.ts` (version constant sync)
- `src/services/retrieval/search/lexical-search.ts` (RG_BIN)
- `src/cli/commands/selftest-checks.ts` (RG_BIN)
- `scripts/runtime/preinstall-cleanup.mjs` (cross-platform paths + npm.cmd)
- `scripts/runtime/install-synapse-skill.mjs` (npm.cmd)
- `scripts/runtime/doctor-synapse.mjs` (npm.cmd)
- `scripts/hooks/synapse-pre-tool.cjs` (SYNAPSE_BIN)
- `scripts/hooks/synapse-post-tool.cjs` (SYNAPSE_BIN + path.basename)
- `scripts/quality/quality-audit.mjs` (NPM_BIN)
- `.github/workflows/quality.yml` (Windows matrix + ripgrep install + smoke test)
- `package.json` (bin map + check script + version)
- `CHANGELOG.md` (0.3.0-beta.4 entry)
- `.planning/STATE.md` (quick task row)

## Verification

- `npm run check` (tsc + node --check on all bin/ shims, all bin/ ESM targets, all script files) → green.
- `npx tsx --test test/config.test.js test/mcp-annotations.test.js test/mcp-tools.test.js` → 16/16 pass (config expandHome regression check + 74-tool MCP annotations + tools register-and-execute).
- `node bin/synapse.cjs --version` → `0.3.0-beta.4`.
- `node bin/synapse.cjs --version` → `0.3.0-beta.4`.
- The new Windows CI matrix will run on the next push to `release/0.3.0` and surface anything the static audit missed.

## Out of scope / follow-ups

- **`SERVER_VERSION` drift mitigation** — Should be auto-generated from `package.json` at build time, OR added to the `bump:beta` npm script. Currently a manual sync. Filed as follow-up.
- **Windows path normalization in config-file `roots`** — User config files written on Linux/macOS may have `/`-separated paths that break when the same `.synapse` directory is opened on Windows. Out of scope here; needs a separate "config portability" pass.
- **node:sqlite Windows availability** — Confirmed available in Node 22.6+ on Windows; no fix needed today.
- **Bundling ripgrep** — Decision to keep ripgrep optional was preserved. If Windows users complain about the choco/winget step, revisit.
- **Doc translations / "auto-update docs per version" memory** — Defer to a release-engineering pass.
