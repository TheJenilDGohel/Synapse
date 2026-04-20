---
phase: quick-260409-pdf
plan: 01
subsystem: memory/mcp
tags: [memory, mcp, nest, branch, bugfix, wiring]
requires:
  - Existing memory_entries.nest and memory_entries.branch columns (already present, no migration)
provides:
  - Agent-supplied nest/branch now persists across all three capture entry points
  - Basename-based nest fallback so nest_tree and graph_bridges have groupable data on new writes
affects:
  - src/mcp/tools/memory-store.ts
  - src/mcp/tools/memory-workflow.ts
  - src/services/memory/workflow.ts
  - src/services/memory/events/capture.ts
  - src/services/memory/store/entries.ts
  - test/memory-nest-branch-wiring.test.js
tech-stack:
  added: []
  patterns:
    - "Fallback-chain pattern: explicit input > derived fallback > legacy fallback > empty"
    - "Path basename derivation for portable cross-install grouping keys"
    - "Git-ref slash sanitization on fallback only (explicit values preserved)"
key-files:
  created:
    - test/memory-nest-branch-wiring.test.js
  modified:
    - src/mcp/tools/memory-store.ts
    - src/mcp/tools/memory-workflow.ts
    - src/services/memory/workflow.ts
    - src/services/memory/events/capture.ts
    - src/services/memory/store/entries.ts
decisions:
  - "Keep scope.topic in the branch fallback chain for legacy compat with the 7 pre-existing manually-stored memories"
  - "Sanitize slashes only on fallback derivations, never on explicit input.branch (preserves agent intent)"
  - "Do NOT touch updateEntry's patch.nest ?? existing.nest semantics — patch-ignores-unspecified contract stays intact"
  - "Do NOT touch the captureEvent merge-target path — merge target already carries nest/branch from the original insert"
  - "node:path is allowed as a Node built-in; still counts as zero new runtime dependencies"
metrics:
  duration: "~4m"
  completed: "2026-04-09T12:56:58Z"
  tasks: 4
  files_modified: 5
  files_created: 1
requirements_completed:
  - QUICK-260409-PDF-BUG1
  - QUICK-260409-PDF-BUG2
  - QUICK-260409-PDF-BUG3
---

# Quick Task 260409-pdf: Fix nest/branch Parameter Pass-Through Summary

Wire agent-supplied `nest` and `branch` end-to-end through the MCP schemas, workflow, and capture layers, and fix the storeEntry fallback so nest derives from `path.basename(project_path)` (portable across installs) and branch derives from `scope.branch_name` with slash sanitization — unblocking `nest_tree` and `graph_bridges` on all future writes without waiting for Phase 34 SLIM-07 (auto-inference) or Phase 35 (backfill).

## What Changed

Three bugs closed in four atomic commits:

1. **Bug 1 (schema exposure):** `nest` and `branch` added as `z.string().max(200).optional()` to the `synapse_memory_store`, `synapse_memory_capture_event`, and `synapse_capture_outcome` input schemas. Agents can now send these fields; zod previously stripped them silently.
2. **Bug 2 (forwarding drop sites):** Two intermediate drop sites fixed.
   - `MemoryWorkflowService.captureOutcome` now copies `input.nest` / `input.branch` into the `captureInput` object literal so they reach `captureEvent`.
   - `captureEvent` non-merge promotion path now forwards them into the `storeEntry` call. The pre-existing read at the `checkDuplicate` call (line 84) was already correct but downstream was dropping them.
3. **Bug 3 (fallback derivation):** `storeEntry` fallback previously wrote absolute filesystem paths into the `nest` column. Now derives from `path.basename(scope.project_path)` so every install can share a grouping key. Branch fallback now prefers `scope.branch_name` (the git branch), retains `scope.topic` only as legacy compat, and replaces `/` and `\` with `-` so values like `release/0.2.0` become `release-0.2.0`. Sanitization only fires on the fallback — explicit `input.branch` strings survive verbatim via `cleanString`.

Added four regression tests in `test/memory-nest-branch-wiring.test.js` exercising:

- Explicit pass-through via `storeEntry`
- Explicit pass-through via `captureEvent` (high-importance promotion path)
- Basename + slash-sanitization fallback when nest/branch are omitted
- Explicit slashes preserved (sanitization does NOT touch explicit input)

## Files Touched

| File | Change | Size |
|------|--------|------|
| `src/mcp/tools/memory-store.ts` | +4 lines (nest/branch in 2 schemas) | 361 lines |
| `src/mcp/tools/memory-workflow.ts` | +2 lines (nest/branch in 1 schema) | 170 lines |
| `src/services/memory/workflow.ts` | +2 lines (captureInput forwarding) | 217 lines |
| `src/services/memory/events/capture.ts` | +2 lines (storeEntry forwarding) | 184 lines |
| `src/services/memory/store/entries.ts` | +4/-2 net lines, +1 import | 347 lines |
| `test/memory-nest-branch-wiring.test.js` | new file, 4 tests | 150 lines |

All modified files remain well under the 500-line CLAUDE.md cap.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `eb2b882` | feat(quick-260409-pdf): expose nest/branch on memory MCP tool schemas |
| 2 | `8fcc92d` | fix(quick-260409-pdf): forward nest/branch through captureOutcome and captureEvent |
| 3 | `1459090` | fix(quick-260409-pdf): derive nest from project basename and sanitize branch fallback |
| 4 | `edc1728` | test(quick-260409-pdf): regression tests for nest/branch wiring and basename fallback |

## Verification Results

- `npx tsc --noEmit` after each task: zero errors, zero warnings.
- `npx tsx --test test/memory-nest-branch-wiring.test.js` — 4/4 pass, no skips (node:sqlite available).
- `npx tsx --test test/memory-store.test.js` — 6/6 pass, no regression in the existing suite.
- Grep verifications from the plan's `<verify>` blocks all returned the expected counts (3 nest matches in MCP schemas, 3 branch matches, 1 `path.basename(scope.project_path)` in entries.ts, 1 new `nest: input.nest` in workflow.ts, 2 `nest: input.nest` in capture.ts — one pre-existing plus one new).

## Deviations from Plan

None — plan executed exactly as written. All four tasks landed with the exact code shapes the planner specified. No Rule 1/2/3 fixes triggered. No Rule 4 architectural questions raised.

## Known Stubs

None.

## Response Shape Safety

No MCP response normalizer was touched. The new `nest` / `branch` fields are additive on request, and `memory_entries` already exposed these columns in `listEntries` / `getEntry` output (since the schema has had them all along). Existing clients that omit the fields see no change beyond the fallback now storing `synapse` instead of `/mnt/.../Base Projects/synapse` on new writes.

## Out of Scope (Confirmed NOT Done)

- Auto-inference of nest/branch from content (reserved for Phase 34 SLIM-07)
- Backfill of the existing 65 memory rows with empty nest/branch (reserved for Phase 35)
- Changes to the `memory_events` table (no nest/branch columns there — audit log is intentionally separate)
- Changes to `updateEntry` patch fallback semantics
- Changes to the captureEvent merge-target path (merge inherits nest/branch from the prior insert)
- MCP end-to-end zod schema tests (covered by existing `test/mcp-tools.test.js`)

## Self-Check: PASSED

- `src/mcp/tools/memory-store.ts` — FOUND (361 lines, both schemas have nest/branch)
- `src/mcp/tools/memory-workflow.ts` — FOUND (170 lines, capture_outcome has nest/branch)
- `src/services/memory/workflow.ts` — FOUND (217 lines, captureInput forwards nest/branch)
- `src/services/memory/events/capture.ts` — FOUND (184 lines, storeEntry call forwards nest/branch)
- `src/services/memory/store/entries.ts` — FOUND (347 lines, imports node:path, uses basename)
- `test/memory-nest-branch-wiring.test.js` — FOUND (150 lines, 4 tests passing)
- Commit `eb2b882` — FOUND in git log
- Commit `8fcc92d` — FOUND in git log
- Commit `1459090` — FOUND in git log
- Commit `edc1728` — FOUND in git log
