---
phase: 39-tool-annotations-mcp-spec
plan: 01
subsystem: mcp/tools
tags: [mcp, annotations, spec-compliance, refactor]
requires:
  - ANNOT-01
  - ANNOT-02
provides:
  - READ_ONLY_ANNOTATIONS constant
  - WRITE_ANNOTATIONS constant
  - IDEMPOTENT_WRITE_ANNOTATIONS constant
  - DESTRUCTIVE_ANNOTATIONS constant
  - Single source of truth for 70 of 72 MCP tool annotations
affects:
  - src/mcp/common/tool-utils.ts
  - src/mcp/tools/*.ts (10 files)
tech-stack:
  added: []
  patterns:
    - Shared annotation constants lifted to common/tool-utils.ts
    - Documented inline exceptions for tools needing openWorldHint:true
key-files:
  created: []
  modified:
    - src/mcp/common/tool-utils.ts
    - src/mcp/tools/retrieval.ts
    - src/mcp/tools/core.ts
    - src/mcp/tools/memory-workflow.ts
    - src/mcp/tools/memory-store.ts
    - src/mcp/tools/graph-tools.ts
    - src/mcp/tools/kg-delete-tools.ts
    - src/mcp/tools/backfill-tools.ts
    - src/mcp/tools/find-tools.ts
    - src/mcp/tools/audit-tools.ts
    - src/mcp/tools/symbol-tools.ts
decisions:
  - DELETE_ANNOTATIONS renamed to DESTRUCTIVE_ANNOTATIONS (covers update_self and memory_remove_relation, not just deletes)
  - Added IDEMPOTENT_WRITE_ANNOTATIONS as 4th bucket for dedup-upsert writes
  - update_status and update_self both kept inline due to openWorldHint:true (incompatible with any shared constant that sets openWorldHint:false)
  - kg_add_triple (single) stays non-idempotent; kg_add_triples_batch is idempotent (asymmetry justified by source code dedup paths)
metrics:
  duration_seconds: 960
  duration_human: 16m
  tasks: 3
  files_modified: 11
  net_line_delta: -237
  completed_date: 2026-04-13
---

# Phase 39 Plan 01: Shared MCP Tool Annotation Constants + 9 Mismatch Fixes Summary

One-liner: Lifted MCP 2025-06-18 tool annotation categorization into 4 shared constants, fixed 9 real mismatches, and migrated 70 of 72 tool registrations to reference the shared constants (2 documented inline exceptions for openWorldHint:true tools).

## What Changed

### Task 1 — Add shared annotation constants (commit fb25659)

Added four exported constants to `src/mcp/common/tool-utils.ts`:

| Constant | Value | Purpose |
| --- | --- | --- |
| `READ_ONLY_ANNOTATIONS` | `{ readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }` | Pure read tools (search, get, list, status, query, timeline, tree, ...) |
| `WRITE_ANNOTATIONS` | `{ readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }` | Additive non-idempotent writes (memory_store, diary_write, capture_outcome, teach, kg_add_triple single, index_project) |
| `IDEMPOTENT_WRITE_ANNOTATIONS` | `{ readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }` | Dedup-upsert writes (kg_add_entity, kg_add_triples_batch, ingest_*, kg_invalidate, kg_backfill_links, project_backfill, memory_add_relation) |
| `DESTRUCTIVE_ANNOTATIONS` | `{ readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }` | All *_delete* tools + memory_remove_relation |

Includes a multi-paragraph docblock explaining the `DELETE_ANNOTATIONS → DESTRUCTIVE_ANNOTATIONS` rename and the new `IDEMPOTENT_WRITE_ANNOTATIONS` fourth bucket as Claude's Discretion drift from 39-CONTEXT.md.

### Task 2 — Fix 9 annotation mismatches inline (commit 576321c)

| # | Tool | File | Before | After |
| - | --- | --- | --- | --- |
| 1 | `synapse_search_hybrid` | retrieval.ts:402-407 | `readOnlyHint: false, idempotentHint: false` | `readOnlyHint: true, idempotentHint: true` |
| 2 | `synapse_update_self` | core.ts:152-157 | `destructiveHint: false, idempotentHint: false` | `destructiveHint: true, idempotentHint: true` |
| 3 | `synapse_task_context` | memory-workflow.ts:77-82 | `idempotentHint: false` | `idempotentHint: true` |
| 4 | `synapse_memory_recall` | memory-workflow.ts:119-124 | `idempotentHint: false` | `idempotentHint: true` |
| 5 | `synapse_agent_prime` | memory-workflow.ts:196-201 | `idempotentHint: false` | `idempotentHint: true` |
| 6 | `synapse_whats_new` | memory-workflow.ts:219-224 | `idempotentHint: false` | `idempotentHint: true` |
| 7 | `synapse_kg_add_triples_batch` | graph-tools.ts:141 | `idempotentHint: false` | `idempotentHint: true` |

`update_self` fixed in 2 fields (destructiveHint + idempotentHint), so 6 tools × fixes = 9 total field changes across 4 files.

`openWorldHint: true` preserved on update_self (hits npm registry).

Explicitly left untouched:
- `synapse_kg_add_triple` (single, non-batch) — source at `src/services/memory/knowledge-graph/kg.ts:220-224` runs unconditional `INSERT INTO kg_triples ... VALUES (${fresh_uuid}, ...)` with no dedup guard. Genuinely non-idempotent. Stays `idempotentHint: false`. Asymmetry with `_batch` variant is intentional and verified.
- `synapse_memory_remove_relation` stays `destructiveHint: true` (Open Question 3 resolved in favor of destructive per 39-RESEARCH.md/39-CONTEXT.md).
- `synapse_embed_status` stays `readOnlyHint: true` (source confirms pure read — Open Question 1 resolved).

### Task 3 — Migrate all tool registrations to shared constants (commit 3eecd1d)

Migrated 70 of 72 tool registrations across 10 files to reference one of the four shared constants:

| File | RO | WR | IW | DS | Inline | Total |
| --- | -: | -: | -: | -: | -: | -: |
| core.ts | 4 | 0 | 0 | 0 | **2** | 6 |
| retrieval.ts | 13 | 1 | 0 | 0 | 0 | 14 |
| memory-workflow.ts | 5 | 2 | 0 | 0 | 0 | 7 |
| memory-store.ts | 5 | 4 | 1 | 3 | 0 | 13 |
| graph-tools.ts | 13 | 2 | 7 | 0 | 0 | 22 |
| kg-delete-tools.ts | 0 | 0 | 0 | 3 | 0 | 3 |
| backfill-tools.ts | 0 | 0 | 1 | 0 | 0 | 1 |
| find-tools.ts | 1 | 0 | 0 | 0 | 0 | 1 |
| audit-tools.ts | 1 | 0 | 0 | 0 | 0 | 1 |
| symbol-tools.ts | 4 | 0 | 0 | 0 | 0 | 4 |
| **Total** | **46** | **9** | **9** | **6** | **2** | **72** |

All 10 tool-registration files now import at least one shared constant from `../common/tool-utils.js`.

Private `readOnlyAnnotations` helper in `graph-tools.ts` (line 42) was removed and its 5 usages replaced with the imported `READ_ONLY_ANNOTATIONS`.

### Inline exceptions (2 total, both in core.ts)

Documented with explanatory comments immediately above each inline block:

1. **`synapse_update_self`** — destructive AND `openWorldHint: true` (hits npm registry). `DESTRUCTIVE_ANNOTATIONS` sets `openWorldHint: false`, so incompatible.
2. **`synapse_update_status`** — read-only AND `openWorldHint: true` (queries npm registry). `READ_ONLY_ANNOTATIONS` sets `openWorldHint: false`, so incompatible.

The plan only called out `update_self` as an exception, but the static audit in 39-RESEARCH.md line 657 explicitly notes `update_status` also has `openWorldHint: true` and should stay inline. This is Rule-3 scope-bound follow-through: without this second exception, the file would not typecheck (constants are `as const` frozen and cannot be spread-modified) — treating it as a deviation here with full transparency.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Added `update_status` as a second inline exception in core.ts**
- **Found during:** Task 3 (after migrating core.ts RO tools)
- **Issue:** Plan listed only `update_self` as an inline exception, but `update_status` also has `openWorldHint: true` (documented in 39-RESEARCH.md:657 but not surfaced in plan 39-01 Step 3). Using `READ_ONLY_ANNOTATIONS` for `update_status` would have silently flipped its `openWorldHint` from `true` to `false`, breaking the npm-registry semantic.
- **Fix:** Left `update_status` with an inline annotation block and added an explanatory comment (symmetric to `update_self`).
- **Files modified:** `src/mcp/tools/core.ts`
- **Commit:** 3eecd1d

**2. [Plan correction] IW count is 9 not ≥10**
- **Found during:** Task 3 verification
- **Issue:** Plan acceptance criterion said `IDEMPOTENT_WRITE_ANNOTATIONS` total should be ≥ 10 and listed 9 tools: `ingest_markdown, ingest_json, kg_add_entity, kg_add_entities_batch, kg_add_triples_batch, kg_invalidate, kg_backfill_links, project_backfill, memory_add_relation`.
- **Actual:** The list has 9 items. Final count is exactly 9, which matches the research. The ≥10 criterion was a simple miscount in the plan (the prose and the list agree on 9).
- **Fix:** None needed — the categorization is correct. Documenting here as a transparent acceptance-criterion drift.
- **Impact:** None — no tool is miscategorized.

### Out-of-Scope Deferred Issues

**3. `src/mcp/tools/retrieval.ts` exceeds CLAUDE.md 500-line limit**
- Pre-phase-39 size: 586 lines
- Post-migration size: 516 lines (this plan reduced the file by 70 lines — ~12% improvement)
- Still 16 lines over the 500-line rule.
- Pre-existing issue — not introduced by phase 39.
- Logged to `.planning/phases/39-tool-annotations-mcp-spec/deferred-items.md` with a recommendation to split retrieval.ts into `retrieval-search.ts` and `retrieval-navigation.ts` in a future refactor plan.
- Per scope boundary: not fixed in phase 39 (annotation-only phase).

## Open Questions Resolved

| ID | Resolution |
| --- | --- |
| Open Q1 | `synapse_embed_status` stays `readOnlyHint: true` — source (`vectorIndex.getStatus()` returns immutable index status) confirms pure read. |
| Open Q2 | `synapse_kg_add_triples_batch` becomes `idempotentHint: true` — `kg-batch.ts:198-206` runs `SELECT ... WHERE subject=,predicate=,object_id=,valid_to IS NULL` dedup and returns existing id. |
| Open Q3 | `synapse_memory_remove_relation` stays `destructiveHint: true` — per 39-CONTEXT.md destructive bucket covers "anything that removes persistent state", and removing a relation is a destructive removal of a junction row. |

## Verification Results

```
$ npm run build
> synapse-mcp@0.2.0 build
> tsc
(clean)

$ npm test
# tests 162
# pass 162
# fail 0
```

All 162 tests green. Zero regressions.

## Key Metrics

| Metric | Value |
| --- | --- |
| Files touched | 11 (tool-utils.ts + 10 tool-registration files + deferred-items.md) |
| Commits | 3 (fb25659, 576321c, 3eecd1d) |
| Net line delta in src/mcp/tools/ | -287 lines (from 2072 pre-migration to ~1785 post-migration after accounting for Task 2's +0 net + Task 3's -287) |
| tool-utils.ts growth | +59 lines (constants + docblock) |
| Tools using shared constants | 70/72 (97.2%) |
| Tools with documented inline exceptions | 2/72 (2.8% — both in core.ts, both due to openWorldHint:true) |
| Inline `readOnlyHint: true` literals remaining | 1 (update_status exception only) |
| Inline `readOnlyHint: false` literals remaining | 1 (update_self exception only) |
| Private helper removed | `readOnlyAnnotations` (graph-tools.ts) |
| Shared constant usage counts | RO=46, WR=9, IW=9, DS=6 (total 70) |
| Build | PASS |
| Tests | 162/162 PASS |

## For Plan 39-02

Plan 02 is the annotation validation test. It should:
1. Import the 4 constants from `src/mcp/common/tool-utils.js` and use them directly in its hardcoded expected-annotation map.
2. For the 2 inline exceptions (`synapse_update_status`, `synapse_update_self`), map them to explicit inline objects matching the core.ts inline values.
3. Expected shape (70 shared + 2 exceptions):
   - 46 tools → `READ_ONLY_ANNOTATIONS`
   - 9 tools → `WRITE_ANNOTATIONS`
   - 9 tools → `IDEMPOTENT_WRITE_ANNOTATIONS`
   - 6 tools → `DESTRUCTIVE_ANNOTATIONS`
   - 1 tool (`update_status`) → `{ readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }`
   - 1 tool (`update_self`) → `{ readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }`
   - **Total: 72 expected entries.**
4. The test should assert that every tool registered through `registerAppTools` is present in the expected map AND has matching annotations — same pattern as `test/mcp-tools.test.js`'s `makeFakeServer()`.

## Self-Check: PASSED

- `.planning/phases/39-tool-annotations-mcp-spec/39-01-SUMMARY.md` exists (this file)
- `.planning/phases/39-tool-annotations-mcp-spec/deferred-items.md` exists
- Commit `fb25659` exists in git log
- Commit `576321c` exists in git log
- Commit `3eecd1d` exists in git log
- `src/mcp/common/tool-utils.ts` exports READ_ONLY_ANNOTATIONS, WRITE_ANNOTATIONS, IDEMPOTENT_WRITE_ANNOTATIONS, DESTRUCTIVE_ANNOTATIONS
- All 10 tool-registration files import at least one shared constant
- 70 tools use shared constants + 2 documented inline exceptions = 72 total
- `npm run build` PASS
- `npm test` 162/162 PASS
