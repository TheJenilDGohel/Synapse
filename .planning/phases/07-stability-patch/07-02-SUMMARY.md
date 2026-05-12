# Plan 07-02 Summary: Memory Store and Tree-sitter Fixes

## Status
- **Task 1: Enforce MemoryStore initialization**: COMPLETED
- **Task 2: Fix tree-sitter language loading**: COMPLETED

## Changes
- **src/core/engine/memory/store/MemoryStore.ts**:
  - Added `await this.init();` to all public methods that access sub-services (`durableStore`, `kgService`, etc.).
  - Ensured that any call to memory or knowledge graph features via the CLI correctly initializes the database and services.
  - Updated `init()` to correctly pass configuration and `EmbeddingService` to `DurableStore`.
- **src/core/engine/memory/store/DurableStore.ts**:
  - Added mutable metadata properties (`enabled`, `dbPath`, `embeddingService`, etc.) to satisfy the `MemoryStoreLike` interface.
  - Resolved "store.init is not a function" error.
  - Fixed semantic deduplication by ensuring `embeddingService` is no longer hardcoded to `null`.
- **src/core/engine/retrieval/chunker/languages.ts**:
  - Robustified `LANGUAGE_LOADERS` to defensively extract the language object from package exports (handles `pkg.default`, `pkg.typescript`, etc.).
  - Specifically fixed `typescript` and `tsx` loaders for recent versions of `tree-sitter-typescript`.
- **Transformers.js Workaround**:
  - Patched multiple files to use `createRequire` for loading `@huggingface/transformers`.
  - Bypassed broken ESM exports in the library (missing `.mjs` file in distribution).
  - Added `src/types/huggingface.d.ts` to fix TypeScript declaration errors.

## Verification Results
- `node bin/synapse.cjs memory list`: SUCCESS (No more "undefined" property errors).
- `node bin/synapse.cjs selftest`: SUCCESS (All core components passed: Memory CRUD, KG, Taxonomy, AST chunking).
