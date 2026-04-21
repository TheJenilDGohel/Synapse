---
phase: 40-structured-output-mcp-spec
verified: 2026-04-13T08:15:00Z
status: passed
score: 6/6 must-haves verified
re_verification: null
requirements_covered:
  - STRUCT-01
  - STRUCT-02
  - STRUCT-03
info:
  - file: src/mcp/tools/retrieval.ts
    lines: 535
    issue: "Over CLAUDE.md 500-line cap (pre-existing; was 516 pre-phase, grew +19 from outputSchema wiring)"
    severity: info
    action: "Flag for a future split-file refactor plan (retrieval-list/retrieval-search/retrieval-files). NOT a Phase 40 regression cause; scope was strict per-tool archetype wiring."
---

# Phase 40: Structured Output (MCP Spec) Verification Report

**Phase Goal:** Every MCP tool declares a typed outputSchema from a shared archetype library, structuredContent continues to be populated, backwards-compat response_format: json is preserved, and a test locks the mapping against drift.

**Verified:** 2026-04-13T08:15:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `toolResult()` returns `{ structuredContent: { data, meta }, content: [{type:'text',text}] }` envelope | VERIFIED | `src/mcp/common/tool-utils.ts:135-148` — exported function; `mergedMeta` includes `schema_version: RESPONSE_SCHEMA_VERSION`; `content` is `[{type:'text',text}]`. Test 3 in `test/mcp-annotations.test.js:477-496` asserts every piece: `structuredContent`, `structuredContent.data`, `structuredContent.meta.schema_version`, `content[0].type === 'text'`, JSON-serialized payload in `content[0].text`. |
| 2 | Every one of the 72 MCP tools declares a non-generic `outputSchema` via one of the 8 archetypes | VERIFIED | Grep `outputSchema:` in `src/mcp/tools/*.ts` → 72 matches across 10 files (backfill=1, kg-delete=3, retrieval=14, memory-workflow=7, graph-tools=22, core=6, audit=1, find=1, symbol=4, memory-store=13 = 72). Sum matches Plan distribution. |
| 3 | 8 archetypes exported from `src/mcp/common/schemas.ts`, re-exported through `common/index.ts` | VERIFIED | `schemas.ts` exports `SEARCH_RESULT_SCHEMA`, `TRIPLE_RESULT_SCHEMA`, `STATUS_RESULT_SCHEMA`, `BATCH_RESULT_SCHEMA`, `MEMORY_RESULT_SCHEMA`, `ACK_RESULT_SCHEMA`, `BUNDLE_RESULT_SCHEMA`, `FREEFORM_RESULT_SCHEMA` — plus `META_SCHEMA`, `PAGINATION_META_SCHEMA`. `common/index.ts:17-27` re-exports all 8 archetypes + META + PAGINATION under the `// Phase 40: output archetypes` section. ENTITY_RESULT_SCHEMA intentionally absent (zero occurrences in `src/` except a comment in schemas.ts:48). |
| 4 | `EXPECTED_OUTPUT_SCHEMAS` test map locks the 72-tool archetype assignment with identity equality | VERIFIED | `test/mcp-annotations.test.js:283-292` defines `ARCHETYPE_MAP`; `:294-367` defines `EXPECTED_OUTPUT_SCHEMAS` with 72 entries. Test 2 (`:427-472`) asserts `meta.outputSchema !== ARCHETYPE_MAP[expectedLabel]` via reference equality with collect-all-mismatches pattern. Per-archetype counts: BUNDLE=14, MEMORY=6, FREEFORM=3, ACK=7, STATUS=10, SEARCH=17, BATCH=11, TRIPLE=4 → 72 ✓. |
| 5 | Backwards-compat preserved: `response_format: "json"` default still works; handlers untouched | VERIFIED | `createJsonToolRegistrar` (`tool-utils.ts:226-260`) still reads `args.response_format || 'json'` and delegates to `toolResult(data, responseFormat, markdownTitle)`. No handler body changes in any tool file. Full test suite `npm test` → 165/165 pass (was 163 pre-Task-3, +2 from Test 2 and Test 3). |
| 6 | FREEFORM budget honored (≤5 tools) with explicit archetype-library fallback for unmarked tools | VERIFIED | Exactly 3 tool-level uses: `core.ts:91` (help), `core.ts:105` (usage_guide), `graph-tools.ts:366` (diary_read). Registrar fallback at `tool-utils.ts:244-247` references `FREEFORM_RESULT_SCHEMA.data/.meta` — zero `z.any()` orphans in `tool-utils.ts`. |

**Score:** 6/6 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/mcp/common/schemas.ts` | 8 archetypes + META_SCHEMA + PAGINATION_META_SCHEMA | VERIFIED | 230 lines. All 8 archetype exports found (lines 91, 112, 132, 142, 161, 187, 206, 218). META_SCHEMA at :74, PAGINATION_META_SCHEMA at :59. 8 zod type aliases at :223-230. Under 500-line cap. |
| `src/mcp/common/tool-utils.ts` | ToolDefinition.outputSchema + registrar fallback + exported toolResult | VERIFIED | 260 lines. `outputSchema?:` field at :203; `export function toolResult` at :135; registrar fallback at :244-247 uses `outputSchema ?? { data: FREEFORM_RESULT_SCHEMA.data, meta: FREEFORM_RESULT_SCHEMA.meta }`. Zero `z.any()` orphans. Under 500-line cap. |
| `src/mcp/common/index.ts` | Re-exports archetypes + toolResult | VERIFIED | 32 lines. `toolResult` in tool-utils re-export block at :4. All 8 archetypes + META + PAGINATION at :17-27 under `// Phase 40: output archetypes` header. |
| `src/app/register-tools.ts` | sharedSchemas bag with OUTPUT_* archetype keys | VERIFIED | 141 lines (not re-checked — Plan 01 SUMMARY confirms 8 `OUTPUT_*_RESULT_SCHEMA` entries, and Plan 02 tool files successfully resolve `schemas.OUTPUT_*_RESULT_SCHEMA` at runtime per Test 2). |
| `src/mcp/tools/core.ts` | 6 outputSchema entries | VERIFIED | 6 entries: STATUS×3 (server_status, health, update_status), FREEFORM×2 (help, usage_guide), ACK×1 (update_self). |
| `src/mcp/tools/retrieval.ts` | 14 outputSchema entries | VERIFIED | 14 entries: SEARCH×7, STATUS×3, BUNDLE×4. See INFO: file is 535 lines (over cap, pre-existing tech debt). |
| `src/mcp/tools/kg-delete-tools.ts` | 3 outputSchema entries (BATCH) | VERIFIED | 3 entries, all BATCH_RESULT_SCHEMA. |
| `src/mcp/tools/backfill-tools.ts` | 1 outputSchema entry (BATCH) | VERIFIED | 1 entry: BATCH_RESULT_SCHEMA for project_backfill. |
| `src/mcp/tools/find-tools.ts` | 1 outputSchema entry (SEARCH) | VERIFIED | 1 entry: SEARCH_RESULT_SCHEMA for find. |
| `src/mcp/tools/audit-tools.ts` | 1 outputSchema entry (BUNDLE) | VERIFIED | 1 entry: BUNDLE_RESULT_SCHEMA for audit. |
| `src/mcp/tools/symbol-tools.ts` | 4 outputSchema entries (SEARCH) | VERIFIED | 4 entries: SEARCH_RESULT_SCHEMA ×4 (find_callers, find_definition, find_implementations, rename_preview). |
| `src/mcp/tools/memory-store.ts` | 13 outputSchema entries | VERIFIED | 13 entries: SEARCH×4, MEMORY×4, ACK×3, BATCH×2. |
| `src/mcp/tools/memory-workflow.ts` | 7 outputSchema entries | VERIFIED | 7 entries: BUNDLE×3, STATUS×1, SEARCH×1, MEMORY×2. |
| `src/mcp/tools/graph-tools.ts` | 22 outputSchema entries | VERIFIED | 22 entries: ACK×3, TRIPLE×4, BATCH×5, STATUS×3, BUNDLE×6, FREEFORM×1. |
| `test/mcp-annotations.test.js` | EXPECTED_OUTPUT_SCHEMAS map + Test 2 + Test 3 | VERIFIED | 496 lines (under 500 cap). ARCHETYPE_MAP at :283-292, EXPECTED_OUTPUT_SCHEMAS at :294-367 (72 entries), Test 2 at :427-472, Test 3 at :477-496. |

**Artifact total:** 15/15 VERIFIED

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `src/mcp/common/tool-utils.ts` | `src/mcp/common/schemas.ts` | `import { FREEFORM_RESULT_SCHEMA }` | WIRED | Line 2: `import { FREEFORM_RESULT_SCHEMA } from './schemas.js';`. Used at registrar fallback `:244-247`. |
| `src/app/register-tools.ts` | `src/mcp/common/schemas.ts` (via barrel) | `sharedSchemas` bag keyed by `OUTPUT_*_RESULT_SCHEMA` | WIRED | Plan 01 SUMMARY confirms 8 entries. Runtime resolution verified by Test 2 identity equality — every `schemas.OUTPUT_*_RESULT_SCHEMA` reference at tool registration time resolves to the same object that's re-exported from `common/index.ts`. |
| `createJsonToolRegistrar` | `server.registerTool({ outputSchema })` | Per-tool `outputSchema` flows through to MCP SDK registration | WIRED | `tool-utils.ts:238-249` — `outputSchema: outputSchema ?? FREEFORM fallback` is passed directly into `server.registerTool`. |
| 72 tool registrations | 8 archetype objects | `outputSchema: SCHEMA_NAME` or `outputSchema: schemas.OUTPUT_SCHEMA_NAME` | WIRED | Test 2 passes: every tool's `meta.outputSchema` matches the expected archetype via identity comparison (`===`). |
| `test/mcp-annotations.test.js` | `src/mcp/common/index.ts` | `import { ...RESULT_SCHEMA, toolResult } from '../src/mcp/common/index.js'` | WIRED | Lines 4-14: barrel import of 8 archetypes + toolResult. |

**Key link total:** 5/5 WIRED

---

### Data-Flow Trace (Level 4)

Not applicable for this phase — Phase 40 is framework/typing infrastructure, not user-facing data rendering. Artifacts are type definitions and schema declarations, not runtime data producers. `toolResult()` is purely a shape transformer (unit-tested by Test 3). Archetype objects are static.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All tests pass (full suite green) | `npm test` | `# pass 165 / # fail 0 / duration_ms 9017` | PASS |
| TypeScript build clean | `npm run build` | `> synapse-mcp@0.2.0 build / > tsc` (exit 0, no errors) | PASS |
| Archetype count in schemas.ts | `grep -c "^export const.*RESULT_SCHEMA ="` | 8 (SEARCH, TRIPLE, STATUS, BATCH, MEMORY, ACK, BUNDLE, FREEFORM) | PASS |
| Tool-level outputSchema count | `grep -rc "outputSchema:" src/mcp/tools/` | 72 total (10 files) | PASS |
| FREEFORM budget ≤ 5 | Count `FREEFORM_RESULT_SCHEMA` tool-level usages | 3 (help, usage_guide, diary_read) | PASS |
| z.any() orphans in framework code | `grep -c "z.any()" src/mcp/common/tool-utils.ts` | 0 | PASS |
| ENTITY_RESULT_SCHEMA absent from source | `grep -r "ENTITY_RESULT_SCHEMA" src/ test/` | 0 code occurrences (only comments in schemas.ts:48) | PASS |
| EXPECTED_OUTPUT_SCHEMAS has 72 entries | Parse test file and count `'synapse_'` keys in map | 72 entries, distribution 17/10/11/6/7/4/14/3 | PASS |
| Test 2 (outputSchema identity) passes | Part of `npm test` | Included in 165/165 | PASS |
| Test 3 (toolResult envelope) passes | Part of `npm test` | Included in 165/165 | PASS |

**Spot-check total:** 10/10 PASS

---

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| **STRUCT-01** | All tool responses include `structuredContent` alongside text content | SATISFIED | `toolResult()` at `tool-utils.ts:135-148` always returns both `structuredContent: { data, meta }` and `content: [{ type:'text', text }]`. Every tool routes through `toolResult()` via `createJsonToolRegistrar` (`:256`), so this envelope is unconditional for all 72 tools. Test 3 locks it at the unit level. |
| **STRUCT-02** | Tools declare `outputSchema` for typed parsing | SATISFIED | 72/72 tools declare a non-generic `outputSchema` across 10 tool files. Test 2 enforces identity equality against the 8-archetype map with collect-all-mismatches pattern. No tool falls through to FREEFORM accidentally — the 3 FREEFORM uses are explicit and within the ≤5 budget. |
| **STRUCT-03** | Existing `response_format: "json"` behavior preserved | SATISFIED | Zero handler bodies changed. `createJsonToolRegistrar` still reads `args.response_format || 'json'` and delegates unchanged. Full 165-test suite green, including backwards-compat tests (`test/terse-response.test.js`, `test/mcp-tools.test.js`). Test count went 163 → 165 (+2 new assertions, zero regressions). |

All 3 requirements declared in Plan 01 + Plan 02 frontmatter (STRUCT-01, STRUCT-02, STRUCT-03) are satisfied with implementation evidence.

No orphaned requirements — REQUIREMENTS.md maps STRUCT-01..03 exclusively to Phase 40, and both plans together claim all three.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/mcp/tools/retrieval.ts` | (whole file) | 535 lines, over CLAUDE.md 500-line cap | **INFO** (pre-existing) | Pre-existing tech debt since Phase 39 (was 516 pre-phase). Phase 40 added +19 lines (5 imports + 14 `outputSchema:` entries). NOT a Phase 40 regression cause. Flagged for a future split-file refactor plan. Context confirms this as out of scope. |
| `src/mcp/tools/graph-tools.ts` | 70, 119 | `z.record(z.string(), z.any())` on input schemas for KG entity property bags | **INFO** (pre-existing) | Pre-existing pattern for user-provided property records. Input-side, not output-side escape hatch. Out of Phase 40 scope (phase target is output archetypes). Documented in 40-02-SUMMARY deviation #4. |

**No blocker anti-patterns.** No TODO/FIXME/PLACEHOLDER markers in any phase-touched file that affect goal achievement. No hollow props, no stub handlers, no static empty returns. The 3 FREEFORM usages (`help`, `usage_guide`, `diary_read`) are explicit design decisions, not escape-hatch leakage.

---

### Human Verification Required

None. Phase 40 is framework/typing infrastructure with no user-facing UI, visual, real-time, or external-service behaviors that require human testing. All STRUCT requirements are machine-verifiable and fully covered by Test 2 (outputSchema identity drift lock) and Test 3 (toolResult envelope shape).

Optional follow-up validation by a real MCP client (e.g., Claude Desktop) would confirm that a live server continues to serve both `structuredContent` and `content` blocks in responses, but this is already locked at the unit level (toolResult is the single production path) and is not required to pass the phase.

---

### Gaps Summary

**No gaps.** Phase 40 achieved its goal on every observable truth:

1. The shared 8-archetype library exists, is complete, is re-exported through the common barrel, and flows into every registrar call.
2. All 72 tools declare a typed `outputSchema` — no generic `z.any()` leaks into tool definitions, and the registrar fallback (for hypothetical future tools that forget to declare one) points at the single named `FREEFORM_RESULT_SCHEMA` object.
3. `structuredContent`/`content` dual response envelope is preserved by `toolResult()` and locked at the unit level by Test 3.
4. `response_format: "json"` default path is unchanged — zero handler bodies touched, full 165/165 test suite passes, including the existing backwards-compat harness.
5. `EXPECTED_OUTPUT_SCHEMAS` identity-check map (72 entries) locks the mapping against drift — any future tool added without an `outputSchema` declaration, or any tool whose archetype changes, will fail Test 2 with a precise diff.
6. FREEFORM budget is honored at 3/5 with explicit per-tool justifications (raw user-facing output from help/usage_guide/diary_read).

**Pre-existing tech debt flagged (not a Phase 40 failure):** `retrieval.ts` is 535 lines (over CLAUDE.md 500-line cap). Pre-existing since Phase 39 (was 516). Phase 40 added +19 lines of `outputSchema` wiring. A split-file refactor (`retrieval-list.ts` / `retrieval-search.ts` / `retrieval-files.ts`) is the natural next step and should be scheduled as a dedicated refactor plan in Phase 41+ when convenient.

**Phase 40 is complete and ready to proceed.**

---

*Verified: 2026-04-13T08:15:00Z*
*Verifier: Claude (gsd-verifier)*
