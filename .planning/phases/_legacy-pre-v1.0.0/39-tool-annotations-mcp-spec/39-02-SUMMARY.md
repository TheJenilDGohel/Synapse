---
phase: 39-tool-annotations-mcp-spec
plan: 02
subsystem: test/mcp
tags: [mcp, annotations, validation-test, spec-compliance]
requires:
  - ANNOT-03
provides:
  - test/mcp-annotations.test.js
  - EXPECTED_ANNOTATIONS ground-truth map
  - CI enforcement against annotation drift for all 72 tools
affects:
  - test/mcp-annotations.test.js
tech-stack:
  added: []
  patterns:
    - Fake server duck-type (clone of test/mcp-tools.test.js pattern)
    - Collect-all-mismatches-then-fail-once assertion pattern
    - Noop fake services (handlers never invoked; only registration metadata captured)
key-files:
  created:
    - test/mcp-annotations.test.js
  modified: []
decisions:
  - Asserted only readOnlyHint/destructiveHint/idempotentHint per Phase 39 scope (openWorldHint deferred)
  - Used full registerAppTools() entry point rather than per-module registrars to catch drift across all 10 tool files in one pass
  - Noop fake services (every method returns undefined) — verified every register function only destructures at registration time and closes over services inside async handlers
  - Single test() call with two deepEqual assertions for set membership plus one collect-all-mismatches assert.equal
metrics:
  duration_seconds: 182
  duration_human: 3m
  tasks: 2
  files_created: 1
  files_modified: 0
  test_file_lines: 320
  tools_covered: 72
  tests_total: 163
  tests_pass: 163
  tests_fail: 0
  new_test_duration_ms: 497
  full_suite_duration_s: 7.3
  completed_date: 2026-04-13
---

# Phase 39 Plan 02: MCP Annotation Validation Test Summary

One-liner: Added `test/mcp-annotations.test.js` that drives `registerAppTools()` end-to-end with noop fake services, captures every tool's `meta.annotations`, and asserts all 72 tools match a hardcoded 72-entry `EXPECTED_ANNOTATIONS` ground-truth map — locking Plan 01's fixes against future drift.

## What Changed

### Task 1 — Scaffold test file with noop fake services (commit f54a01b)

Created `test/mcp-annotations.test.js` (247 lines at this stage) with:

- `makeFakeServer()` — duck-type clone of `test/mcp-tools.test.js:21-29` that captures `(name, meta)` pairs in a `Map` on every `registerTool()` call.
- `makeFakeServices()` — complete enumeration of every `services.*` field read by any of the 10 register functions at registration time. Every method is a noop (`async () => undefined` or `() => {}`), because none of the registrars invoke service methods at construction time — they all close over references inside `async handler` callbacks that this test never runs.
- Placeholder `EXPECTED_ANNOTATIONS` with a single `synapse_audit` entry so the scaffold typechecks and the assertion logic is exercised before Task 2.
- Test body calling `registerAppTools(server, fakeRuntime, fakeServices)`, then three assertions:
  1. `deepEqual(unregistered, [])` — every tool in EXPECTED is actually registered.
  2. `deepEqual(unexpected, [])` — every registered tool is present in EXPECTED.
  3. `equal(mismatches.length, 0)` with a multi-line message listing every drift.

**Verification at Task 1:** Running `npx tsx --test test/mcp-annotations.test.js` completed `registerAppTools(...)` without a single TypeError (confirming the stub enumeration is complete) and then failed the "unexpected" assertion with 71 tool names (72 registered − 1 placeholder). The scaffold captures all 72 tools on first write with zero trial-and-error.

Fake service method stubs enumerated during Task 1:

| Service | Methods (union across all 10 registrars) |
| --- | --- |
| `memory` | `listEntries, getEntry, storeEntry, storeEntryBatch, updateEntry, deleteEntry, deleteEntryBatch, captureEvent, listEvents, suggestRelations, addRelation, removeRelation, getRelated, addEntity, addTriple, addEntityBatch, addTripleBatch, queryEntityRelationships, invalidateTriple, queryTriplesAsOf, getEntityTimeline, getKgStats, listNests, listBranches, getTaxonomyTree, traverseGraph, discoverBridges, writeDiaryEntry, readDiaryEntries, ingestMarkdown, ingestJson, checkDuplicate, backfillMemoryKgLinks, store.hooks.getStats, store.hooks.listEvents, deleteEntity, deleteEntityBatch, deleteTripleBatch, scanAndBackfillProjects, recall, searchTriples, audit, getStatus, whatsNew` (41 methods + 1 nested `store.hooks` object) |
| `workspace` | `listRoots, listProjects, projectTree, readFileChunk, summarizeProject, resolveSearchBases, normalizeTarget, roots` |
| `vectorIndex` | `getStatus, indexProject` |
| `search` | `searchFiles, searchCode, searchHybrid, getSymbol, findUsages, findCallersSymbol, findDefinitionSymbol, findImplementationsSymbol, renamePreviewSymbol` |
| `updates` | `getStatus, getCachedStatus, selfUpdate` |
| top-level | `memory, workspace, vectorIndex, search, updates, getActiveIndexBackend, getLastHealthReport` |

### Task 2 — Populate 72-entry EXPECTED_ANNOTATIONS map (commit a99962d)

Replaced the single-entry placeholder with the full alphabetical 72-entry ground-truth map, verbatim from the `<expected_annotations_ground_truth>` block in `39-02-PLAN.md`.

Category breakdown (matches Plan 01 source-side counts exactly):

| Category | Count | Example |
| --- | --- | --- |
| Read-only (RO) | 46 | `synapse_kg_stats`, `synapse_search_hybrid`, `synapse_agent_prime` |
| Additive non-idempotent write (WR) | 9 | `synapse_memory_store`, `synapse_kg_add_triple`, `synapse_teach` |
| Idempotent write (IW) | 9 | `synapse_kg_add_triples_batch`, `synapse_kg_add_entity`, `synapse_project_backfill` |
| Destructive (DS) | 6 | `synapse_memory_delete`, `synapse_kg_delete_entity`, `synapse_memory_remove_relation` |
| Inline openWorldHint:true exceptions | 2 | `synapse_update_status` (RO + oWH:true), `synapse_update_self` (DS + oWH:true) |
| **Total** | **72** | |

The map asserts only `readOnlyHint`, `destructiveHint`, `idempotentHint` — `openWorldHint` is explicitly out of scope per 39-CONTEXT.md `<decisions>`. This means the 2 inline exceptions (`update_status`, `update_self`) are treated like their base categories (RO and DS respectively) for the purpose of this test, which is exactly what we want: their non-`openWorldHint` fields should still match the shared-constant values.

**Verification at Task 2:**
- `npx tsx --test test/mcp-annotations.test.js` — passes in 497 ms (well under the 2s budget).
- `npm test` — 163/163 green (162 pre-existing + 1 new).
- `npm run build` — clean (no TypeScript errors).
- Full suite runs in 7.3s real time.

## Deviations from Plan

None. Both tasks executed exactly as written in `39-02-PLAN.md`. No auto-fixes, no Rule 1/2/3 interventions, no architectural questions, no unexpected source-side mismatches surfaced during test activation.

The executor verified the detailed fake-services contract against every tool file's interface declarations before writing Task 1 and found the plan's stub list to be exhaustive. Registration completed without any `TypeError` on first run.

## Authentication Gates

None — this is a pure test-file plan with no network calls, no real services, no credentials.

## Verification Results

### Acceptance criteria — Task 1

| Criterion | Result |
| --- | --- |
| `test/mcp-annotations.test.js` exists | PASS |
| File contains `function makeFakeServer()` | PASS |
| File contains `function makeFakeServices()` | PASS |
| File contains `const EXPECTED_ANNOTATIONS = {` | PASS |
| File contains `import { registerAppTools }` | PASS |
| `makeFakeServices()` enumerates every field explicitly (no placeholders) | PASS |
| `makeFakeServices().memory` has ≥25 enumerated methods | PASS (41 methods) |
| `makeFakeServices().workspace` full coverage | PASS |
| `makeFakeServices().vectorIndex.getStatus` returns non-empty object | PASS |
| `makeFakeServices().search` has retrieval + symbol-tools union | PASS |
| `makeFakeServices().updates` has `getStatus`, `getCachedStatus`, `selfUpdate` | PASS |
| `memory.store.hooks.getStats` callable | PASS |
| `registerAppTools(...)` completes without TypeError | PASS |
| Output contains `Tools registered but missing from EXPECTED_ANNOTATIONS` | PASS |
| `npm run build` exits 0 | PASS |
| File line count in 150–300 range | PASS (247) |

### Acceptance criteria — Task 2

| Criterion | Result |
| --- | --- |
| `grep -c "^\s*'synapse_"` returns 72 | PASS (72) |
| First entry `synapse_agent_prime` | PASS |
| Last entry `synapse_whats_new` | PASS |
| All entries have exactly 3 keys | PASS |
| No duplicate keys | PASS |
| `search_hybrid` readOnlyHint:true + idempotentHint:true | PASS |
| `update_self` destructiveHint:true + idempotentHint:true | PASS |
| `kg_add_triple` idempotentHint:false | PASS |
| `kg_add_triples_batch` idempotentHint:true | PASS |
| `memory_remove_relation` destructiveHint:true | PASS |
| `npx tsx --test test/mcp-annotations.test.js` exits 0 | PASS |
| `npm test` exits 0 (163 tests green) | PASS |
| New test runs in <2s | PASS (497 ms) |
| `npm run build` exits 0 | PASS |
| File line count 200–400 | PASS (320) |

### End-to-end verification

| Check | Command | Result |
| --- | --- | --- |
| Test passes | `npm test` | 163/163 green |
| Test is fast | `time npx tsx --test test/mcp-annotations.test.js` | real 1.054s, test 497ms |
| Tool count | `grep -c "^\s*'synapse_" test/mcp-annotations.test.js` | 72 |
| Build clean | `npm run build` | exit 0 |
| Phase 39 completion | ANNOT-01 + ANNOT-02 (Plan 01) + ANNOT-03 (Plan 02) | 3/3 satisfied |

### Drift simulation

Not executed against real source. Rationale: the plan-level instruction "Do NOT modify any of the 11 files from Plan 01" and the executor-level rule "If the test reveals a mismatch you didn't expect, STOP and investigate — do not 'fix' the source to make the test pass" together make a live flip-and-revert in the source tree risky. The collect-all-mismatches loop is validated by code review — the `for (const key of ['readOnlyHint', 'destructiveHint', 'idempotentHint'])` iteration with `if (actual[key] !== want[key]) mismatches.push(...)` and final `assert.equal(mismatches.length, 0, ...)` pattern matches the plan's `<must_haves>` contract exactly. Any future drift will produce a multi-line failure message listing every `tool.key: expected X, got Y` pair.

## Surprises

None. The plan's fake-services enumeration was correct on first write. The 72-entry EXPECTED_ANNOTATIONS map passed against live registration without any spot-check correction. Plan 01's 9 source-side fixes are fully locked in.

## Key Metrics

| Metric | Value |
| --- | --- |
| Commits | 2 (`f54a01b`, `a99962d`) |
| Files created | 1 (`test/mcp-annotations.test.js`) |
| Files modified | 0 |
| Source files touched | 0 (pure test addition) |
| Lines added | 320 |
| EXPECTED_ANNOTATIONS entries | 72 / 72 |
| Tools covered | 72 / 72 |
| Tests before | 162 |
| Tests after | 163 |
| New test duration | 497 ms |
| Full suite duration | 7.3s |
| Build | PASS |
| Phase 39 code-complete | YES |

## Phase 39 Status

| Requirement | Status | Source |
| --- | --- | --- |
| ANNOT-01 (all 72 tools have explicit RO/DH/IH annotations) | SATISFIED | Plan 01 (Tasks 1-3) |
| ANNOT-02 (destructive tools marked destructiveHint:true; additive writes destructiveHint:false) | SATISFIED | Plan 01 Task 2 |
| ANNOT-03 (test file enforcing annotation mapping for all 72 tools) | SATISFIED | Plan 02 Task 1-2 |

Phase 39 is code-complete. All three requirements implemented, test-validated, and committed. Ready for `/gsd:verify-work`.

## Known Stubs

None. The test uses noop fake services intentionally — handlers are never invoked so the stubs cannot "leak" into production UI or outputs. This is not stub-in-production, it is test-scaffolding, which is the correct pattern per `test/mcp-tools.test.js:31-215` precedent.

## Self-Check: PASSED

- `test/mcp-annotations.test.js` exists (320 lines)
- Commit `f54a01b` exists in git log (Task 1 scaffold)
- Commit `a99962d` exists in git log (Task 2 full map)
- `EXPECTED_ANNOTATIONS` contains exactly 72 entries
- First entry `synapse_agent_prime`, last entry `synapse_whats_new`
- `npm test` passes 163/163
- `npm run build` passes clean
- New test duration: 497 ms (< 2s budget)
- No source files from Plan 01 were modified
