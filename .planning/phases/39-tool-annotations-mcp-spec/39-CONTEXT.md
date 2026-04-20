# Phase 39: Tool Annotations (MCP Spec) - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning
**Mode:** Smart discuss (accept-all on single grey area)

<domain>
## Phase Boundary

Every one of the 72 registered MCP tools exposes accurate `readOnlyHint`,
`destructiveHint`, and `idempotentHint` annotations matching its actual
behavior, and a test validates the full mapping so future additions cannot
drift.

Out of scope: tool behavior changes, new tools, schema changes, `openWorldHint`
semantics beyond what is already set.

</domain>

<decisions>
## Implementation Decisions

### Annotation Test Strategy
- Test file: `test/mcp-annotations.test.js` (new file, sibling to
  `test/mcp-tools.test.js`) using `node:test` and the existing
  `makeFakeServer()` pattern.
- Expected annotations live as a hardcoded map: `{ toolName: { readOnlyHint,
  destructiveHint, idempotentHint } }` covering all 72 tools. The test fails
  if any registered tool is missing from the map or has a mismatch.
- Test drives the same register-app-tools pipeline end-to-end so it catches
  drift across every tool-registration file.

### Scope of Source Changes
- All 72 tools already have `annotations` blocks. Walk every tool registration
  once with the test to verify correctness; fix any mismatches inline where
  found (e.g. a "delete" tool accidentally marked `destructiveHint: false`).
- Keep the `readOnlyAnnotations` helper in `graph-tools.ts`; if more read-only
  tools appear across files, lift it to `src/mcp/common/tool-utils.ts` as a
  shared constant (`READ_ONLY_ANNOTATIONS`, `WRITE_ANNOTATIONS`,
  `DELETE_ANNOTATIONS`).

### Categorization Rules (ground truth)
- Read-only (`readOnlyHint: true`, `destructiveHint: false`, `idempotentHint:
  true`): search, get, list, status, find, help, stats, recall, timeline,
  tree, query, as_of, read_file, health, whats_new, usage_guide,
  server_status, hooks_list_events, hooks_stats.
- Write/additive (`readOnlyHint: false`, `destructiveHint: false`,
  `idempotentHint: false`): store, add_entity, add_triple, ingest, capture,
  teach, update, embed_status, kg_backfill_links, kg_invalidate, project_backfill.
- Destructive (`readOnlyHint: false`, `destructiveHint: true`, `idempotentHint:
  true`): every `*_delete*` tool and `update_self` (replaces content).
- Idempotent writes get `idempotentHint: true` only when repeating the call
  with identical inputs is a no-op (e.g. `kg_add_triple` when dedup returns
  existing id).

### openWorldHint
- Keep whatever value each tool already has. Not part of ANNOT-01..03, out of
  scope for this phase.

### Claude's Discretion
- Decide per tool whether `idempotentHint` is true based on actual dedup /
  upsert semantics.
- Choose whether to lift shared annotation constants to `tool-utils.ts` based
  on how many duplicates exist after the audit.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `createJsonToolRegistrar()` in `src/mcp/common/tool-utils.ts:164` already
  accepts `annotations` on every `ToolDefinition` and forwards them to
  `server.registerTool()`. No wrapper change needed.
- `readOnlyAnnotations` constant in `src/mcp/tools/graph-tools.ts:42` is the
  pattern to generalize.
- `test/mcp-tools.test.js` has a `makeFakeServer()` helper that captures every
  `registerTool(name, meta, handler)` call — perfect for annotation assertions.
- `src/app/register-tools.ts` is the single entry point that registers all 72
  tools via the per-module `registerXxxTools({ registerJsonTool, ... })`
  helpers.

### Established Patterns
- Tool registration is module-scoped (`core.ts`, `memory-store.ts`,
  `retrieval.ts`, `graph-tools.ts`, `memory-workflow.ts`, `kg-delete-tools.ts`,
  `backfill-tools.ts`, `find-tools.ts`, `audit-tools.ts`, `symbol-tools.ts`).
- Current file breakdown:
  - core.ts: 6 tools
  - backfill-tools.ts: 1
  - audit-tools.ts: 1
  - find-tools.ts: 1
  - graph-tools.ts: 22 (5 via `readOnlyAnnotations` helper)
  - kg-delete-tools.ts: 3
  - memory-store.ts: 13
  - memory-workflow.ts: 7
  - retrieval.ts: 14
  - symbol-tools.ts: 4
  - Total: 72
- Tests live under `test/*.test.js` and run via `npm test` (`tsx --test`).

### Integration Points
- No runtime integration required — annotations flow from
  `createJsonToolRegistrar` straight through to the MCP SDK's `registerTool`.
- Test hooks into existing `registerAppTools(server, runtime, services)`
  wiring, uses fake services, and reads back the captured `meta.annotations`
  from the fake server.

</code_context>

<specifics>
## Specific Ideas

- The hardcoded expected-annotation map in the test should be sorted
  alphabetically so diffs are reviewable.
- Fail fast: the test should print the full list of mismatches in one run,
  not stop on first failure.
- Don't add `destructiveHint: true` to any write tool — only `*_delete*` and
  `update_self` are destructive per the ANNOT-02 rule.

</specifics>

<deferred>
## Deferred Ideas

- `openWorldHint` audit — saved for a future phase; not part of ANNOT-01..03.
- Lifting `readOnlyAnnotations` to shared `tool-utils.ts` is optional — do it
  only if three or more helpers would otherwise be duplicated after the audit.
- Runtime assertion (dev-mode warn on annotation mismatches) — out of scope;
  test-time validation is enough.

</deferred>
