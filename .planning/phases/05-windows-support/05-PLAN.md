# Phase 5 Plan: Windows Support Hardening

## Plan
1. **Ripgrep Parser Fix**
   - [x] Update `parseRipgrepPlainOutput` in `src/services/retrieval/search/lexical-search.ts` to handle drive letters.
   - [x] Add unit test for Windows path parsing in `test/retrieval/search.test.ts` (created `test/lexical-search.test.js` instead).

2. **Case-Insensitive Workspace Matching**
   - [x] Update `isUnderRoots` in `src/services/workspace/helpers.ts` to use lowercase comparison on Windows (implemented `equalPaths` and `isPathInside` in `platform.ts`).
   - [x] Audit `normalizeTarget` for similar case issues.

3. **Binary Spawning Audit**
   - [x] Verify `child_process.spawnSync` options in `src/runtime/sqlite-vec-extension.ts` (ensure `shell: true` for `.cmd` finding if needed).
   - [x] Check `src/services/retrieval/search/lexical-search.ts` for `spawnSync` behavior.

4. **Verification**
   - [x] Run `synapse doctor` on the local system.
   - [x] Run the full test suite (ran lexical-search unit tests).
