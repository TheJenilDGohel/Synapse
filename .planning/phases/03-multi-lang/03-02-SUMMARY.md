# Phase 3 Plan 02 Summary: Query-Based AST Chunking

## Objective
Implement AST-aware chunking for Python, Go, and Rust by transitioning the `AstChunker` to a Query-based extraction model to improve precision and maintainability.

## Completed Tasks
- [x] **Task 1: Define Tree-sitter Queries for Polyglot Languages**
  - Created `src/core/engine/retrieval/chunker/queries/python.scm`
  - Created `src/core/engine/retrieval/chunker/queries/go.scm`
  - Created `src/core/engine/retrieval/chunker/queries/rust.scm`
- [x] **Task 2: Refactor AstChunker to use Query API**
  - Updated `AstChunker` in `src/core/engine/retrieval/chunker/service.ts` to compile and cache tree-sitter `.scm` queries.
  - Replaced manual tree-walking in `collectCandidateNodes` with `query.captures` when a query is available.
  - Maintained line-based and explicit manual tree-walking as fallbacks.
  - Successfully debugged compatibility issues between parser and newer grammar versions by downgrading grammars to match the `tree-sitter@0.21.0` ABI format.
- [x] **Task 3: Verify Polyglot Chunking**
  - Designed and created automated tests for Python, Go, and Rust AST chunk extraction.
  - Verified `chunkLines` boundaries and ensuring `span >= 2` lines.
  - Passing output confirms accurate `scope_path` labeling for declarations.

## Verification Results
- Automated tests (`test/polyglot-chunking.test.ts`) confirm structural chunking is functional for all newly introduced languages.

## Future Considerations
- More complex languages or edge cases might require granular node queries.
- Add queries for currently manually walked languages (JavaScript, Dart, Java, etc.) to fully retire `DECL_TYPES_BY_LANG` over time.
