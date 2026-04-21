---
phase: 39-tool-annotations-mcp-spec
verified: 2026-04-13T00:00:00Z
status: human_needed
score: 8/8 must-haves verified
must_haves:
  truths:
    - "src/mcp/common/tool-utils.ts exports all 4 shared annotation constants"
    - "All 72 MCP tools have explicit readOnlyHint/destructiveHint/idempotentHint annotations"
    - "70 of 72 tool registrations reference shared constants; 2 inline exceptions are documented (update_status, update_self) for openWorldHint:true"
    - "All 6 destructive tools (5 deletes + memory_remove_relation) use DESTRUCTIVE_ANNOTATIONS; update_self is destructive inline"
    - "All write tools use WRITE_ANNOTATIONS or IDEMPOTENT_WRITE_ANNOTATIONS (destructiveHint: false)"
    - "test/mcp-annotations.test.js exists with 72-entry EXPECTED_ANNOTATIONS map"
    - "Test drives full registerAppTools() pipeline and asserts all 3 hints with collect-all-mismatches pattern"
    - "npm test passes 163/163 including the new annotation test; npm run build is clean"
  artifacts:
    - path: src/mcp/common/tool-utils.ts
      status: verified
    - path: src/mcp/tools/kg-delete-tools.ts
      status: verified
    - path: src/mcp/tools/memory-store.ts
      status: verified
    - path: src/mcp/tools/core.ts
      status: verified
    - path: test/mcp-annotations.test.js
      status: verified
human_verification:
  - test: "Connect a real MCP client (Claude Desktop / Cursor / a third-party UI) to synapse-mcp and call synapse_kg_delete_entity"
    expected: "Client surfaces a destructive-action warning / confirmation prompt because destructiveHint=true"
    why_human: "Cannot programmatically simulate client-side annotation handling — depends on each client's UX policy"
  - test: "Same MCP client calls synapse_search_hybrid"
    expected: "Client treats the call as safe / does NOT prompt for confirmation because readOnlyHint=true"
    why_human: "Client UX behavior is observable only with a real client integration"
  - test: "Same MCP client calls synapse_update_self"
    expected: "Client surfaces both a destructive warning AND an open-world (network) notice because destructiveHint=true and openWorldHint=true"
    why_human: "Combination of destructive + openWorld is the inline-exception path; only a real client renders both hints"
notes:
  pre_existing_tech_debt:
    - "src/mcp/tools/retrieval.ts is 516 lines (16 over the 500-line CLAUDE.md rule). Pre-existing — Plan 01 actually reduced it from 586 to 516 (-70). Logged in deferred-items.md for a future refactor phase. NOT a Phase 39 regression."
  nyquist_disabled: "Project-level workflow.nyquist_validation: false — absence of VALIDATION.md is expected."
---

# Phase 39: Tool Annotations (MCP Spec) Verification Report

**Phase Goal:** All 72 MCP tools have accurate `readOnlyHint`, `destructiveHint`, `idempotentHint` annotations per MCP 2025-06-18 spec, AND a test validates the full mapping.

**Verified:** 2026-04-13
**Status:** human_needed (all automated checks pass; 3 client-UX items need a real MCP client to confirm)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                          | Status     | Evidence                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | tool-utils.ts exports READ_ONLY/WRITE/IDEMPOTENT_WRITE/DESTRUCTIVE_ANNOTATIONS                 | VERIFIED | All 4 constants exported as `as const` frozen objects (lines 33-62), each setting all 4 fields explicitly       |
| 2   | All 72 MCP tools have explicit readOnly/destructive/idempotent hints                            | VERIFIED | 72 registerJsonTool calls across 10 files; 70 use shared constants, 2 use inline blocks. Test asserts all 72.   |
| 3   | Only 2 inline annotation blocks remain, both in core.ts, both for openWorldHint:true          | VERIFIED | grep `annotations: {` returns exactly 2 matches at core.ts:113 (update_status) and core.ts:140 (update_self)    |
| 4   | All 9 mismatches from the audit are fixed (search_hybrid, update_self, task_context, ...)    | VERIFIED | EXPECTED_ANNOTATIONS map encodes the corrected values; test passes                                              |
| 5   | All delete tools use DESTRUCTIVE_ANNOTATIONS                                                    | VERIFIED | 3 in kg-delete-tools.ts + 2 in memory-store.ts (memory_delete, memory_delete_batch) + memory_remove_relation    |
| 6   | All non-destructive write tools have destructiveHint: false                                    | VERIFIED | 9 WRITE + 9 IDEMPOTENT_WRITE constant references; both constants set destructiveHint: false                     |
| 7   | test/mcp-annotations.test.js drives full registerAppTools() and asserts all 72 tools          | VERIFIED | File exists, 320 lines, 72-entry EXPECTED_ANNOTATIONS, collect-all-mismatches loop on RO/DH/IH                  |
| 8   | Build clean + all tests pass (162 pre-existing + 1 new = 163)                                  | VERIFIED | `npm run build` exit 0; `npm test` 163/163 pass; new annotations test 518ms                                     |

**Score: 8/8 truths verified**

### Required Artifacts

| Artifact                                           | Expected                                                              | Status     | Details                                                                                |
| -------------------------------------------------- | --------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| `src/mcp/common/tool-utils.ts`                     | 4 exported annotation constants                                       | VERIFIED | Lines 33-62, with explanatory docblock about CONTEXT.md drift                          |
| `src/mcp/tools/kg-delete-tools.ts`                 | All 3 delete tools use DESTRUCTIVE_ANNOTATIONS                        | VERIFIED | Lines 28, 42, 56 — all 3 use `annotations: DESTRUCTIVE_ANNOTATIONS`                    |
| `src/mcp/tools/memory-store.ts`                    | memory_delete, memory_delete_batch, memory_remove_relation destructive | VERIFIED | Lines 212, 225, 330                                                                    |
| `src/mcp/tools/core.ts`                            | 4 RO + 2 inline (update_status, update_self) — all 6 documented        | VERIFIED | Lines 113-118 (update_status) and 140-145 (update_self) both have explanatory comments |
| `src/mcp/tools/retrieval.ts`                       | 13 RO + 1 WR + search_hybrid corrected                                 | VERIFIED | 13 READ_ONLY + 1 WRITE references; file is 516 lines (pre-existing tech debt)          |
| `src/mcp/tools/memory-workflow.ts`                 | 5 RO + 2 WR (task_context/recall/agent_prime/whats_new corrected)     | VERIFIED | 5 READ_ONLY + 2 WRITE references                                                       |
| `src/mcp/tools/graph-tools.ts`                     | 13 RO + 2 WR + 7 IW (kg_add_triples_batch corrected)                  | VERIFIED | 13 READ_ONLY + 2 WRITE + 7 IDEMPOTENT_WRITE references; private helper removed         |
| `src/mcp/tools/backfill-tools.ts`                  | project_backfill uses IDEMPOTENT_WRITE_ANNOTATIONS                     | VERIFIED | 1 IDEMPOTENT_WRITE reference                                                           |
| `src/mcp/tools/find-tools.ts`                      | synapse_find uses READ_ONLY_ANNOTATIONS                             | VERIFIED | 1 READ_ONLY reference                                                                  |
| `src/mcp/tools/audit-tools.ts`                     | synapse_audit uses READ_ONLY_ANNOTATIONS                             | VERIFIED | 1 READ_ONLY reference                                                                  |
| `src/mcp/tools/symbol-tools.ts`                    | All 4 symbol tools use READ_ONLY_ANNOTATIONS                           | VERIFIED | 4 READ_ONLY references                                                                 |
| `test/mcp-annotations.test.js`                     | Validation test with 72-entry expected map                            | VERIFIED | 320 lines, exactly 72 `'synapse_` entries, asserts RO/DH/IH only (openWorldHint out of scope per CONTEXT) |

### Distribution Sanity (matches Plan 01 frontmatter exactly)

| Constant | Expected per plan | Found via grep | Status |
| -------- | ----------------- | -------------- | ------ |
| READ_ONLY_ANNOTATIONS    | 46 | 46 | VERIFIED |
| WRITE_ANNOTATIONS        | 9  | 9  | VERIFIED |
| IDEMPOTENT_WRITE_ANNOTATIONS | 9 | 9 | VERIFIED |
| DESTRUCTIVE_ANNOTATIONS  | 6  | 6  | VERIFIED |
| Inline exceptions        | 2  | 2 (both in core.ts, both with openWorldHint:true) | VERIFIED |
| **Total tools**          | **72** | **72** | **VERIFIED** |

### Key Link Verification

| From                                              | To                                                | Via                                          | Status | Details                                          |
| ------------------------------------------------- | ------------------------------------------------- | -------------------------------------------- | ------ | ------------------------------------------------ |
| 10 tool-registration files                        | tool-utils.ts shared constants                    | `import { ... } from '../common/tool-utils.js'` | WIRED  | Every file that has tool registrations imports at least one shared constant |
| test/mcp-annotations.test.js                      | src/app/register-tools.ts registerAppTools        | `import { registerAppTools }`                 | WIRED  | Test invokes the production entry point end-to-end with fake services       |
| Test captured `meta.annotations`                   | EXPECTED_ANNOTATIONS map                          | strict equality on RO/DH/IH                  | WIRED  | Collect-all-mismatches loop with single fail-once assert (lines 304-319)    |

### Behavioral Spot-Checks

| Behavior                                                          | Command                                       | Result               | Status |
| ----------------------------------------------------------------- | --------------------------------------------- | -------------------- | ------ |
| TypeScript build is clean                                         | `npm run build`                               | exit 0               | PASS   |
| Full test suite passes                                            | `npm test`                                    | 163/163 pass         | PASS   |
| New annotation test runs and passes                                | `npx tsx --test test/mcp-annotations.test.js` | 1/1 pass, 518ms      | PASS   |
| EXPECTED_ANNOTATIONS map has exactly 72 tool entries              | grep count                                    | 72                   | PASS   |
| Only 2 inline `annotations: {` blocks remain                      | grep `annotations:\s*\{` in src/mcp/tools     | 2 (both in core.ts)  | PASS   |
| All 7 expected commits present (4 from Plan 01 + 3 from Plan 02)  | git log inspection                            | fb25659, 576321c, 3eecd1d, f46393f, f54a01b, a99962d, fc6c579 | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description                                                                          | Status     | Evidence                                                                          |
| ----------- | ----------- | ------------------------------------------------------------------------------------ | ---------- | --------------------------------------------------------------------------------- |
| ANNOT-01    | 39-01       | All 72 MCP tools have RO/DH/IH annotations matching actual behavior                   | SATISFIED  | 70 shared-constant references + 2 inline exceptions = 72 tools; all hints explicit |
| ANNOT-02    | 39-01       | Write tools `destructiveHint: false`; delete tools `destructiveHint: true`           | SATISFIED  | 18 write tools (9 WR + 9 IW) all `destructiveHint: false`; 6 destructive tools all `destructiveHint: true`; update_self inline destructive |
| ANNOT-03    | 39-02       | Annotations validated in MCP tools test (tool name -> expected annotations mapping) | SATISFIED  | test/mcp-annotations.test.js with 72-entry EXPECTED_ANNOTATIONS map; passes 163/163 |

No orphaned requirements — REQUIREMENTS.md only lists ANNOT-01..03 for Phase 39, and all three are claimed by the plans (01 covers ANNOT-01/02, 02 covers ANNOT-03).

### Anti-Patterns Found

| File                              | Line | Pattern                       | Severity | Impact                                                                                     |
| --------------------------------- | ---- | ----------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| src/mcp/tools/retrieval.ts        | -    | File length 516 > 500         | INFO     | Pre-existing tech debt. Plan 01 actually shrank this file by 70 lines (586 -> 516). Logged in deferred-items.md. Not a Phase 39 regression. |

No TODOs, FIXMEs, placeholders, or empty implementations introduced by Phase 39. The 2 inline `annotations: { ... }` blocks in core.ts are intentionally inline (documented exceptions for openWorldHint:true tools) and are explicitly covered by the validation test.

### Human Verification Required

Phase 39 is annotation metadata. Annotations are advisory hints consumed by MCP **clients** to render confirmation prompts, mark tools as safe/destructive, etc. The codebase ships them correctly (verified above), but only a real client renders the UX. The following 3 checks need a human to confirm with a real MCP client:

#### 1. Destructive warning on delete tools

**Test:** Connect a real MCP client (Claude Desktop, Cursor, etc.) to synapse-mcp and invoke `synapse_kg_delete_entity` (or any of the 5 delete tools).

**Expected:** Client surfaces a confirmation/warning prompt because `destructiveHint: true`.

**Why human:** Each MCP client implements its own annotation-aware UX. Cannot be exercised by an automated test from inside the server.

#### 2. Read-only safety on search tools

**Test:** Same MCP client invokes `synapse_search_hybrid`.

**Expected:** Client treats the call as safe / does NOT prompt for confirmation because `readOnlyHint: true`. (This was specifically fixed in Plan 01 — pre-fix it was incorrectly marked as a write.)

**Why human:** Same — only a real client renders the safety treatment.

#### 3. Combined destructive + open-world on update_self

**Test:** Same MCP client invokes `synapse_update_self` (with dry_run: true to avoid actually upgrading).

**Expected:** Client surfaces both a destructive warning AND a network-call notice because `destructiveHint: true` AND `openWorldHint: true`. This is the only tool with both flags — verifying it confirms the inline-exception path works end-to-end.

**Why human:** This is the most subtle case — the inline annotation block exists precisely because the constant-based path can't represent both flags simultaneously.

### Gaps Summary

No automated gaps. All 8 must-have truths are verified, all 12 artifacts pass the 3-level (exists, substantive, wired) check plus data-flow trace, all key links are wired, and the validation test passes 163/163 in 9.6 s wall-clock. The full `npm test` was run end-to-end after re-reading all changed files.

The phase is automated-complete. The status is `human_needed` (not `passed`) only because annotations are client-facing metadata and the spec's promise — "clients render correct affordances" — can only be confirmed by exercising a real MCP client UI. The 3 human-verification items above are advisory; the engineering work for Phase 39 is fully delivered and locked against drift.

The single piece of pre-existing tech debt (`retrieval.ts` at 516 lines) is documented in `deferred-items.md` and is explicitly NOT a Phase 39 regression — Plan 01 reduced the file by 70 lines.

---

_Verified: 2026-04-13_
_Verifier: Claude (gsd-verifier)_
