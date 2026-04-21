---
phase: 40-structured-output-mcp-spec
plan: 02
subsystem: mcp
tags: [zod, mcp-spec, output-schema, archetype-wiring, structured-content, test-assertion]

# Dependency graph
requires:
  - phase: 40-01
    provides: "8 output archetype schemas + META_SCHEMA + exported toolResult() + sharedSchemas bag with OUTPUT_*_RESULT_SCHEMA keys"
  - phase: 39
    provides: "test/mcp-annotations.test.js harness + EXPECTED_ANNOTATIONS map pattern"
provides:
  - "All 72 MCP tools now declare an explicit outputSchema mapped to one of the 8 archetypes"
  - "EXPECTED_OUTPUT_SCHEMAS identity-check map in test/mcp-annotations.test.js locks the 72-tool archetype assignment against future drift"
  - "toolResult() unit assertion proving structuredContent.data + content[0].text are always populated (STRUCT-01 runtime guard)"
  - "Per-tool spec compliance: no tool falls through to FREEFORM fallback accidentally"
affects:
  - 42  # bi-temporal KG (may surface ENTITY_RESULT_SCHEMA need)
  - 45  # actor-aware memories

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Group A files (memory-store, memory-workflow, graph-tools) reference archetypes via `schemas.OUTPUT_*_RESULT_SCHEMA` — the existing sharedSchemas prop channel wired in Plan 01"
    - "Group B files (core, retrieval, kg-delete, backfill, find, audit, symbol) import archetypes directly from `../common/schemas.js` since they do not receive a schemas prop"
    - "Per-tool `outputSchema:` lives inside the ToolDefinition object literal immediately after `annotations:`, preserving zero-diff pattern for future tool additions"
    - "EXPECTED_OUTPUT_SCHEMAS uses short labels resolved through ARCHETYPE_MAP for diff-friendly identity assertions (mirrors Phase 39 EXPECTED_ANNOTATIONS shape)"
    - "OutputArchetype type alias duplicated per Group A file instead of exported from common — avoids Plan 01 scope creep"

key-files:
  created: []
  modified:
    - src/mcp/tools/core.ts
    - src/mcp/tools/retrieval.ts
    - src/mcp/tools/kg-delete-tools.ts
    - src/mcp/tools/backfill-tools.ts
    - src/mcp/tools/find-tools.ts
    - src/mcp/tools/audit-tools.ts
    - src/mcp/tools/symbol-tools.ts
    - src/mcp/tools/memory-store.ts
    - src/mcp/tools/memory-workflow.ts
    - src/mcp/tools/graph-tools.ts
    - test/mcp-annotations.test.js
    - test/terse-response.test.js

key-decisions:
  - "graph-tools.ts `schemas` prop lifted from optional `unknown` to required `SharedSchemas` — pre-existing `schemas?: unknown` was never actually consumed, this plan made it real"
  - "test/terse-response.test.js harness updated to pass OUTPUT_* archetypes to registerMemoryStoreTools/registerMemoryWorkflowTools/registerGraphTools (Rule 3 blocker fix)"
  - "FREEFORM budget enforced at exactly 3 tools: diary_read, help, usage_guide (≤5 per CONTEXT.md)"
  - "ENTITY_RESULT_SCHEMA intentionally NOT added — zero references across tool files and test, confirming Plan 01's dropping decision was correct"
  - "Per-file OutputArchetype type alias (not exported from common) — keeps all framework edits inside Plan 01's ownership"

patterns-established:
  - "Tool files split by archetype-access strategy: Group A (schemas prop) vs Group B (direct import) documented in PLAN 02 and preserved in code"
  - "Archetype identity comparison is the authoritative test — no spread/clone at registration site"
  - "New tool registrations MUST add `outputSchema:` in the ToolDefinition literal; absence falls through to FREEFORM via the Plan 01 registrar fallback"

requirements-completed:
  - STRUCT-01
  - STRUCT-02
  - STRUCT-03

# Metrics
duration: 21m
completed: 2026-04-13
---

# Phase 40 Plan 02: Per-Tool Archetype Wiring + Extended Test Summary

**72/72 MCP tools wired to their correct output archetype (17 SEARCH, 10 STATUS, 11 BATCH, 6 MEMORY, 7 ACK, 4 TRIPLE, 14 BUNDLE, 3 FREEFORM), with a parallel EXPECTED_OUTPUT_SCHEMAS identity-check map and toolResult() unit assertion locking the mapping against drift — test count 163 → 165, zero touches under `src/mcp/common/`.**

## Performance

- **Duration:** 21m (1266s elapsed wall-clock from first edit to final commit of Task 3)
- **Started:** 2026-04-13T07:38:14Z
- **Completed:** 2026-04-13T07:59:20Z
- **Tasks:** 3
- **Files modified:** 12 (10 tool files + 2 test files)

## Accomplishments

- Wired all 72 tools across 10 tool files to exactly one of the 8 output archetypes. Total `outputSchema:` occurrences in `src/mcp/tools/` = 72.
- Extended `test/mcp-annotations.test.js` with `ARCHETYPE_MAP`, `EXPECTED_OUTPUT_SCHEMAS` (72 entries), and two new `test()` blocks — one asserting identity equality between every tool's `meta.outputSchema` and the imported archetype object, one asserting `toolResult()` populates both `structuredContent.data` and `content[0].text` (STRUCT-01 runtime guard).
- FREEFORM budget honored: exactly 3 tools (diary_read, help, usage_guide), under the ≤5 CONTEXT.md budget.
- ENTITY_RESULT_SCHEMA verified absent across all touched files AND the test — zero occurrences.
- Test count grew 163 → 165 (+2 new assertions in mcp-annotations.test.js), zero regressions.
- Zero files touched under `src/mcp/common/` — framework ownership preserved in Plan 01 per the revision rule.
- graph-tools.ts upgraded from `schemas?: unknown` placeholder to a real required `SharedSchemas` prop — makes the sharedSchemas bag actually flow into KG/nest/diary/ingest tool registrations.

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire 30 tools in Group B files (core, retrieval, kg-delete, backfill, find, audit, symbol)** — `91892dd` (feat)
2. **Task 2: Wire 42 tools in Group A files (memory-store, memory-workflow, graph-tools) + harness fix** — `98235be` (feat)
3. **Task 3: Extend mcp-annotations.test.js with EXPECTED_OUTPUT_SCHEMAS identity check + toolResult unit assertion** — `3c36693` (test)

**Plan metadata:** (final docs commit appended after this SUMMARY.md)

## Archetype Distribution (Authoritative)

Recomputed from the 72-tool table in 40-02-PLAN.md `<tool_archetype_mapping>`:

| Archetype | Count | Tools |
|-----------|------:|-------|
| SEARCH    | 17    | find, find_callers, find_definition, find_implementations, find_usages, get_symbol, list_projects, list_roots, memory_events, memory_list, memory_recall, memory_related, memory_suggest_relations, rename_preview, search_code, search_files, search_hybrid |
| STATUS    | 10    | embed_status, health, hooks_list_events, hooks_stats, index_project, index_status, kg_stats, memory_status, server_status, update_status |
| BATCH     | 11    | ingest_json, ingest_markdown, kg_add_entities_batch, kg_add_triples_batch, kg_backfill_links, kg_delete_entities_batch, kg_delete_entity, kg_delete_triples_batch, memory_delete_batch, memory_store_batch, project_backfill |
| MEMORY    |  6    | capture_outcome, memory_capture_event, memory_get, memory_store, memory_update, teach |
| ACK       |  7    | diary_write, kg_add_entity, kg_invalidate, memory_add_relation, memory_delete, memory_remove_relation, update_self |
| TRIPLE    |  4    | kg_add_triple, kg_as_of, kg_query, kg_timeline |
| BUNDLE    | 14    | agent_prime, audit, file_changed, graph_bridges, graph_traverse, memory_check_duplicate, nest_branches, nest_list, nest_tree, project_tree, read_file, summarize_project, task_context, whats_new |
| FREEFORM  |  3    | diary_read, help, usage_guide |
| **TOTAL** | **72**| — |

Sum: 17 + 10 + 11 + 6 + 7 + 4 + 14 + 3 = **72** ✓.

Note: The plan's "rough totals" note (15/10/11/6/8/4/15/3) under `<tool_archetype_mapping>` was explicitly flagged as unreliable — the executor's recomputation from the authoritative table landed at (17/10/11/6/7/4/14/3), matching the prompt's `critical_context_from_plan_01` breakdown exactly.

## Files Created/Modified

### Group B (direct import from ../common/schemas.js) — Task 1, commit 91892dd

- `src/mcp/tools/core.ts` — 156 → 167 lines. Added import of `STATUS_RESULT_SCHEMA, FREEFORM_RESULT_SCHEMA, ACK_RESULT_SCHEMA`. Wired 6 tools: server_status/health/update_status→STATUS, usage_guide/help→FREEFORM, update_self→ACK.
- `src/mcp/tools/retrieval.ts` — 516 → 535 lines. Added import of `SEARCH_RESULT_SCHEMA, STATUS_RESULT_SCHEMA, BUNDLE_RESULT_SCHEMA`. Wired 14 tools (list_roots/list_projects/search_files/search_code/search_hybrid/get_symbol/find_usages→SEARCH; index_status/embed_status/index_project→STATUS; project_tree/read_file/file_changed/summarize_project→BUNDLE).
- `src/mcp/tools/kg-delete-tools.ts` — 62 → 65 lines. Added import of `BATCH_RESULT_SCHEMA`. Wired all 3 delete tools to BATCH.
- `src/mcp/tools/backfill-tools.ts` — 32 → 34 lines. Added import of `BATCH_RESULT_SCHEMA`. Wired project_backfill→BATCH.
- `src/mcp/tools/find-tools.ts` — 68 → 70 lines. Added import of `SEARCH_RESULT_SCHEMA`. Wired find→SEARCH.
- `src/mcp/tools/audit-tools.ts` — 31 → 33 lines. Added import of `BUNDLE_RESULT_SCHEMA`. Wired audit→BUNDLE.
- `src/mcp/tools/symbol-tools.ts` — 157 → 162 lines. Added import of `SEARCH_RESULT_SCHEMA`. Wired find_callers/find_definition/find_implementations/rename_preview→SEARCH.

### Group A (schemas prop destructure) — Task 2, commit 98235be

- `src/mcp/tools/memory-store.ts` — 387 → 409 lines. Extended `SharedSchemas` interface with 8 `OUTPUT_*_RESULT_SCHEMA` fields typed as `OutputArchetype`. Wired 13 tools: memory_list/memory_events/memory_suggest_relations/memory_related→SEARCH; memory_get/memory_store/memory_update/memory_capture_event→MEMORY; memory_delete/memory_add_relation/memory_remove_relation→ACK; memory_delete_batch/memory_store_batch→BATCH.
- `src/mcp/tools/memory-workflow.ts` — 229 → 245 lines. Extended `SharedSchemas` interface. Wired 7 tools: task_context/agent_prime/whats_new→BUNDLE; memory_status→STATUS; memory_recall→SEARCH; capture_outcome/teach→MEMORY.
- `src/mcp/tools/graph-tools.ts` — 425 → 460 lines. Added `SharedSchemas` interface (was `schemas?: unknown`), promoted `schemas` to a required prop, destructured it in `registerGraphTools`. Wired 22 tools: kg_add_entity/kg_invalidate/diary_write→ACK; kg_add_triple/kg_query/kg_as_of/kg_timeline→TRIPLE; kg_add_entities_batch/kg_add_triples_batch/kg_backfill_links/ingest_markdown/ingest_json→BATCH; kg_stats/hooks_stats/hooks_list_events→STATUS; nest_list/nest_branches/nest_tree/graph_traverse/graph_bridges/memory_check_duplicate→BUNDLE; diary_read→FREEFORM.
- `test/terse-response.test.js` — 250 → 271 lines. Rule 3 blocker fix: updated the existing harness to import the 8 archetypes from `src/mcp/common/index.js` and pass them (as `OUTPUT_*_RESULT_SCHEMA` keys) to `registerMemoryStoreTools`, `registerMemoryWorkflowTools`, and `registerGraphTools`. Without this fix, graph-tools.ts's new required `schemas` prop broke the existing "all 13 write tools include terse parameter" test at line 77.

### Test extension — Task 3, commit 3c36693

- `test/mcp-annotations.test.js` — 321 → 496 lines. Added barrel import of the 8 archetypes + `toolResult` from `../src/mcp/common/index.js`. Added `ARCHETYPE_MAP` (label → archetype) and `EXPECTED_OUTPUT_SCHEMAS` (72-entry label map, alphabetical mirror of EXPECTED_ANNOTATIONS). Added two new `test()` blocks: (a) identity assertion that every registered tool's `meta.outputSchema` matches the expected archetype object via `!==` reference equality with collect-all-mismatches failure; (b) `toolResult({foo:'bar'}, 'json', 'Test')` unit assertion checking `structuredContent.data`, `structuredContent.meta.schema_version`, `content[0].type === 'text'`, and `content[0].text` contains the JSON payload.

### Registration diff snippet (retrieval.ts, synapse_index_status)

Before (lines 189-198):
```typescript
registerJsonTool(
  'synapse_index_status',
  {
    title: 'Index Status',
    description: 'Return local semantic index status and metadata.',
    inputSchema: {},
    annotations: READ_ONLY_ANNOTATIONS
  },
  async () => normalizeIndexStatus(vectorIndex.getStatus())
);
```

After:
```typescript
registerJsonTool(
  'synapse_index_status',
  {
    title: 'Index Status',
    description: 'Return local semantic index status and metadata.',
    inputSchema: {},
    annotations: READ_ONLY_ANNOTATIONS,
    outputSchema: STATUS_RESULT_SCHEMA
  },
  async () => normalizeIndexStatus(vectorIndex.getStatus())
);
```

One-line diff per tool, zero handler body / annotation changes — exactly as planned.

## Decisions Made

- **graph-tools.ts `schemas` is now required, not `unknown`.** The pre-Plan-02 `schemas?: unknown` in `RegisterGraphToolsOptions` was a placeholder that was never consumed. Plan 02 promotes it to a real `SharedSchemas`-typed prop with 8 `OUTPUT_*_RESULT_SCHEMA` fields, matching the pattern already used by memory-store.ts and memory-workflow.ts. This is functionally a non-breaking change because `register-tools.ts` was already passing the `schemas` prop into `registerGraphTools` since Plan 01 Task 3 wired the sharedSchemas bag.
- **test/terse-response.test.js harness extended (Rule 3 blocker).** Promoting graph-tools.ts `schemas` to required broke the existing test at line 77 ("Cannot read properties of undefined (reading 'OUTPUT_ACK_RESULT_SCHEMA')"). Fix: import the 8 archetypes from `src/mcp/common/index.js` and merge them into the test's fake `schemas` object under `OUTPUT_*_RESULT_SCHEMA` keys; pass `schemas` to `registerGraphTools` alongside memory. This is a one-file harness update — zero production-code changes — and keeps the 163-test baseline green before the +2 additions in Task 3 take effect.
- **Inline `schemas.OUTPUT_*_RESULT_SCHEMA` references instead of top-of-function destructure.** Plan allowed either; executor chose inline to keep the per-tool diff clear and avoid a noisy destructure block at the top of each register function. Every `outputSchema: schemas.OUTPUT_*_RESULT_SCHEMA` reference is grep-able and identity-comparable.
- **Per-file `type OutputArchetype = ...` alias.** Duplicated at the top of each Group A file rather than exported from `src/mcp/common/schemas.ts`, because the latter would be a framework edit and Plan 02 is strictly forbidden from touching `src/mcp/common/`. Three trivial duplicates are the right tradeoff.
- **FREEFORM_RESULT_SCHEMA used exactly 3 times in tool registrations.** diary_read (graph-tools.ts), help (core.ts), usage_guide (core.ts). Well under the ≤5 budget. Any future tool wanting FREEFORM should force a conversation about whether a new archetype is warranted instead.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed test/terse-response.test.js harness after promoting graph-tools.ts schemas prop to required**
- **Found during:** Task 2 (Wire Group A files)
- **Issue:** Promoting `registerGraphTools` options `schemas?: unknown` to `schemas: SharedSchemas` (required) broke the existing test `MCP registration: all 13 write tools include terse parameter` at `test/terse-response.test.js:77`. The test was calling `registerGraphTools({ registerJsonTool, memory })` without passing `schemas`, so the new `schemas.OUTPUT_ACK_RESULT_SCHEMA` reference threw `TypeError: Cannot read properties of undefined`. Test count went from 163 → 162 pass.
- **Fix:** Updated the harness to (a) import the 8 archetype objects from `src/mcp/common/index.js`, (b) merge them into the fake `schemas` object under `OUTPUT_*_RESULT_SCHEMA` keys (matching the real `sharedSchemas` bag in `src/app/register-tools.ts`), (c) pass `schemas` to `registerGraphTools` alongside `memory`. The harness change is additive — no existing assertions modified.
- **Files modified:** test/terse-response.test.js (+21 lines: import + 8 OUTPUT_* entries + schemas arg)
- **Verification:** Full `npm test` went 162 → 163 pass before Task 3's +2 additions, then 165 pass after Task 3.
- **Committed in:** 98235be (Task 2 commit)

**2. [Planning ambiguity - totals recomputation] Archetype counts landed at (17/10/11/6/7/4/14/3), not plan's rough (15/10/11/6/8/4/15/3)**
- **Found during:** Pre-Task-1 audit and re-verified in Task 3 EXPECTED_OUTPUT_SCHEMAS population
- **Issue:** The plan explicitly said "NOTE ON TOTALS: The exact archetype counts MUST sum to 72 in the final test. The executor recomputes from the table above — do not trust these rough totals blindly. The authoritative source is the table, not the summary." The rough totals summed to 72 as well but had wrong per-archetype breakdown.
- **Fix:** Recomputed from the 72-tool table line-by-line. Final distribution is 17 SEARCH + 10 STATUS + 11 BATCH + 6 MEMORY + 7 ACK + 4 TRIPLE + 14 BUNDLE + 3 FREEFORM = 72. This matches the prompt's `critical_context_from_plan_01` breakdown exactly.
- **Files modified:** (none — this was a counting correction, not a code change)
- **Verification:** Grep counts per file match plan acceptance criteria (within the documented interface-declaration offset). Test 2 in mcp-annotations.test.js passes with all 72 identity comparisons resolving correctly.
- **Committed in:** implicitly across Tasks 1, 2, 3 — all wiring landed in the correct bucket

**3. [Scope boundary note - pre-existing violation] retrieval.ts now 535 lines (over 500 cap)**
- **Found during:** End-of-Task-1 verification
- **Issue:** `src/mcp/tools/retrieval.ts` was already 516 lines at the Plan 01 end commit — over CLAUDE.md's 500-line cap before Plan 02 started. Adding 14 `outputSchema:` lines plus a 5-line import block pushed it to 535.
- **Decision:** Do NOT auto-refactor. Splitting retrieval.ts is a dedicated refactor task that belongs to a different plan (it would require extracting search vs file-ops vs index-ops into sub-modules, touching 14 registrations and their helpers). Plan 02's scope is strict per-tool archetype wiring; introducing a 14-tool split-file refactor mid-execution would be pure scope creep. Flagged in this SUMMARY for a future plan.
- **Files affected:** src/mcp/tools/retrieval.ts (535 lines — 7% over cap)
- **Follow-up:** Candidate for a 41-XX refactor plan. Other 9 tool files are within budget (graph-tools at 460, memory-store at 409, memory-workflow at 245, rest < 170 lines).

**4. [Pre-existing z.any() in input schemas — NOT in scope]**
- **Found during:** Final verification `grep -rc 'z.any()' src/mcp/tools/`
- **Issue:** The plan's verification step 2 says "`grep -rc 'z.any()' src/mcp/tools/*.ts` returns 0". Actual result: 2 occurrences, both in `src/mcp/tools/graph-tools.ts` at lines 70 and 119 — `properties: z.record(z.string(), z.any())` — which are **input schemas** for KG entity property bags, not output escape hatches.
- **Decision:** Leave them. The plan's verification intent is about output-side per-tool escape hatches (the FREEFORM budget); input-side `z.any()` on a structurally-unbounded user-provided property record is a legitimate and pre-existing pattern dating to earlier phases. Rewriting it to `z.unknown()` would be Plan-02-out-of-scope micro-refactoring with no correctness/security benefit.
- **Files affected:** src/mcp/tools/graph-tools.ts (lines 70, 119 — pre-existing)

---

**Total deviations:** 4 documented (1 Rule 3 auto-fix, 1 planning-ambiguity correction, 2 scope-boundary notes)
**Impact on plan:** Zero scope creep. The Rule 3 harness fix was essential for keeping the 163-test baseline green. The totals recomputation matches the prompt's authoritative breakdown. The retrieval.ts line count and pre-existing input-side `z.any()` are flagged for future attention but out of Plan 02's scope.

## Issues Encountered

- **Grep count caveat on per-archetype counts in Group A files.** The plan's acceptance criteria for memory-store.ts say `grep -c "OUTPUT_SEARCH_RESULT_SCHEMA" = 4 exactly`. Actual count is 5 because the SharedSchemas interface declaration adds +1 (one reference for each of the 8 OUTPUT_* keys typed as `OutputArchetype`). The plan's alternative would have been to not extend the SharedSchemas interface — but the plan explicitly says "Extend the SharedSchemas interface in each file". The two requirements are mutually inconsistent by +1; the executor honored the interface-extension directive and accepted that grep counts are off by 1 from the per-archetype acceptance numbers. The **functional** count is correct (4 tool registrations use OUTPUT_SEARCH_RESULT_SCHEMA in memory-store.ts); the **grep** count is 5 (4 usages + 1 interface field). The authoritative validator is Test 2 in mcp-annotations.test.js, which uses identity equality, not grep counting.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Phase 40 is complete after this plan. All three STRUCT requirements are satisfied:

- **STRUCT-01** — toolResult() runtime envelope guarded at the unit level by Test 3. Since every tool routes through `toolResult()` via `createJsonToolRegistrar`, this single assertion locks `structuredContent.data` + `content[0].text` for all 72 tools.
- **STRUCT-02** — Every tool declares a typed `outputSchema` (not generic `z.any()`). Test 2 enforces 72/72 identity equality. Zero tools fall through to the FREEFORM fallback accidentally (the 3 FREEFORM tools are explicitly chosen).
- **STRUCT-03** — Backwards compatibility preserved. Full 165-test suite green (was 163; +2 new assertions from Task 3). Zero handler body changes, zero annotation flips, zero response_format semantics touched.

### Ready for Phase 41+

- **Adding a new tool:** contributors must add `outputSchema: SOMETHING_RESULT_SCHEMA` inside the ToolDefinition literal (or accept the FREEFORM fallback explicitly) AND add an entry to `EXPECTED_OUTPUT_SCHEMAS` in the test. Test 2 will fail fast on any drift.
- **Adding a new archetype:** would require edits to `src/mcp/common/schemas.ts` (Plan 01's territory), `src/mcp/common/index.ts` (re-export), `src/app/register-tools.ts` (sharedSchemas bag), and `test/mcp-annotations.test.js` (ARCHETYPE_MAP + import). Zero edits expected in any tool file unless an existing tool is being reassigned.
- **retrieval.ts refactor candidate:** 535 lines — 7% over CLAUDE.md's 500-line cap. Split into `retrieval-list.ts`, `retrieval-search.ts`, `retrieval-files.ts` is the natural seam. Out of scope for Phase 40 but flagged here.
- **ENTITY_RESULT_SCHEMA revival path:** still valid for Phase 42 (bi-temporal KG) or Phase 45 (actor-aware memories) if a genuine entity-shape use case emerges. The archetype library is extensible — add ENTITY_RESULT_SCHEMA to schemas.ts, re-export through the barrel, add to sharedSchemas, add to ARCHETYPE_MAP + EXPECTED_OUTPUT_SCHEMAS, reassign the relevant tools. Plan 02's groundwork makes this a mechanical operation.

## Self-Check

**1. Files on disk (12 modified):**
- FOUND: src/mcp/tools/core.ts (167 lines, 6 outputSchema)
- FOUND: src/mcp/tools/retrieval.ts (535 lines, 14 outputSchema)
- FOUND: src/mcp/tools/kg-delete-tools.ts (65 lines, 3 outputSchema)
- FOUND: src/mcp/tools/backfill-tools.ts (34 lines, 1 outputSchema)
- FOUND: src/mcp/tools/find-tools.ts (70 lines, 1 outputSchema)
- FOUND: src/mcp/tools/audit-tools.ts (33 lines, 1 outputSchema)
- FOUND: src/mcp/tools/symbol-tools.ts (162 lines, 4 outputSchema)
- FOUND: src/mcp/tools/memory-store.ts (409 lines, 13 outputSchema)
- FOUND: src/mcp/tools/memory-workflow.ts (245 lines, 7 outputSchema)
- FOUND: src/mcp/tools/graph-tools.ts (460 lines, 22 outputSchema)
- FOUND: test/mcp-annotations.test.js (496 lines — under 500 cap after inline-comment trim)
- FOUND: test/terse-response.test.js (271 lines — harness updated with 8 OUTPUT_* archetypes)

**2. Task commits present:**
- FOUND: 91892dd (Task 1: 30 tools in Group B)
- FOUND: 98235be (Task 2: 42 tools in Group A + harness fix)
- FOUND: 3c36693 (Task 3: EXPECTED_OUTPUT_SCHEMAS + toolResult assertion)

**3. Acceptance criteria:**
- All 72 tools have `outputSchema:` assignments — CONFIRMED (sum 6+14+3+1+1+1+4+13+7+22 = 72)
- FREEFORM budget ≤ 5 — CONFIRMED (exactly 3 tools: diary_read, help, usage_guide)
- ENTITY_RESULT_SCHEMA absent in src/mcp/tools/ and test/ — CONFIRMED (zero occurrences)
- No files under `src/mcp/common/` touched in Plan 02 — CONFIRMED (`git diff --name-only 4bbb104..HEAD -- src/mcp/common/` empty)
- `npx tsc --noEmit` exits 0 — CONFIRMED (clean compile after each task)
- `npm run build` exits 0 — CONFIRMED (final verification)
- `npm test` exits 0 with 165/165 passes — CONFIRMED (was 163, +2 from Task 3)
- Test 2 (outputSchema identity) passes — CONFIRMED
- Test 3 (toolResult envelope) passes — CONFIRMED
- test/mcp-annotations.test.js under 500 lines — CONFIRMED (496 lines)
- Phase 39 EXPECTED_ANNOTATIONS test unchanged — CONFIRMED (Test 1 still green)
- retrieval.ts over 500 lines — DOCUMENTED DEVIATION (pre-existing, flagged)
- 2 pre-existing `z.any()` in graph-tools.ts input schemas — DOCUMENTED DEVIATION (input-side, out of scope)

## Self-Check: PASSED

---
*Phase: 40-structured-output-mcp-spec*
*Completed: 2026-04-13*
