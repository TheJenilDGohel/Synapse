---
phase: 40-structured-output-mcp-spec
plan: 01
subsystem: mcp
tags: [zod, mcp-spec, output-schema, archetype-library, structured-content]

# Dependency graph
requires:
  - phase: 39-tool-annotations-mcp-spec
    provides: "ToolDefinition.annotations plumbing and mcp-annotations test harness pattern that Plan 02 will extend for outputSchema assertions"
provides:
  - "8 shared output archetype schemas in src/mcp/common/schemas.ts"
  - "META_SCHEMA + PAGINATION_META_SCHEMA with passthrough semantics matching toolResult() meta-merge"
  - "Extended ToolDefinition interface with optional outputSchema field"
  - "createJsonToolRegistrar() that honors per-tool outputSchema via ?? fallback to FREEFORM_RESULT_SCHEMA"
  - "Exported toolResult() public API for Plan 02 unit testing"
  - "sharedSchemas bag in register-tools.ts populated with 8 OUTPUT_*_RESULT_SCHEMA keys"
affects:
  - 40-02  # per-tool outputSchema wiring + EXPECTED_OUTPUT_SCHEMAS assertions
  - 42     # bi-temporal KG (may add ENTITY_RESULT_SCHEMA if a real need emerges)
  - 45     # actor-aware memories (same candidate for ENTITY_RESULT_SCHEMA)

# Tech tracking
tech-stack:
  added: []  # no new runtime deps — zod already in use
  patterns:
    - "Output archetype library co-located with input schemas in common/schemas.ts"
    - "FREEFORM_RESULT_SCHEMA as the single named escape hatch — no orphan z.any() blocks in framework code"
    - "Archetype object shape: { data: ZodTypeAny, meta: META_SCHEMA } with `as const` markers for identity comparison in tests"
    - "META_SCHEMA uses .passthrough() so normalizer-emitted meta keys survive toolResult() merge without strict-mode rejection"

key-files:
  created: []
  modified:
    - src/mcp/common/schemas.ts
    - src/mcp/common/tool-utils.ts
    - src/mcp/common/index.ts
    - src/app/register-tools.ts

key-decisions:
  - "ENTITY_RESULT_SCHEMA intentionally dropped: Plan 02 audit found zero consumers; CONTEXT.md 'smallest set without losing useful typing' rule authoritative"
  - "BUNDLE_RESULT_SCHEMA added as typed-object escape hatch instead of bloating FREEFORM, keeps FREEFORM budget <=5 tools"
  - "toolResult() exported from tool-utils.ts with single-token `export` change so Plan 02 Task 3 can import from the public barrel without reaching back into framework territory"
  - "Registrar fallback references FREEFORM_RESULT_SCHEMA.data/meta instead of re-inlining z.any() so the whole codebase has exactly one named escape-hatch object"

patterns-established:
  - "Output archetypes follow *_RESULT_SCHEMA naming for grep alignment with existing input schemas"
  - "ToolDefinition.outputSchema is optional; absence means the tool opts into FREEFORM via registrar fallback — no breaking changes for existing tools"
  - "sharedSchemas bag is the single propagation channel for archetypes into tool files (OUTPUT_*_RESULT_SCHEMA keys)"

requirements-completed:
  - STRUCT-02
  - STRUCT-03

# Metrics
duration: 5m
completed: 2026-04-13
---

# Phase 40 Plan 01: Archetype Library + Registrar Extension Summary

**8-archetype zod output library wired through the common barrel, with optional outputSchema on ToolDefinition and toolResult() exported for Plan 02 unit tests — zero runtime behavior change, 163/163 tests still green.**

## Performance

- **Duration:** 5m (260s elapsed wall-clock from first edit to final commit)
- **Started:** 2026-04-13T07:28:38Z
- **Completed:** 2026-04-13T07:32:58Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Shipped 8-archetype output library in `src/mcp/common/schemas.ts`: SEARCH, TRIPLE, STATUS, BATCH, MEMORY, ACK, BUNDLE, FREEFORM — plus META_SCHEMA + PAGINATION_META_SCHEMA + 8 zod-inferred type aliases.
- Extended `ToolDefinition` interface with optional `outputSchema` and rewired `createJsonToolRegistrar()` to honor it via `??` fallback to `FREEFORM_RESULT_SCHEMA` — eliminated the inlined `z.any()` hardcode at the old line 241.
- Exported `toolResult()` as public API (single-token diff) and re-exported it through `src/mcp/common/index.ts` so Plan 02 Task 3's unit test can import from its public home.
- Wired all 8 archetypes into the `sharedSchemas` bag in `src/app/register-tools.ts` under `OUTPUT_*_RESULT_SCHEMA` keys so Plan 02 per-tool wiring can reference them via the `schemas` prop already passed into every `registerXxxTools(...)` call.
- Full 163-test baseline still green — no tool opted into an archetype yet, so every registered tool continues to use the FREEFORM fallback (runtime-equivalent to the pre-plan hardcoded `{ data: z.any(), meta: z.any().optional() }`).
- Zero files touched under `src/mcp/tools/` — Plan 02's exclusive territory preserved.

## Task Commits

1. **Task 1: Add 8 output archetypes + META_SCHEMA to schemas.ts** — `12f4873` (feat)
2. **Task 2: Extend ToolDefinition, honor per-tool outputSchema, export toolResult()** — `91e6b27` (feat)
3. **Task 3: Re-export archetypes + toolResult through common/index.ts, wire sharedSchemas bag** — `de26e1c` (feat)

**Plan metadata:** (see final docs commit)

## Files Created/Modified

- `src/mcp/common/schemas.ts` — +191 lines. Added META_SCHEMA, PAGINATION_META_SCHEMA, 8 archetype exports, 8 type aliases, section header comment. File now 230 lines (was 39).
- `src/mcp/common/tool-utils.ts` — +4 lines. Import of FREEFORM_RESULT_SCHEMA, `outputSchema?:` field on ToolDefinition, registrar destructure + `??` fallback, `export` keyword on `toolResult`, one-line comment. File now 260 lines (was 257).
- `src/mcp/common/index.ts` — +12 lines. Added `toolResult` to tool-utils re-export block, re-exported META_SCHEMA + PAGINATION_META_SCHEMA + 8 archetypes from schemas.js. File now 32 lines (was 20).
- `src/app/register-tools.ts` — +18 lines. Imported 8 archetypes from `../mcp/index.js`, added 8 `OUTPUT_*_RESULT_SCHEMA` entries to the sharedSchemas bag. File now 141 lines (was 123).

### Before/After — tool-utils.ts registerTool outputSchema block

Before (lines 241-244):
```typescript
outputSchema: {
  data: z.any(),
  meta: z.any().optional()
},
```

After (lines 244-247):
```typescript
outputSchema: outputSchema ?? {
  data: FREEFORM_RESULT_SCHEMA.data,
  meta: FREEFORM_RESULT_SCHEMA.meta
},
```

### Before/After — tool-utils.ts toolResult declaration

Before (line 133):
```typescript
function toolResult(result: unknown, responseFormat: string = 'json', markdownTitle: string = 'Result'): ToolResult {
```

After (lines 134-135):
```typescript
// Exported for unit testing — see Phase 40 Plan 02 Task 3 (STRUCT-01).
export function toolResult(result: unknown, responseFormat: string = 'json', markdownTitle: string = 'Result'): ToolResult {
```

### common/index.ts re-export diff (high level)

- `tool-utils.js` block: added `toolResult,` (new entry between `createToolResponse` and `paginateItems`)
- `schemas.js` block: added `META_SCHEMA`, `PAGINATION_META_SCHEMA`, `SEARCH_RESULT_SCHEMA`, `TRIPLE_RESULT_SCHEMA`, `STATUS_RESULT_SCHEMA`, `BATCH_RESULT_SCHEMA`, `MEMORY_RESULT_SCHEMA`, `ACK_RESULT_SCHEMA`, `BUNDLE_RESULT_SCHEMA`, `FREEFORM_RESULT_SCHEMA` under a `// Phase 40: output archetypes` section comment.

### register-tools.ts sharedSchemas bag diff (high level)

Added after `MEMORY_EVENT_STATUS_SCHEMA,` with a `// Phase 40: output archetypes (consumed by Plan 02 per-tool assignments)` section header comment:
- `OUTPUT_SEARCH_RESULT_SCHEMA: SEARCH_RESULT_SCHEMA`
- `OUTPUT_TRIPLE_RESULT_SCHEMA: TRIPLE_RESULT_SCHEMA`
- `OUTPUT_STATUS_RESULT_SCHEMA: STATUS_RESULT_SCHEMA`
- `OUTPUT_BATCH_RESULT_SCHEMA: BATCH_RESULT_SCHEMA`
- `OUTPUT_MEMORY_RESULT_SCHEMA: MEMORY_RESULT_SCHEMA`
- `OUTPUT_ACK_RESULT_SCHEMA: ACK_RESULT_SCHEMA`
- `OUTPUT_BUNDLE_RESULT_SCHEMA: BUNDLE_RESULT_SCHEMA`
- `OUTPUT_FREEFORM_RESULT_SCHEMA: FREEFORM_RESULT_SCHEMA`

## Decisions Made

- **ENTITY_RESULT_SCHEMA intentionally NOT shipped.** The plan's `<archetype_specification>` revision note already documented this; executor confirmed the exclusion throughout (zero occurrences in all 4 modified files).
- **FREEFORM_RESULT_SCHEMA is the single named escape hatch.** The registrar fallback at the new line 244 points at `FREEFORM_RESULT_SCHEMA.data/.meta` rather than re-inlining `z.any()`, so there are exactly zero orphan `z.any()` blocks in `tool-utils.ts` — ideal per the acceptance criteria (`at most 1, zero preferred`).
- **META_SCHEMA uses `.passthrough()`.** This preserves normalizer-emitted keys that `toolResult()` merges on top of `{ schema_version }` at tool-utils.ts:136-139, without requiring strict-mode validation rewrites.
- **toolResult() is exported via a single-token diff.** Framework ownership stays inside Plan 01 — the export keyword alone gives Plan 02's unit test a clean public import path, zero runtime impact.

## Deviations from Plan

None — plan executed exactly as written.

The registrar fallback uses `FREEFORM_RESULT_SCHEMA.data` / `FREEFORM_RESULT_SCHEMA.meta` verbatim as the plan specified. The acceptance criterion "`grep -c 'z.any()' src/mcp/common/tool-utils.ts` returns at most 1 (zero preferred)" came out at exactly zero — the ideal outcome.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Plan 02 can start immediately. Every prerequisite for per-tool archetype wiring is in place:

- **Archetype availability:** All 8 archetypes plus META_SCHEMA and PAGINATION_META_SCHEMA are exported from `src/mcp/common/schemas.ts` and re-exported through `src/mcp/common/index.ts` → `src/mcp/index.ts` (wildcard passthrough) → consumers.
- **sharedSchemas bag:** Already contains `OUTPUT_*_RESULT_SCHEMA` keys for all 8 archetypes. Plan 02's tool files can reach each archetype via `schemas.OUTPUT_SEARCH_RESULT_SCHEMA` etc. without adding a single new import line to `register-tools.ts`.
- **ToolDefinition plumbing:** `createJsonToolRegistrar` honors per-tool `outputSchema` via `??` fallback to FREEFORM. Adding `outputSchema: schemas.OUTPUT_X_RESULT_SCHEMA` to any `registerJsonTool(...)` call in a tool file will now flow end-to-end into `server.registerTool(...)`.
- **Unit test hook:** `toolResult()` is exported from `tool-utils.ts` and re-exported through `common/index.ts`, so Plan 02 Task 3's STRUCT-01 unit test can `import { toolResult } from '../../src/mcp/common/index.js'` (or equivalent) cleanly.
- **Backwards compat:** Every existing `registerJsonTool(...)` call is untouched and every tool still resolves to FREEFORM via the fallback. The 163-test baseline is green. Plan 02 can migrate tools in any order without breaking non-migrated tools.
- **Test harness reference:** Phase 39's `test/mcp-annotations.test.js` fake-services harness pattern is ready for Plan 02 to extend with a parallel `EXPECTED_OUTPUT_SCHEMAS` map (per CONTEXT.md guidance — keep it separate from `EXPECTED_ANNOTATIONS`).

### Notes for Plan 02's executor

- **Do NOT add ENTITY_RESULT_SCHEMA back** — it was dropped per revision and the acceptance criteria enforce zero occurrences across all touched files. If a tool genuinely needs entity typing, route it through TRIPLE (for relationship shapes) or BUNDLE (for object shapes with arbitrary keys).
- **FREEFORM budget is <=5 tools.** If your per-tool audit finds more than 5 tools that want FREEFORM, split them into a new archetype instead of expanding FREEFORM. Candidates in the plan: `usage_guide`, `help`, `diary_read` (3 so far — 2 slots left).
- **BUNDLE is the default for object-shaped responses with arbitrary keys.** Per CONTEXT.md's "typed-enough for clients to know it's an object, not a list" rule, most task_context / agent_prime / whats_new / nest_* / project_tree / read_file / audit tools should use BUNDLE rather than FREEFORM.
- **`sharedSchemas` is keyed by `OUTPUT_*_RESULT_SCHEMA`** (with the `OUTPUT_` prefix) — this distinguishes output archetypes from input schemas in the same bag. Reference them via `schemas.OUTPUT_SEARCH_RESULT_SCHEMA` etc., not `schemas.SEARCH_RESULT_SCHEMA`.
- **Registrar uses identity comparison-friendly objects.** Every archetype is declared with `as const` and re-exported without cloning, so Plan 02's test can assert `meta.outputSchema === SEARCH_RESULT_SCHEMA` via reference equality. Do NOT spread archetypes into new objects at the tool-registration site — that breaks identity comparison.
- **META_SCHEMA is `.passthrough()`.** If Plan 02's assertions want to match `meta.schema_version === '1.0'` and still allow extra keys, use `META_SCHEMA.safeParse(meta).success === true` rather than strict key equality.
- **Test count baseline: 163 tests.** Plan 02 must land with the count unchanged OR grow it explicitly (Phase 39's 2 new annotation tests already landed, so the baseline going INTO Plan 02 is 163, same as what Plan 01 preserved).

## Self-Check

**1. Files on disk:**
- FOUND: src/mcp/common/schemas.ts (230 lines)
- FOUND: src/mcp/common/tool-utils.ts (260 lines)
- FOUND: src/mcp/common/index.ts (32 lines)
- FOUND: src/app/register-tools.ts (141 lines)

**2. Task commits present:**
- FOUND: 12f4873 (Task 1: schemas.ts archetypes)
- FOUND: 91e6b27 (Task 2: tool-utils.ts ToolDefinition + toolResult export)
- FOUND: de26e1c (Task 3: common/index.ts + register-tools.ts)

**3. Acceptance criteria:**
- 8 *_RESULT_SCHEMA exports in schemas.ts — FOUND (SEARCH, TRIPLE, STATUS, BATCH, MEMORY, ACK, BUNDLE, FREEFORM)
- META_SCHEMA + PAGINATION_META_SCHEMA in schemas.ts — FOUND
- ENTITY_RESULT_SCHEMA absent in all touched files — CONFIRMED (zero occurrences)
- `outputSchema?:` field on ToolDefinition — FOUND
- `export function toolResult` in tool-utils.ts — FOUND
- `outputSchema ??` nullish fallback in registrar — FOUND
- Zero `z.any()` orphans in tool-utils.ts — CONFIRMED (ideal outcome, criterion was "at most 1")
- 8 `OUTPUT_*_RESULT_SCHEMA:` entries in register-tools.ts sharedSchemas bag — FOUND
- `toolResult` in common/index.ts re-export block — FOUND
- All files under 500 lines — CONFIRMED (schemas 230, tool-utils 260, index 32, register-tools 141)
- `src/mcp/tools/` untouched — CONFIRMED (`git diff --stat` empty for that directory)
- `npx tsc --noEmit` exits 0 — CONFIRMED (clean compile after each task)
- `npm test` exits 0 with 163/163 passes — CONFIRMED (run after Task 2 and Task 3)

## Self-Check: PASSED

---
*Phase: 40-structured-output-mcp-spec*
*Completed: 2026-04-13*
