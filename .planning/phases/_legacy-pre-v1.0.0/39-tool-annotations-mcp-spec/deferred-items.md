# Phase 39 - Deferred Items

## Out-of-Scope Issues Discovered During 39-01 Execution

### 1. retrieval.ts exceeds 500-line CLAUDE.md file-size rule

- **File:** `src/mcp/tools/retrieval.ts`
- **Current size:** 516 lines (post-migration)
- **Pre-phase-39 size:** 586 lines (git HEAD before plan 39-01)
- **Status:** Phase 39 plan 39-01 REDUCED the file by 70 lines, but the residual is still over the 500-line CLAUDE.md limit.
- **Root cause:** 14 tool registrations with full input schemas plus the search-miss helpers and meta builders all live in one module.
- **Recommendation:** A future refactor plan should split retrieval.ts into at least two modules (e.g. `retrieval-search.ts` for search_* tools and `retrieval-navigation.ts` for list/tree/read_file/file_changed). Not in scope for phase 39 (which is annotation-only).
- **Action:** Deferred — do NOT fix in phase 39.
