# Phase 5: Windows Support Improvement

## Context
Synapse aims to be the premier AI brain for local development. Since many developers work on Windows, robust cross-platform path handling, binary spawning, and output parsing are critical. Initial audits revealed major bugs in Ripgrep parsing for Windows absolute paths and potential case-sensitivity issues in workspace root matching.

## Objectives
- **FIX**: Repair Ripgrep plain output parsing to handle drive letters (e.g., `C:\`).
- **NORMALIZE**: Ensure path comparisons (e.g., `isUnderRoots`) are case-insensitive on Windows.
- **AUDIT**: Verify that all `spawnSync` calls correctly locate `.cmd` or `.exe` binaries.
- **VALIDATE**: Ensure `synapse doctor` correctly reflects Windows system health.

## Success Criteria
1. `npm test test/cli/router.test.ts` continues to pass on Windows.
2. New test case for Windows absolute paths in search results passes.
3. `synapse memory list` works correctly even if the root path is provided with alternative casing.
