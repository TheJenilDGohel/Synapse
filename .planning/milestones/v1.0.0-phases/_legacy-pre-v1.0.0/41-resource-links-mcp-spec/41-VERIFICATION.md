---
phase: 41-resource-links-mcp-spec
verified: 2026-04-13T00:00:00Z
status: human_needed
score: 7/7 must-haves verified
human_verification:
  - test: "Connect Synapse MCP server to a client that supports resource_link blocks (Claude Desktop, VS Code MCP panel, or Inspector) and call synapse_read_file"
    expected: "Client shows both the inline text body AND a dereferenceable link/attachment for the file with name, description 'chunk X-Y of N lines', and mime type"
    why_human: "Spec-compliant wire emission is unit-locked, but client-side rendering and file:// dereferencing can only be observed end-to-end"
  - test: "Call synapse_search_files in a real client with a query that hits multiple files"
    expected: "Client renders the inline text AND N unique resource_link entries (one per unique file), each with description 'path match: <fragment>'"
    why_human: "Visual verification of resource_link UI surfacing in the client"
  - test: "Call synapse_search_code in a real client with a query that hits the same file multiple times"
    expected: "Client shows inline text AND one resource_link per unique file with description 'N match(es) for <query>' (plural vs singular) — never one link per match line"
    why_human: "Dedup behavior is unit-tested but observing client-side collapse confirms UX"
  - test: "Call synapse_read_file with an invalid path in a real client"
    expected: "Client receives an error with zero resource_link blocks (unit test 5 locks the server-side behavior)"
    why_human: "Confirm client surfaces the error cleanly and does not attempt to dereference a phantom file://"
---

# Phase 41: Resource Links (MCP Spec) — Verification Report

**Phase Goal:** Three file-returning tools (read_file, search_files, search_code) emit MCP resource_link content blocks alongside inline text using file:// URIs, with test lock and zero regressions to baseline.

**Verified:** 2026-04-13
**Status:** human_needed (all automated checks pass; real MCP client visual verification pending)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | `synapse_read_file` emits exactly one resource_link with file:// URI for a successful read | VERIFIED | retrieval.ts:516-523 wires `createToolResponse(result, { resourceLinks: [buildResourceLink(absPath, description)] })`. Test 1 asserts `content.length === 2`, `uri === 'file:///tmp/helper.ts'`, `name === 'helper.ts'`, description `chunk 10-80 of 320 lines`, `mimeType === 'text/typescript'`. PASSES. |
| 2   | `synapse_search_files` dedupes by absolute path and emits one resource_link per unique matched file | VERIFIED | retrieval.ts:285-298 uses `Set<string>` dedup loop, emits `path match: ${fragment}` descriptions. Test 2 drives 3 input items across 2 unique files, asserts `content.length === 3` (text + 2 links), URIs `[file:///tmp/auth.ts, file:///tmp/login.ts]`. PASSES. |
| 3   | `synapse_search_code` dedupes by absolute path and emits one resource_link per unique file (not per match line) | VERIFIED | retrieval.ts:350-364 uses `Map<string, number>` two-pass counter + inline pluralization (`count === 1 ? 'match' : 'matches'`). Test 3 drives 5 matches across 3 files, asserts `content.length === 4` (text + 3 links), a.ts = `3 matches for foo`, b.ts + c.go = `1 match for foo`, c.go mimeType = `text/x-go`. PASSES. |
| 4   | Empty-result and error paths emit zero resource_links — content[] contains only the text block | VERIFIED | Empty: withSearchMissResponse does not set resourceLinks. Error: readFileChunk throws before createToolResponse is reached. Test 4 (empty search_code) asserts `content.length === 1`. Test 5 (read_file rejection) asserts `assert.rejects(/path not found/)`. PASSES. |
| 5   | `structuredContent.data` shape is unchanged for all 3 tools — backwards compat on the data side | VERIFIED | toolResult() at tool-utils.ts:159-189 appends resource_links to `content[]` only; `structuredContent.data` is the normalized payload's `data` field unchanged. Test 7 explicitly asserts `data.path`, `data.start_line`, `data.end_line`, `data.total_lines`, `Array.isArray(data.lines)`, `typeof data.content === 'string'`, AND `data.resource_links === undefined` (no bleed-through). PASSES. |
| 6   | A new test/mcp-resource-links.test.js with 5+ assertions locks the behavior | VERIFIED | 291 lines, exactly 7 `test()` calls (exceeds the 5+ floor), covers happy/dedup/empty/error/mime/backwards-compat via fake workspace + fake search services booted through `registerRetrievalTools`. Single-file run: 7/7 pass. |
| 7   | All existing tests remain green — the 165-test baseline expands to 165 + 7 with zero failures | VERIFIED | `npm test` → 172 pass / 0 fail / 0 skip (was 165, net +7). Full suite run completed in 10.1s. |

**Score:** 7/7 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/mcp/common/mime.ts` | New helper: ResourceLink type + getMimeTypeFromPath + buildResourceLink | VERIFIED | 79 lines (≤ 80 cap). Exports all 3 symbols. 17-entry frozen mime table (spec floor was 16). Uses `path.resolve()` + `file://${resolved}` URI. Imported by retrieval.ts and tool-utils.ts. |
| `src/mcp/common/tool-utils.ts` | Extended ToolResponsePayload, createToolResponse, toolResult, ToolResult with resource_links channel | VERIFIED | 301 lines (≤ 320 cap). `ResourceLink` type imported (line 3). ToolResult.content union broadened to `{type:'text'} \| ResourceLink` (lines 146-152). ToolResponseOptions + ToolResponsePayload carry `resourceLinks?` / `resource_links?` channels. toolResult() signature has 4-arg form with explicit-arg > payload-channel precedence (lines 159-189). Zero regressions to the 2-arg/3-arg callers. |
| `src/mcp/common/index.ts` | Barrel re-exports mime helpers + ResourceLink type | VERIFIED | 36 lines (≤ 45 cap). Lines 33-36 re-export `getMimeTypeFromPath`, `buildResourceLink`, `type ResourceLink` from `./mime.js`. |
| `src/mcp/tools/retrieval.ts` | 3 handlers wired via createToolResponse({resourceLinks}) | VERIFIED | 573 lines (≤ 575 cap, 2 headroom). buildResourceLink import line 4, ResourceLink type import line 5. 3 `RLINK-01..03` comment markers (lines 286, 351, 516) — one per handler. 3 `createToolResponse(..., { resourceLinks })` emissions. No TODO/FIXME/stub markers. |
| `test/mcp-resource-links.test.js` | 5+ test cases covering emission + dedup + empty + error + mime + backwards-compat | VERIFIED | 291 lines (new file). 7 `test()` calls. Direct `registerRetrievalTools` boot with fake workspace + fake search services. Threads captured handler output through real `toolResult()` for content[] assertion. All 7 pass in isolation and as part of full `npm test`. |

---

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| src/mcp/common/tool-utils.ts | src/mcp/common/mime.ts | `import type { ResourceLink } from './mime.js'` | WIRED | tool-utils.ts line 3. Used in ToolResponseOptions, ToolResponsePayload, NormalizedPayload, toolResult signature, ToolResult content union. |
| src/mcp/common/index.ts | src/mcp/common/mime.ts | barrel re-export | WIRED | index.ts lines 35-36 re-export both runtime symbols and the type. |
| src/mcp/tools/retrieval.ts | src/mcp/common/mime.ts | direct import + buildResourceLink calls | WIRED | retrieval.ts lines 4-5 import both value and type. 3 call sites (lines 296, 362, 522) invoke `buildResourceLink(absPath, description)`. |
| src/mcp/tools/retrieval.ts | src/mcp/common/tool-utils.ts | `createToolResponse(data, { resourceLinks })` channel | WIRED | Three emission sites: line 298 (search_files), 364 (search_code), 523 (read_file). Payload channel flows through normalizeToolResponsePayload → toolResult → content[] append. |
| test/mcp-resource-links.test.js | src/mcp/tools/retrieval.ts | `registerRetrievalTools` with fake services + captured handler invocation | WIRED | Test line 3 imports registerRetrievalTools. bootRetrieval() seeds fake workspace/search/vectorIndex, invokes captured handlers, threads through real toolResult(). |
| test/mcp-resource-links.test.js | src/mcp/common/mime.ts | barrel import of `getMimeTypeFromPath` | WIRED | Test lines 4-8 import via `../src/mcp/common/index.js` barrel. Test 6 exercises the mime table directly. |

All key links WIRED.

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| retrieval.ts read_file handler | `result` (FileChunkResult) | `workspace.readFileChunk(filePath, start, end, maxWidth)` from `src/services/workspace/helpers.ts` | Yes — real fs read with absolute path + start/end/total_lines | FLOWING |
| retrieval.ts search_files handler | `results` (FileMatch[]) | `search.searchFiles({query, ...})` from `src/services/retrieval/search/lexical-search.ts` | Yes — real lexical search producing absolute file paths | FLOWING |
| retrieval.ts search_code handler | `results` (LexicalMatch[]) | `search.searchCode({query, ...})` from the same module | Yes — ripgrep-backed content search producing absolute file paths + lines | FLOWING |
| resource_link `uri` field | `file://${path.resolve(absPath)}` | `buildResourceLink` at mime.ts:68-79 | Yes — path.resolve guarantees absolute form; file:// prefix per MCP 2025-06-18 | FLOWING |
| resource_link `mimeType` field | Extension lookup via `getMimeTypeFromPath` | Frozen 17-entry EXT_TO_MIME table at mime.ts:26-44 | Yes — real mapping; unknown extensions correctly return undefined (field omitted) | FLOWING |

No HOLLOW or DISCONNECTED artifacts. All resource_link content flows from real data sources.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Build compiles cleanly | `npm run build` | `> tsc` (exit 0, no output) | PASS |
| Full test suite stays green at new baseline | `npm test` | `# tests 172 / pass 172 / fail 0 / skipped 0` | PASS |
| Phase 41 test file runs in isolation | `npx tsx --test test/mcp-resource-links.test.js` | `# tests 7 / pass 7 / fail 0` | PASS |
| mime.ts buildResourceLink emits file:// URI | Unit test 1 asserts `link.uri === 'file:///tmp/helper.ts'` | Direct assertion pass | PASS |
| retrieval.ts has ≥3 resource_link emission sites | Grep `buildResourceLink` in retrieval.ts | 3 matches (lines 296, 362, 522) | PASS |
| Pluralization correct at count=1 and count=3 | Test 3 asserts `1 match for foo` (singular) and `3 matches for foo` (plural) | Direct regex match pass | PASS |
| Dedup Set/Map behavior | Test 2 (Set) asserts 3→2 links; Test 3 (Map+count) asserts 5→3 links | Both assertions pass | PASS |
| structuredContent.data has no resource_links bleed | Test 7 asserts `data.resource_links === undefined` | Pass | PASS |

All automated spot-checks PASS.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| **RLINK-01** | 41-02 | `read_file`, `search_code`, `search_files` return `resource_link` objects | SATISFIED | 3 handler emission sites in retrieval.ts; Tests 1-3 lock the shape and dedup behavior |
| **RLINK-02** | 41-02 | Clients can dereference resource links via MCP resource protocol | SATISFIED (client-side deref needs human) | `buildResourceLink` emits `file://${path.resolve(absPath)}`; mime.ts lines 68-79 guarantee absolute-path URIs per spec. Test 1 asserts `file:///tmp/helper.ts`. Actual client deref behavior routed to human verification. |
| **RLINK-03** | 41-01, 41-02 | Fallback: when client doesn't support resource links, inline content as before | SATISFIED | toolResult() appends links AFTER text block; structuredContent.data untouched. Test 7 locks backwards compat. Full 165 baseline preserved (172 total). |

No orphaned requirements. All 3 RLINK requirements mapped to plans and verified.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| src/mcp/tools/retrieval.ts | — | File size 573 lines (pre-existing, cap 500 per CLAUDE.md) | INFO | Pre-existing over the 500-line global cap BEFORE Phase 41 (baseline 535 lines). Phase 41 added 38 lines, staying under the phase-local 575 cap with 2 lines headroom. Not a Phase 41 regression — flagged per context note. Consider a future file-split phase. |

No blockers. No new anti-patterns introduced. Zero TODO/FIXME/PLACEHOLDER markers in any modified file.

---

### Human Verification Required

All automated checks pass but the following require a real MCP client for end-to-end visual confirmation:

### 1. read_file resource_link round-trip

**Test:** Connect Synapse MCP server to Claude Desktop / VS Code MCP panel / MCP Inspector and call `synapse_read_file` with a valid path in the allowed workspace.
**Expected:** The response shows both the inline text body AND a dereferenceable link/attachment carrying the file with name, description `chunk X-Y of N lines`, and mime type (e.g. `text/typescript`).
**Why human:** Unit tests lock the wire emission; client-side resource_link rendering and file:// dereferencing can only be confirmed end-to-end.

### 2. search_files multi-file dedup visual

**Test:** Call `synapse_search_files` with a query that matches multiple files in a real project.
**Expected:** Client renders inline text AND exactly N unique resource_link entries (one per unique absolute path), each with a `path match: <fragment>` description.
**Why human:** Dedup is unit-locked but real-client surfacing verifies UX (N unique visual attachments, not N duplicates).

### 3. search_code per-file collapse visual

**Test:** Call `synapse_search_code` with a query that hits the same file multiple times.
**Expected:** Client shows inline text AND one resource_link per unique file with description `N match(es) for <query>` — never one link per match line. Singular vs plural must read correctly.
**Why human:** Observing client-side collapse confirms the Map+count UX path works in-browser.

### 4. Error-path graceful degradation

**Test:** Call `synapse_read_file` with an invalid path in a real client.
**Expected:** Client receives the error cleanly with zero resource_link blocks; no phantom file:// deref attempt.
**Why human:** Unit test 5 locks server-side zero-emission; client error surfacing is observable only end-to-end.

---

### Gaps Summary

None. Every must-have truth is VERIFIED and every artifact/key-link is WIRED with data flowing. The single INFO-level anti-pattern (retrieval.ts over the 500-line global cap at 573 lines) is pre-existing tech debt flagged in the context block and explicitly under the phase-local 575 cap. Phase 41 adds 38 lines net — a proportional, bounded increase.

**Phase 41 delivers its stated goal:** The 3 file-returning retrieval tools emit MCP spec-compliant `resource_link` content blocks alongside their existing inline text payloads, with file:// URIs, extension-derived mime types, dedup by absolute path, and the pre-Phase-41 text-only fallback (RLINK-03) fully preserved. 7 locked assertions guard the behavior, and the full test baseline expands from 165 to 172 with zero failures.

The phase is ready to ship pending the real-client visual confirmation steps above.

---

_Verified: 2026-04-13_
_Verifier: Claude (gsd-verifier)_
