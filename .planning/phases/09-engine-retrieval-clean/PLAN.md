# Phase 9 Plan: Engine & Retrieval Dependency Clean

## Objective
Audit and refactor `src/core/engine` and `src/services/retrieval` to eliminate cyclic dependencies and ensure a clean "upward" dependency flow (`services` -> `core`).

## Wave 1: Retrieval Core Relocation
Move implementation files from `src/services/retrieval` to `src/core/engine/retrieval`.

1. [x] Create subdirectories in `src/core/engine/retrieval/` matching the structure of `src/services/retrieval`.
2. [x] Move implementation files (chunker, embedding, reranker, search, sqlite-vec, symbols, vector-index, core).
3. [x] Update internal imports within moved files to use relative paths or re-wired `core/engine` imports.
4. [x] Ensure `src/core/engine/retrieval.ts` (barrel) exports from these new local paths instead of `../../services`.

## Wave 2: Breaking the Cycle
1. [x] Update `src/services/retrieval/index.ts` to be a simple re-export of `src/core/engine/retrieval`.
2. [x] Verify that NO file in `src/core/engine` imports from `src/services/retrieval`.
3. [x] If `src/services/retrieval` becomes just a proxy, evaluate if it should be removed entirely in favor of direct `core/engine` usage. (For now, keep it as a legacy redirect if needed, but point all internal code to `core/engine`).

## Wave 3: Memory Engine Alignment (Optional/Follow-up)
1. [x] Audit `src/services/memory` similarly.
2. [x] If cyclic dependencies exist there (e.g. `memory` re-exported by `engine` but `memory` depending on `engine/database`), move core memory logic to `src/core/engine/memory/`.

## Verification Tasks
1. [x] Run `tsc` to find broken imports.
2. [x] Run a grep for any remaining `import.*services/retrieval` inside `src/core/engine`.
3. [x] Run existing tests to ensure semantic search and indexing still work.
