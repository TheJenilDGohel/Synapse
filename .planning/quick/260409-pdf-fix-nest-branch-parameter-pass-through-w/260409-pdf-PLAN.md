---
phase: quick-260409-pdf
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/mcp/tools/memory-store.ts
  - src/mcp/tools/memory-workflow.ts
  - src/services/memory/workflow.ts
  - src/services/memory/events/capture.ts
  - src/services/memory/store/entries.ts
  - test/memory-nest-branch-wiring.test.js
autonomous: true
requirements:
  - QUICK-260409-PDF-BUG1
  - QUICK-260409-PDF-BUG2
  - QUICK-260409-PDF-BUG3

must_haves:
  truths:
    - "Agent calling synapse_memory_store with {nest, branch} persists those exact strings into memory_entries.nest and memory_entries.branch"
    - "Agent calling synapse_memory_capture_event with {nest, branch} persists those exact strings on the promoted memory row"
    - "Agent calling synapse_capture_outcome with {nest, branch} persists those exact strings on the promoted memory row"
    - "When nest is omitted and scope.project_path is an absolute filesystem path, the stored nest is path.basename(project_path) — NOT the full absolute path"
    - "When branch is omitted, the stored branch falls back to scope.branch_name (sanitized, slashes stripped) rather than topic"
    - "Existing callers that do not pass nest/branch see no response-shape changes; only the stored fallback value changes from absolute path to basename"
  artifacts:
    - path: "src/mcp/tools/memory-store.ts"
      provides: "MCP tool schemas for synapse_memory_store and synapse_memory_capture_event exposing optional nest and branch fields"
      contains: "nest: z.string().max(200).optional()"
    - path: "src/mcp/tools/memory-workflow.ts"
      provides: "MCP tool schema for synapse_capture_outcome exposing optional nest and branch fields"
      contains: "nest: z.string().max(200).optional()"
    - path: "src/services/memory/workflow.ts"
      provides: "captureOutcome forwards input.nest and input.branch into captureEvent payload"
      contains: "nest: input.nest"
    - path: "src/services/memory/events/capture.ts"
      provides: "captureEvent forwards input.nest and input.branch into storeEntry payload"
      contains: "nest: input.nest"
    - path: "src/services/memory/store/entries.ts"
      provides: "storeEntry fallback derives nest from path.basename(project_path) and branch from scope.branch_name, both sanitized"
      contains: "path.basename"
    - path: "test/memory-nest-branch-wiring.test.js"
      provides: "Regression tests for explicit pass-through and basename fallback"
  key_links:
    - from: "MCP schema in memory-store.ts/memory-workflow.ts"
      to: "storeEntry in src/services/memory/store/entries.ts"
      via: "args forwarded through memory service -> captureEvent -> storeEntry"
      pattern: "nest: input.nest"
    - from: "storeEntry fallback"
      to: "memory_entries.nest column"
      via: "INSERT bound param"
      pattern: "path.basename.*project_path"
---

<objective>
Fix the three nest/branch parameter pass-through bugs that leave `memory_entries.nest` and `memory_entries.branch` empty for every capture path, which in turn makes `nest_tree` and `graph_bridges` return zero rows despite 64 live memories.

Purpose: Unblock the `nest_tree` and `graph_bridges` MCP tools on existing writes going forward, without waiting for Phase 34 SLIM-07 (auto-inference) or Phase 35 (backfill). This is pure wiring — the storage columns, migrations, indexes, and downstream queries already work; the values just never arrive.

Output:
- `nest` and `branch` added as optional string fields on the three MCP tool schemas so agents can set them
- `captureOutcome` in workflow.ts forwards `input.nest`/`input.branch` into its `captureInput`
- `captureEvent` in events/capture.ts forwards `input.nest`/`input.branch` into its `storeEntry` call
- `storeEntry` fallback no longer writes absolute filesystem paths; uses `path.basename(project_path)` for nest and sanitized `scope.branch_name` for branch
- Regression test asserts all three behaviors
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md

@src/mcp/tools/memory-store.ts
@src/mcp/tools/memory-workflow.ts
@src/services/memory/workflow.ts
@src/services/memory/events/capture.ts
@src/services/memory/store/entries.ts
@src/services/memory/types.ts
@test/memory-store.test.js

<interfaces>
<!-- Key contracts the executor needs. Already-verified against current code. -->
<!-- No codebase exploration required. -->

From src/services/memory/types.ts (StoreEntryInput — lines ~150-169):
```ts
export interface StoreEntryInput {
  kind?: string;
  title?: string;
  summary?: string;
  content: string;
  status?: string;
  importance?: number;
  confidence?: number;
  tags?: string[];
  links?: Link[];
  scope?: ScopeInput;
  nest?: string;     // already typed — only the wiring is missing
  branch?: string;   // already typed — only the wiring is missing
  agent_id?: string;
  source_type?: string;
  source_ref?: string;
  // ...
}
```

From src/services/memory/types.ts (CaptureEventInput — lines ~260-280):
```ts
export interface CaptureEventInput {
  event_type?: string;
  // ...
  scope?: ScopeInput;
  nest?: string;     // already typed — only the wiring is missing
  branch?: string;   // already typed — only the wiring is missing
  source_ref?: string;
  // ...
}
```

VERIFIED file facts (do NOT re-read to confirm):

1. src/mcp/tools/memory-store.ts
   - `synapse_memory_store` registerJsonTool block at lines 121-158; inputSchema block lines 126-140; MISSING nest/branch
   - `synapse_memory_capture_event` registerJsonTool block at lines 214-243; inputSchema block lines 219-234; MISSING nest/branch
   - File total lines: 357. Adding 4 lines keeps it well under 500.

2. src/mcp/tools/memory-workflow.ts
   - `synapse_capture_outcome` registerJsonTool block at lines 132-167; inputSchema block lines 137-158; MISSING nest/branch
   - File total lines: 168. Adding 2 lines keeps it well under 500.

3. src/services/memory/workflow.ts
   - `captureOutcome` method at lines 146-214 builds a fresh `captureInput` object at lines 179-204
   - That object currently has no `nest`/`branch` keys, so even if an MCP caller supplies them, they get dropped before reaching `captureEvent`
   - Fix: add `nest: input.nest as string | undefined,` and `branch: input.branch as string | undefined,` to the captureInput object (place them next to `scope:` for readability)

4. src/services/memory/events/capture.ts
   - File total lines: 182
   - `storeEntry` call at lines 127-141 is the non-merge promotion path
   - Already reads `input.nest` at line 84 for dedup but does NOT pass `input.nest`/`input.branch` into `storeEntry`
   - Fix: add `nest: input.nest,` and `branch: input.branch,` to the storeEntry call (alongside the other scope-adjacent fields)

5. src/services/memory/store/entries.ts
   - File total lines: 344
   - Current fallback (lines 152-153):
     ```ts
     const nest = cleanString(input.nest || scope.project_path || '', 200);
     const branch = cleanString(input.branch || scope.topic || '', 200);
     ```
   - Bug: `scope.project_path` is an absolute filesystem path like
     `/mnt/da2ae3dd-9788-4b37-88e8-effd7025eb4c/Base Projects/synapse` — every project has a different full path so grouping is impossible
   - `path` module is NOT yet imported in this file; `fs` is imported from `node:fs` at line 1
   - `scope.branch_name` is available on the normalized scope (see normalizeScope in ../utils.js)

From package.json:
- `"test": "tsx --test"` — runs all test/**/*.test.js (and .ts) files
- `"build": "tsc"` — DO NOT run build per constraints
- Existing test convention: `.test.js` (plain JavaScript, ESM) in /test/ using node:test + node:assert/strict
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Expose nest and branch on the three MCP tool input schemas (Bug 1)</name>
  <files>src/mcp/tools/memory-store.ts, src/mcp/tools/memory-workflow.ts</files>
  <action>
    Agents calling through MCP cannot currently set `nest` or `branch` because the zod `inputSchema` blocks for three tools do not list them. Add them as optional, max-200-char strings matching the cleanString cap used by storeEntry.

    **Edit 1 — `src/mcp/tools/memory-store.ts`:**

    A) In the `synapse_memory_store` tool block (registerJsonTool call starting at line 121), inside the `inputSchema: { ... }` object (lines 126-140), add two new entries just after the existing `scope: MEMORY_SCOPE_SCHEMA,` line:
    ```ts
    nest: z.string().max(200).optional(),
    branch: z.string().max(200).optional(),
    ```

    B) In the `synapse_memory_capture_event` tool block (registerJsonTool call starting at line 214), inside the `inputSchema: { ... }` object (lines 219-234), add the same two entries just after the existing `scope: MEMORY_SCOPE_SCHEMA,` line:
    ```ts
    nest: z.string().max(200).optional(),
    branch: z.string().max(200).optional(),
    ```

    No other changes in this file. The handlers already spread `args` through to the underlying service methods (see `memory.storeEntry(args)` at line 149 and `memory.captureEvent(args)` at line 242), so once the schema accepts the fields, zod will pass them through untouched.

    **Edit 2 — `src/mcp/tools/memory-workflow.ts`:**

    In the `synapse_capture_outcome` tool block (registerJsonTool call at line 132), inside the `inputSchema: { ... }` object (lines 137-158), add two new entries just after the existing `feature: z.string().optional(),` line (line 156):
    ```ts
    nest: z.string().max(200).optional(),
    branch: z.string().max(200).optional(),
    ```

    No other changes — the handler already calls `memoryWorkflow.captureOutcome(args)` which is wired up in Task 2.

    **Why not also add agent_id, status, etc.?** Out of scope. We're ONLY unblocking nest_tree and graph_bridges. Resist the urge to cleanup adjacent schemas.

    **Rationale for `.optional()` (not `.default('')`):** An empty string default would hide the "not provided" case from the server-side fallback logic in Task 3 — we need `undefined` to trigger the basename derivation. Match the existing `importance?: number | undefined` pattern used elsewhere in these schemas.
  </action>
  <verify>
    <automated>grep -n "nest: z.string().max(200).optional()" "src/mcp/tools/memory-store.ts" "src/mcp/tools/memory-workflow.ts" | wc -l</automated>
  </verify>
  <done>
    - `grep` above returns `3` (two hits in memory-store.ts + one hit in memory-workflow.ts)
    - `grep -n "branch: z.string().max(200).optional()"` across both files also returns 3 matches
    - No other lines in either file modified
    - Neither file exceeds 500 lines (memory-store.ts was 357, memory-workflow.ts was 168)
  </done>
</task>

<task type="auto">
  <name>Task 2: Forward nest and branch through captureOutcome and captureEvent (Bug 2)</name>
  <files>src/services/memory/workflow.ts, src/services/memory/events/capture.ts</files>
  <action>
    Even after Task 1 makes the schemas accept `nest`/`branch`, the values still get dropped at two intermediate layers. Fix both.

    **Edit 1 — `src/services/memory/workflow.ts` (captureOutcome method):**

    The `captureOutcome` method at lines 146-214 builds a fresh `captureInput` object at lines 179-204 and passes it to `this.memory.captureEvent(captureInput)`. It does NOT currently forward `input.nest`/`input.branch`, so even an agent that supplies them via the new schema from Task 1 will see them discarded.

    Inside that captureInput object literal (between `scope: { ... }` at line 196-202 and `source_ref: ...` at line 203), add:
    ```ts
    nest: input.nest as string | undefined,
    branch: input.branch as string | undefined,
    ```

    Place them immediately after the closing `},` of the `scope` sub-object and before the `source_ref` field, to match the ordering already used by the CaptureEventInput interface in types.ts.

    **Edit 2 — `src/services/memory/events/capture.ts` (captureEvent function):**

    The `captureEvent` function already reads `input.nest` at line 84 for the dedup check, which proves this layer KNOWS about nest. But the `storeEntry` call at lines 127-141 in the non-merge promotion path does not forward it.

    In the storeEntry call (lines 127-141), add two lines inside the object literal. Place them after `scope,` (line 137) and before `source_type: 'capture-event',` (line 138):
    ```ts
    nest: input.nest,
    branch: input.branch,
    ```

    Do NOT add them to the `updateEntry` merge-target path (lines 105-123) — that's the merge branch and merge semantics for nest/branch are out of scope for this quick task (merge target already has its own nest/branch from the prior insert).

    **Do NOT touch:** the dedup call at line 83-87 (already correct), the memory_events INSERT at lines 148-172 (memory_events table is a separate audit log; no nest/branch columns exist there per current schema — confirmed via grep of schema.ts).

    **Type safety:** The `CaptureEventInput` interface in `src/services/memory/types.ts` lines 274-275 already declares `nest?: string; branch?: string;` — no type changes needed.
  </action>
  <verify>
    <automated>grep -c "nest: input.nest" "src/services/memory/workflow.ts" "src/services/memory/events/capture.ts"</automated>
  </verify>
  <done>
    - workflow.ts contains exactly one `nest: input.nest as string | undefined,` line inside captureOutcome's captureInput literal
    - workflow.ts contains exactly one matching `branch: input.branch as string | undefined,` line
    - events/capture.ts contains exactly one NEW `nest: input.nest,` inside the storeEntry call at lines ~127-141 (the pre-existing `nest: input.nest,` at line 84 inside checkDuplicate stays unchanged — so grep count for workflow.ts is 1 and for capture.ts is 2 total)
    - events/capture.ts contains exactly one new `branch: input.branch,` line inside the storeEntry call
    - Neither file exceeds 500 lines (workflow.ts ~216, capture.ts ~184 after edits)
    - No changes to the merge-target `updateEntry` path in capture.ts
  </done>
</task>

<task type="auto">
  <name>Task 3: Fix storeEntry fallback to derive nest basename and sanitize branch (Bug 3)</name>
  <files>src/services/memory/store/entries.ts</files>
  <action>
    The fallback at `src/services/memory/store/entries.ts` lines 152-153 currently writes absolute filesystem paths into `memory_entries.nest`:
    ```ts
    const nest = cleanString(input.nest || scope.project_path || '', 200);
    const branch = cleanString(input.branch || scope.topic || '', 200);
    ```

    Two bugs:
    1. `scope.project_path` is an absolute path like `/mnt/da2ae3dd-.../Base Projects/synapse` — grouping by that is useless because every install has a different absolute path. We want the project basename (`synapse`).
    2. `scope.topic` is a semantic topic (e.g. "auth") that's already handled elsewhere — the natural fallback for `branch` is `scope.branch_name` (the git branch), not topic.

    **Edit — `src/services/memory/store/entries.ts`:**

    1) At the top of the file (after line 1's `import fs from 'node:fs';`), add:
    ```ts
    import path from 'node:path';
    ```

    2) Replace lines 152-153 with:
    ```ts
    const rawNestFallback = scope.project_path ? path.basename(scope.project_path) : '';
    const rawBranchFallback = (scope.branch_name || scope.topic || '').replace(/[/\\]/g, '-');
    const nest = cleanString(input.nest || rawNestFallback, 200);
    const branch = cleanString(input.branch || rawBranchFallback, 200);
    ```

    **Why this exact shape:**
    - `path.basename` of an empty string returns `''`, so guard with the ternary to avoid `path.basename('')` noise.
    - Branch fallback chain: explicit `input.branch` > `scope.branch_name` (the actual git branch) > `scope.topic` (legacy compat with existing callers) > empty string. The legacy `scope.topic` fallback is retained so we don't break the current 7 manual memories' rehydration path — topic was the old fallback and some callers may depend on it.
    - `replace(/[/\\]/g, '-')` strips slashes so a git branch name like `release/0.2.0` becomes `release-0.2.0` — important because `graph_bridges` groups by exact string match and slashes in a "branch" column are confusing on read. This mirrors standard git ref sanitization used throughout the codebase.
    - `cleanString(..., 200)` preserves the existing 200-char cap and whitespace normalization.

    **Do NOT touch:**
    - The `updateEntry` function at lines 248-330 — its `nest`/`branch` handling at lines 277-278 uses `patch.nest ?? existing.nest` which is correct (preserves existing values on update). Fixing updateEntry's fallback would break the contract that unspecified patch fields don't mutate the row.
    - The `scope.project_path` writes to `scope_project_path` column at line 221 — that column intentionally stores the absolute path and is the canonical identifier. We're only fixing the `nest` column's derivation.

    **File size check:** entries.ts is 344 lines. Adding 3 net lines keeps it at 347, well under the 500-line CLAUDE.md cap.
  </action>
  <verify>
    <automated>grep -n "path.basename(scope.project_path)" "src/services/memory/store/entries.ts"</automated>
  </verify>
  <done>
    - `import path from 'node:path';` appears as line 2 (or adjacent to the `import fs` line)
    - The exact string `path.basename(scope.project_path)` appears exactly once in entries.ts
    - The old literal `scope.project_path || ''` inside the `nest` fallback is gone
    - The old `scope.topic` remains only as part of the `branch` fallback chain (after `scope.branch_name`)
    - `grep -n "replace(/\[/\\\\\]/g"` returns one match inside storeEntry (branch sanitization)
    - `updateEntry` function (lines ~248-330) is unchanged — its `patch.nest ?? existing.nest ?? ''` fallback still works
    - entries.ts total line count is <= 350
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Regression tests for pass-through and basename fallback</name>
  <files>test/memory-nest-branch-wiring.test.js</files>
  <behavior>
    Test 1 — explicit pass-through via MemoryStore.storeEntry:
      - Given: storeEntry called with { nest: 'synapse', branch: 'release/0.2.0', content: 'x', title: 't', scope: { project_path: '/tmp/foo' } }
      - Expect: listEntries (or getEntry) returns row with nest === 'synapse' and branch === 'release/0.2.0'
      - Note: we pass 'release/0.2.0' explicitly — the explicit path should preserve slashes as-is (cleanString only trims, doesn't replace slashes). Sanitization only fires on the fallback path.

    Test 2 — explicit pass-through via MemoryStore.captureEvent:
      - Given: captureEvent called with { event_type: 'task', status: 'completed', title: 't', content: 'something meaningful to clear the promotion threshold blah blah', nest: 'my-nest', branch: 'my-branch', scope: { project_path: '/tmp/foo' }, importance: 90 }
      - Expect: result.status === 'promoted', then listEntries returns a row with nest === 'my-nest' and branch === 'my-branch'
      - Use high importance to force promotion past the threshold deterministically
      - If the event doesn't promote (status !== 'promoted'), skip the row assertion with a t.diagnostic so the test doesn't become flaky on threshold changes

    Test 3 — basename fallback when nest is omitted:
      - Given: storeEntry called with { content: 'y', title: 't2', scope: { project_path: '/mnt/da2ae3dd-9788-4b37-88e8-effd7025eb4c/Base Projects/synapse', branch_name: 'release/0.2.0' } } and NO explicit nest/branch
      - Expect: getEntry / listEntries returns row with nest === 'synapse' (NOT the full path) and branch === 'release-0.2.0' (slashes replaced with hyphens)

    Test 4 — branch slash sanitization only on fallback, not on explicit input:
      - Given: storeEntry with explicit branch: 'feature/foo/bar'
      - Expect: stored branch === 'feature/foo/bar' (unchanged — slashes only get stripped on the fallback path)

    All tests must skip gracefully via hasSupportedBackend() pattern when node:sqlite is unavailable, matching existing test/memory-store.test.js convention.

    NO tests for the merge path, dedup, embedding service, or updateEntry — out of scope.
  </behavior>
  <action>
    Create a new file at `test/memory-nest-branch-wiring.test.js`. Use the same imports and helpers as the existing `test/memory-store.test.js`:

    ```js
    import test from 'node:test';
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import path from 'node:path';
    import os from 'node:os';
    import { MemoryStore } from '../src/services/memory/index.js';

    function makeTempDir() {
      return fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-nest-branch-test-'));
    }

    async function hasSupportedBackend() {
      try {
        const mod = await import('node:sqlite');
        if (mod?.DatabaseSync) return true;
      } catch {}
      return false;
    }
    ```

    Write one `test(...)` per behavior listed above (4 tests total). Each test:
    1. Creates its own tempDir + MemoryStore instance (isolation)
    2. Calls `store.storeEntry(...)` or `store.captureEvent(...)`
    3. Asserts via `store.listEntries({ projectPath: '...' })` OR `store.getEntry(id)` that the `nest` and `branch` columns hold the expected values
    4. `fs.rmSync(root, { recursive: true, force: true })` at the end

    **Important — how to read stored nest/branch:**
    Looking at `src/services/memory/store/entries.ts` lines 97-107, `listEntries` already selects `nest, branch` and `deserializeEntry` should map them. If the deserialized entry object doesn't expose them as top-level `item.nest`/`item.branch`, fall back to querying via `getEntry(id)` which selects `SELECT *` at line 122 — the raw row will include the columns. If still not exposed, use the MemoryStore's underlying adapter directly:
    ```js
    const row = await store.adapter.get('SELECT nest, branch FROM memory_entries WHERE id = ?', [id]);
    assert.equal(row.nest, 'synapse');
    ```
    The `adapter` is public on the MemoryStoreLike interface (see entries.ts line 18 and test/memory-store.test.js passim).

    **Promotion threshold reliability for Test 2:** `computeSignalScore` in events/heuristics.ts multiplies importance into the signal — passing `importance: 90` plus `status: 'completed'` and a task event type should reliably clear the default threshold. If the test becomes flaky, use `t.diagnostic(...)` to log `result.status` and `t.skip()` rather than failing, so the wiring fix is never blocked by unrelated heuristic tuning.

    **Do NOT:**
    - Create an MCP server instance or exercise the zod schemas end-to-end — Task 1's changes are verified by the grep in Task 1's `<verify>`. End-to-end MCP tests are expensive and covered by test/mcp-tools.test.js for schema registration.
    - Test the merge path, dedup, or updateEntry behavior.
    - Create a `.ts` test file. Convention is `.test.js` plain ESM (see existing test/memory-store.test.js).
    - Save test file anywhere other than /test per CLAUDE.md "Use /tests for test files" (project uses /test singular — follow existing convention, do NOT create a /tests directory).

    Keep the file under 200 lines total.
  </action>
  <verify>
    <automated>npx tsx --test test/memory-nest-branch-wiring.test.js 2>&1 | tail -20</automated>
  </verify>
  <done>
    - File `test/memory-nest-branch-wiring.test.js` exists
    - `npx tsx --test test/memory-nest-branch-wiring.test.js` exits 0
    - All 4 tests pass (or skip gracefully if node:sqlite unavailable on this runtime)
    - Test output shows `# pass 4` (or `# pass N # skip M` with N+M === 4)
    - File is under 200 lines
    - Full suite sanity check: `npx tsx --test test/memory-store.test.js test/memory-nest-branch-wiring.test.js` shows no regressions in the existing memory-store.test.js
  </done>
</task>

</tasks>

<verification>
**Goal-backward verification — each truth must be demonstrable after execution:**

1. **Agent-supplied nest/branch persists via memory_store:**
   - `grep -n "nest: z.string().max(200).optional()" src/mcp/tools/memory-store.ts` shows the field inside the memory_store inputSchema block
   - Test 1 in task 4 asserts the storeEntry code path writes the exact string to the column

2. **Agent-supplied nest/branch persists via memory_capture_event:**
   - `grep -n "nest: z.string().max(200).optional()" src/mcp/tools/memory-store.ts` shows the field inside the memory_capture_event inputSchema block (second hit)
   - `grep -n "nest: input.nest" src/services/memory/events/capture.ts` shows the pass-through to storeEntry (in addition to the pre-existing line 84 in checkDuplicate — total count 2)
   - Test 2 in task 4 asserts the captureEvent promotion path writes the values

3. **Agent-supplied nest/branch persists via capture_outcome:**
   - `grep -n "nest: z.string().max(200).optional()" src/mcp/tools/memory-workflow.ts` shows the field inside the capture_outcome inputSchema block
   - `grep -n "nest: input.nest" src/services/memory/workflow.ts` shows the pass-through inside captureOutcome's captureInput literal
   - End-to-end: captureOutcome -> captureEvent -> storeEntry all now forward nest/branch

4. **Basename fallback when project_path is absolute and nest is omitted:**
   - `grep -n "path.basename(scope.project_path)" src/services/memory/store/entries.ts` shows exactly one hit
   - Test 3 in task 4 asserts `/mnt/...synapse` becomes `nest: 'synapse'` in the stored row
   - Test 3 also asserts `release/0.2.0` becomes `branch: 'release-0.2.0'` when branch is omitted

5. **Backwards compat — explicit values are NOT re-sanitized:**
   - Test 4 in task 4 asserts explicit `branch: 'feature/foo/bar'` survives intact (cleanString only trims, doesn't replace slashes on explicit input)
   - No changes to response shapes — normalizers in src/mcp/common/response-normalizers.ts are untouched
   - No changes to memory_events INSERT or schema migrations

6. **Existing test suite does not regress:**
   - `npx tsx --test test/memory-store.test.js` passes (nest/branch columns already existed; we only fixed the derivation)
   - `npx tsx --test test/memory-workflow-service.test.js` passes (captureOutcome now accepts more fields but doesn't require them)

7. **Constraint compliance:**
   - No `npm run build` invocation per "dont build app until prompted" rule
   - No new runtime dependencies (only node:path which is built-in)
   - No new documentation files created beyond the mandatory SUMMARY.md at the end
   - All modified files stay under 500 lines (memory-store.ts ~361, memory-workflow.ts ~170, workflow.ts ~218, capture.ts ~184, entries.ts ~347)
   - No existing memory data modified — only forward-going writes are fixed. Backfill remains Phase 35.
</verification>

<success_criteria>
All four tasks complete, with:

1. Three MCP tool schemas (`synapse_memory_store`, `synapse_memory_capture_event`, `synapse_capture_outcome`) now declare `nest` and `branch` as optional z.string().max(200) fields
2. `captureOutcome` in workflow.ts forwards `input.nest`/`input.branch` into the captureInput payload
3. `captureEvent` in events/capture.ts forwards `input.nest`/`input.branch` into the storeEntry call (non-merge path only)
4. `storeEntry` in store/entries.ts derives `nest` from `path.basename(scope.project_path)` when no explicit nest is provided, and derives `branch` from `scope.branch_name` (falling back to `scope.topic` for legacy compat), with slashes replaced by hyphens on the fallback only
5. Regression test file `test/memory-nest-branch-wiring.test.js` exists with 4 tests and `npx tsx --test test/memory-nest-branch-wiring.test.js` exits 0
6. `npx tsx --test test/memory-store.test.js` still exits 0 (no regression)
7. No file modified exceeds 500 lines
8. No new runtime dependencies added
9. No documentation files created beyond SUMMARY.md
10. `git diff --stat` shows exactly 6 files touched (5 src edits + 1 new test file)

**Non-goals explicitly rejected (do NOT implement):**
- Auto-inference of nest/branch from content or project heuristics — that is Phase 34 SLIM-07
- Backfill of existing 64 memory rows to populate empty nest/branch — that is Phase 35
- Changes to memory_events table (audit log has no nest/branch columns, intentionally)
- Changes to updateEntry fallback semantics (would break patch-ignores-unspecified contract)
- Changes to nest_tree / graph_bridges SQL — those queries already work, they just had no data to query
- MCP end-to-end tests exercising the zod schemas (covered by existing test/mcp-tools.test.js schema-registration tests)
</success_criteria>

<output>
After completion, create `.planning/quick/260409-pdf-fix-nest-branch-parameter-pass-through-w/260409-pdf-SUMMARY.md` following the standard GSD quick task summary template.
</output>
