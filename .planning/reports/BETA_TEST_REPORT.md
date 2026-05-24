# Synapse Cortex Beta Test Report (Session: 2026-05-24)

## Environment
- OS: Linux 6.12.47 x86_64
- Node: v24.15.0
- npm: 11.4.2
- ripgrep: 14.1.0 (`/usr/bin/rg`)
- Repo under test: `TheJenilDGohel/Synapse` (local checkout)
- Date: 2026-05-24 (UTC)

## Scope Executed
This session attempted to execute Phase 0/1 bootstrap commands from the ruthless beta protocol.

## Findings

### 1) [CRASH] Phase 1: local CLI entrypoint fails before setup/doctor/version
**Severity:** Crash / blocker

Running any of the baseline commands via local CLI entrypoint fails with an unhandled module resolution error:
- `node bin/synapse.js --version`
- `node bin/synapse.js doctor`
- `node bin/synapse.js setup`

All fail with:
- `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/workspace/Synapse/src/core/runtime/version.js' imported from /workspace/Synapse/bin/synapse.js`

This blocks execution of the remainder of the end-to-end protocol using the local checkout path.

### 2) [BUG] Phase 1: npm global install for beta package inaccessible in this environment
**Severity:** Environment/package availability blocker

- `npm install -g synapse-cortex@beta` returned `E403 Forbidden` from npm registry URL.
- This prevented direct installation-based testing path from running in this session.

### 3) [UX/INFRA] Local dependency install blocked by external fetch during `npm install`
**Severity:** Environment limitation (prevents local runtime bootstrapping)

- Running `npm install` in the repo failed while installing `onnxruntime-node` due to DNS/network resolution failure to `api.nuget.org` (`EAI_AGAIN`).
- This prevented dependency-complete local execution path for deeper phases in this environment.

## Retest Status (2026-05-24 Revision 2)
- ✅ `node bin/synapse.js --version` works with **zero** dependencies.
- ✅ `node bin/synapse.js doctor` provides actionable instructions if `tsx` is missing.
- ✅ Heavyweight dependencies are now optional to allow installation in restricted environments.

## Troubleshooting & Lite Mode

### E403 Forbidden on npm install
If you encounter E403, ensure you are not logged into a private registry that might be interfering with public package resolution. Try:
```bash
npm install -g synapse-cortex@beta --registry=https://registry.npmjs.org/
```

### Running in Lite Mode (Restricted Environments)
If native dependencies (`sqlite-vec`, `onnxruntime-node`) fail to install due to network restrictions:
1. The CLI will still boot and show `--version`.
2. `synapse setup` will work.
3. The system will automatically fall back to the `json` backend for indexing.
4. Semantic search and Reranking will be disabled, but Lexical (ripgrep) search and Knowledge Graph features will remain fully functional.

## Issue Tracker
- [x] Issue A resolved: `[CRASH] Phase 1: synapse.js fails with ERR_MODULE_NOT_FOUND`
  - *Fix: Implemented dependency-free bootstrap for basic commands and robust relauncher.*
- [x] Issue B addressed: `[BUG] Phase 1: npm install -g returns E403`
  - *Resolution: Confirmed package is public. Likely a local registry/mirror sync issue. Added troubleshooting above.*
- [x] Issue C addressed: `[UX] Phase 1: local npm install blocked by onnxruntime-node`
  - *Fix: Moved heavyweight dependencies to `optionalDependencies` and implemented 'Lite Mode' fallbacks in retrieval services.*

## Next Issues to Add (when blockers are fixed)
If bootstrap blockers are resolved, immediately continue with Phase 1.1 reruns and file new issues for any of the following if reproduced:
- Setup idempotency regressions (`synapse setup` run twice).
- Premature command UX (`doctor/start` before setup) with stack traces.
- Missing migration warnings on stable → beta upgrade.
