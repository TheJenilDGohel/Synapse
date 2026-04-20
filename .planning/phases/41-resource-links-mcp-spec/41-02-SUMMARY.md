---
phase: 41-resource-links-mcp-spec
plan: 02
subsystem: mcp-retrieval-handlers
tags: [rlink, resource-link, retrieval, mcp-2025-06-18, dedup, mime]
requires:
  - src/mcp/common/mime.ts (Plan 41-01)
  - src/mcp/common/tool-utils.ts (Plan 41-01 extensions)
  - createToolResponse({ resourceLinks }) channel
provides:
  - synapse_read_file resource_link emission (1 link per successful chunk)
  - synapse_search_files resource_link emission (Set dedup by absolute path)
  - synapse_search_code resource_link emission (Map dedup with per-file counts)
  - test/mcp-resource-links.test.js (7 locked assertions)
affects:
  - src/mcp/tools/retrieval.ts (3 handlers wired, imports extended)
  - test/mcp-resource-links.test.js (new)
tech-stack:
  added: []
  patterns:
    - "Set-based dedup for single-pass unique-path collection"
    - "Map-with-count dedup for per-file match tallying"
    - "Pluralization helper inline (1 match vs N matches)"
    - "Fake-services direct registrar boot for scoped handler testing"
key-files:
  created:
    - test/mcp-resource-links.test.js
  modified:
    - src/mcp/tools/retrieval.ts
decisions:
  - "Dedup by absolute path before calling buildResourceLink -- helpers stay per-path, not per-match"
  - "Description format strings locked exactly to CONTEXT.md: 'chunk X-Y of N lines', 'path match: frag', 'N match(es) for query'"
  - "search_code pluralization inline: count === 1 ? 'match' : 'matches' -- no helper extracted for 2 call sites"
  - "Empty-result paths route through withSearchMissResponse which does NOT set resourceLinks -- zero-link branch is implicit, not defensive"
  - "read_file error path emits zero links because readFileChunk throws before createToolResponse is reached (handler unwinding = natural zero-link guarantee)"
requirements:
  - RLINK-01
  - RLINK-02
  - RLINK-03
metrics:
  duration_seconds: 221
  tasks_completed: 2
  files_changed: 2
  commits: 2
  completed_date: 2026-04-13
---

# Phase 41 Plan 02: Wire Retrieval Handlers to Emit resource_link Blocks Summary

**One-liner:** Three retrieval handlers (read_file, search_files, search_code) now emit MCP `resource_link` content blocks alongside existing text payloads, dedup'd by absolute path, locked by a 7-test suite -- closing Phase 41 with full RLINK-01..03 compliance.

## What Was Built

### 1. `src/mcp/tools/retrieval.ts` -- 4 surgical edits (535 -> 573 lines)

**Edit 1 -- New imports (lines 4-5):**
```typescript
import { buildResourceLink } from '../common/mime.js';
import type { ResourceLink } from '../common/mime.js';
```
Barrel import path (`../common/index.js`) was the alternative; direct-module path picked for explicit coupling to the mime module introduced by Plan 01.

**Edit 2 -- `synapse_search_files` happy path (lines 283-306):**

Replaced the bare `if (results.length > 0) return results;` early return with a Set-based dedup loop that walks the result items, filters unique absolute paths, and emits one `resource_link` per unique file with the `path match: ${fragment}` description. The fragment prefers `relative_path`, falls back to `name`, then `absPath`. Empty-result path is unchanged -- `withSearchMissResponse` does not set `resourceLinks`, so `content[]` stays text-only.

```typescript
if (results.length > 0) {
  const seen = new Set<string>();
  const resourceLinks: ResourceLink[] = [];
  for (const item of results as Array<{ file?: string; relative_path?: string; name?: string }>) {
    const absPath = typeof item?.file === 'string' ? item.file : '';
    if (!absPath || seen.has(absPath)) continue;
    seen.add(absPath);
    const fragment = item.relative_path || item.name || absPath;
    resourceLinks.push(buildResourceLink(absPath, `path match: ${fragment}`));
  }
  return createToolResponse(results, { resourceLinks });
}
```

**Edit 3 -- `synapse_search_code` happy path (lines 332-357):**

Replaced the bare early return with a two-pass emitter: pass 1 tallies per-file counts into a `Map<string, number>`, pass 2 builds one `resource_link` per unique path with description `${N} match(es) for ${query}`. Pluralization ("match" for 1, "matches" for N) is inline -- no helper extracted since there are only two call sites.

```typescript
if (results.length > 0) {
  const counts = new Map<string, number>();
  for (const item of results as Array<{ file?: string }>) {
    const absPath = typeof item?.file === 'string' ? item.file : '';
    if (!absPath) continue;
    counts.set(absPath, (counts.get(absPath) || 0) + 1);
  }
  const resourceLinks: ResourceLink[] = [];
  for (const [absPath, count] of counts) {
    const noun = count === 1 ? 'match' : 'matches';
    resourceLinks.push(buildResourceLink(absPath, `${count} ${noun} for ${query as string}`));
  }
  return createToolResponse(results, { resourceLinks });
}
```

**Edit 4 -- `synapse_read_file` return path (lines 516-523):**

Appended the resource_link emission after the HOOK-07 memory-hint block. Extracts `path`, `start_line`, `end_line`, and `total_lines` from the normalized result via a single `Record<string, unknown>` cast (`rec`), with a fallback to `end_line` when `total_lines` is absent. Description format `chunk ${start}-${end} of ${total} lines` matches CONTEXT.md exactly. Error path is naturally zero-link: `workspace.readFileChunk` throws before this code runs, so no `createToolResponse` call is made and the registrar surfaces the error directly.

```typescript
// RLINK-01..03: emit one resource_link for the chunk; read errors throw
// above, so this branch is only reached on success (zero-link on error).
const rec = result as Record<string, unknown>;
const absPath = typeof rec.path === 'string' ? rec.path : (filePath as string);
const totalLines = typeof rec.total_lines === 'number' ? rec.total_lines : (typeof rec.end_line === 'number' ? rec.end_line : 0);
const description = `chunk ${rec.start_line}-${rec.end_line} of ${totalLines} lines`;
const resourceLinks: ResourceLink[] = absPath ? [buildResourceLink(absPath, description)] : [];
return createToolResponse(result, { resourceLinks });
```

**File size:** 535 -> 573 lines (+38 net). Under the 575 cap with 2 lines of headroom. Initial write landed at 578 (3 over cap); tightened by collapsing a 5-line comment and a 3-line ternary, landing at 573.

### 2. `test/mcp-resource-links.test.js` -- new file, 291 lines, 7 test cases

Node:test suite that drives `registerRetrievalTools()` directly with fake workspace + fake search services. A fake `registerJsonTool` captures handler functions into a `Map<string, {def, handler}>`, and `invokeHandler()` threads the captured handler's return value through the real `toolResult()` to produce the final `content[]` array for assertion.

**Why direct-registrar boot (not `registerAppTools`):** Phase 41 touches 3 tools out of 72. Isolating the test boot to `registerRetrievalTools` keeps the fake-services surface tiny (5 methods vs 60+) and makes any future failure point straight at the 3 handlers under test.

| # | Test | Asserts |
|---|------|---------|
| 1 | `read_file emits one resource_link with file:// uri, basename, description, and mimeType` | happy path: `content.length === 2`, `link.uri === 'file:///tmp/helper.ts'`, `link.name === 'helper.ts'`, `description` matches `chunk 10-80 of 320 lines`, `mimeType === 'text/typescript'` |
| 2 | `search_files dedupes 3 matches across 2 unique paths into 2 resource_links` | Set dedup: 3 input items (2 unique files) -> `content.length === 3` (text + 2 links), URIs sorted match `[auth.ts, login.ts]`, every description starts with `path match:` |
| 3 | `search_code dedupes 5 matches across 3 unique paths into 3 resource_links with counts` | Map dedup + counts: 5 input items across 3 files -> 3 links; `/tmp/a.ts` desc matches `3 matches for foo` (plural), `/tmp/b.ts` + `/tmp/c.go` match `1 match for foo` (singular); `c.go.mimeType === 'text/x-go'` |
| 4 | `search_code empty result emits zero resource_links -- content[] has only text` | zero-link branch: `searchCode` returns `[]` -> `content.length === 1`, `content[0].type === 'text'` |
| 5 | `read_file rejection produces zero resource_links -- control never reaches toolResult` | error branch: `readFileChunk` throws -> `assert.rejects(/path not found/)` -- handler never reaches `createToolResponse`, no link emitted |
| 6 | `getMimeTypeFromPath maps known extensions and returns undefined for unknown` | mime table: `.ts/.tsx -> text/typescript`, `.js -> text/javascript`, `.md -> text/markdown`, `.json -> application/json`, `.py -> text/x-python`, `.go -> text/x-go`, `.rs -> text/x-rust`, `.xyz -> undefined`, `'' -> undefined` |
| 7 | `read_file structuredContent.data preserves pre-Phase-41 shape (RLINK-03 backwards compat)` | structuredContent integrity: `data.path`, `data.start_line`, `data.end_line`, `data.total_lines`, `Array.isArray(data.lines)`, `typeof data.content === 'string'`, and explicitly asserts `data.resource_links === undefined` to guard against bleed-through |

## Commits

| Hash | Task | Message |
|------|------|---------|
| `6637f07` | 1 | feat(41-02): emit resource_link content blocks from 3 retrieval handlers |
| `15630f2` | 2 | test(41-02): add mcp-resource-links suite with 7 RLINK assertions |

## Verification Results

| Check | Status |
|-------|--------|
| `npm run build` (tsc, 0 errors) | PASS |
| `npm test` -- 172 pass / 0 fail / 0 skip (was 165) | PASS (+7 new) |
| `src/mcp/tools/retrieval.ts` <= 575 lines | PASS (573) |
| `test/mcp-resource-links.test.js` <= 300 lines | PASS (291) |
| `buildResourceLink` imported in retrieval.ts | PASS (4 mentions) |
| `ResourceLink` type imported in retrieval.ts | PASS (7 mentions) |
| `createToolResponse(result` happy paths | PASS (3 emissions: 1 read_file + 2 search) |
| `createToolResponse(results, { resourceLinks })` | PASS (2 emissions: search_files + search_code) |
| `RLINK-01` comment markers | PASS (3 -- one per handler) |
| `new Map<string, number>` dedup (search_code) | PASS (1) |
| `new Set<string>` dedup (search_files) | PASS (1) |
| Test file has >=7 `test()` calls | PASS (7) |
| Test imports `registerRetrievalTools` | PASS |
| Test imports from common barrel `../src/mcp/common/index.js` | PASS |
| Test asserts `file:///` URIs | PASS (6 occurrences) |
| Test asserts dedup behavior | PASS (4 `dedupes` mentions) |
| Test covers empty-result zero-link branch | PASS |
| Test covers error-path zero-link branch (assert.rejects) | PASS |
| Test asserts `structuredContent.data` no-drift | PASS (4 mentions) |
| Single-file test run: 7/7 pass | PASS |

## Phase 41 Close-Out

All three RLINK requirements are now complete:

| Requirement | Status | Covered by |
|-------------|--------|------------|
| **RLINK-01** (tools emit resource_link blocks) | DONE | Task 1 -- 3 handlers wired |
| **RLINK-02** (file:// URIs dereferenceable) | DONE | Plan 01's `buildResourceLink` produces `file://${path.resolve(p)}` |
| **RLINK-03** (text content preserved alongside) | DONE | toolResult appends links AFTER the text block; structuredContent unchanged (Test 7 locks this) |

**Aggregate Phase 41 metrics (Plans 01 + 02):**
- Files created: 2 (`src/mcp/common/mime.ts`, `test/mcp-resource-links.test.js`)
- Files modified: 3 (`src/mcp/common/tool-utils.ts`, `src/mcp/common/index.ts`, `src/mcp/tools/retrieval.ts`)
- Commits: 5 (3 feature + 1 test + 1 docs)
- Test baseline: 165 -> 172 (+7, zero failures)
- 3 file-returning MCP tools now RLINK-01..03 compliant
- Zero new runtime dependencies
- ROADMAP.md Phase 41 is ready to mark verification-pending.

## Deviations from Plan

**None that altered behavior.** One minor tightening during Task 1:

- **[Rule 3 -- Fix cap overrun]** Initial write of `read_file` block landed at 578 lines (3 over the 575 cap) because the plan's prescribed 5-line comment + 3-line `totalLines` ternary added 8 lines instead of the planned ~6. Collapsed the comment to 2 lines and the ternary to a single line, landing at 573 (2 lines headroom). Behavior is byte-identical; only whitespace/comment density changed. Retained the `RLINK-01..03` marker so the acceptance grep `grep -c "RLINK-01"` still returns 3.

No architectural changes. No Rule 1 bugs found. No Rule 4 decisions required.

## Known Stubs

None. Every `resource_link` emission site has a real data source wired: `workspace.readFileChunk()` for read_file, `search.searchFiles()` for search_files, `search.searchCode()` for search_code. Empty-result and error paths are intentional zero-link branches (locked by Tests 4 and 5) -- not stubs.

## Self-Check: PASSED

- File `src/mcp/tools/retrieval.ts` -- FOUND (modified, 573 lines)
- File `test/mcp-resource-links.test.js` -- FOUND (new, 291 lines)
- Commit `6637f07` -- FOUND
- Commit `15630f2` -- FOUND
- Build -- PASSES (tsc, 0 errors)
- Tests -- 172/172 PASS (165 baseline preserved + 7 new)
- retrieval.ts line cap -- PASS (573 <= 575)
- test file line cap -- PASS (291 <= 300)
- All 10 Task-1 acceptance greps -- PASS
- All 12 Task-2 acceptance greps -- PASS
