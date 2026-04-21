# Phase 40: Structured Output (MCP Spec) - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning
**Mode:** Smart discuss (accept-all on both grey areas)

<domain>
## Phase Boundary

Every MCP tool declares a typed `outputSchema` (no more generic `z.any()`)
derived from a shared archetype library, and the existing
`structuredContent`/`content` dual response shape is preserved for backwards
compatibility. A test validates that every tool's declared schema matches an
approved archetype and that the runtime response continues to populate
`structuredContent.data` and `structuredContent.meta`.

Out of scope: response shape redesign, new tool outputs, markdown renderer
changes, response_format semantics.

</domain>

<decisions>
## Implementation Decisions

### Schema Strictness — Archetype-Based (Accepted)
- Define 6-8 schema archetypes in `src/mcp/common/schemas.ts` covering the 72
  tools, not one bespoke schema per tool. Realistic scope, type-safe enough,
  co-locates with existing shared schemas.
- Archetype categories (initial proposal — planner refines):
  - `SEARCH_RESULT_SCHEMA` — paginated items + filter metadata (retrieval,
    find, symbol tools)
  - `ENTITY_RESULT_SCHEMA` — single or list of KG entities
  - `TRIPLE_RESULT_SCHEMA` — single or list of KG triples with temporal fields
  - `STATUS_RESULT_SCHEMA` — server/runtime/index status shapes
  - `BATCH_RESULT_SCHEMA` — `{ created, duplicates, errors }` summary
  - `MEMORY_RESULT_SCHEMA` — memory entries with revision/link metadata
  - `ACK_RESULT_SCHEMA` — `{ id, ok }` minimal write acknowledgements
  - `FREEFORM_RESULT_SCHEMA` — intentional escape hatch (`z.any()` with a
    note) for usage guides, help, audit reports
- Every archetype is wrapped as `{ data: <archetype>, meta: z.object(...) }`
  to match the existing `toolResult()` envelope at
  `src/mcp/common/tool-utils.ts:142-146`.

### Schema Location — `src/mcp/common/schemas.ts` (Accepted)
- New archetypes export from `src/mcp/common/schemas.ts` next to existing
  `MEMORY_KIND_SCHEMA`, `MEMORY_SCOPE_SCHEMA`, etc.
- `createJsonToolRegistrar()` at `src/mcp/common/tool-utils.ts:223` accepts an
  optional `outputSchema` in the `ToolDefinition` and falls back to the
  existing generic `{ data: z.any(), meta: z.any().optional() }` only when
  the caller intentionally passes `FREEFORM_RESULT_SCHEMA`.
- Each `registerXxxTools` function passes the right archetype per tool via
  a new optional `outputSchema` field on `ToolDefinition`.

### Test Coverage — Extend `mcp-annotations.test.js` (Accepted)
- Extend `test/mcp-annotations.test.js` (or rename to
  `test/mcp-tool-metadata.test.js` if scope warrants) with a second set of
  assertions driven by a hardcoded `EXPECTED_OUTPUT_SCHEMAS` map:
  `{ toolName: 'SEARCH_RESULT' | 'ENTITY_RESULT' | ... }`.
- The test resolves each tool's `meta.outputSchema` via identity comparison
  against the archetype export set (e.g.
  `assert.strictEqual(meta.outputSchema.data, SEARCH_RESULT_SCHEMA)`).
- A second assertion calls `toolResult({ foo: 'bar' }, 'json', 'Test')` once
  and verifies the returned object has both `structuredContent.data` and
  `content[0].text` — guards STRUCT-01 plumbing continuity at the unit level.
- Collect-all-mismatches-into-array-fail-once pattern, same shape as the
  annotation assertions from Phase 39.

### Backwards Compatibility — Preserved (Accepted)
- The dual `structuredContent` + `content` return from `toolResult()` is
  already correct — it stays unchanged. STRUCT-03 is about not breaking the
  existing `response_format: "json"` default, which is already handled.
- Existing tests (`test/mcp-tools.test.js`, `test/terse-response.test.js`,
  etc.) must stay green. The test suite as a whole must pass unchanged count
  plus the new assertions.

### Claude's Discretion
- Exact archetype list size (6-8 target; planner picks the smallest set that
  covers every tool without losing useful typing).
- Whether to split `EXPECTED_OUTPUT_SCHEMAS` into a separate test file or
  grow the existing annotations test. Growing the existing file is preferred
  unless the combined test exceeds ~500 lines.
- Whether `FREEFORM_RESULT_SCHEMA` is the same object as the current
  `{ data: z.any(), meta: z.any().optional() }` or a deliberately named
  alias. Naming matters for grep-ability in the test.
- Meta shape — whether to type `schema_version`, pagination fields, etc.
  explicitly or keep `meta: z.record(z.any())`. Planner chooses based on
  how much the executor tests already assert on meta.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `toolResult()` at `src/mcp/common/tool-utils.ts:133` already produces the
  correct `{ structuredContent: { data, meta }, content: [...] }` shape.
  No runtime change needed for STRUCT-01.
- `createJsonToolRegistrar()` at `src/mcp/common/tool-utils.ts:223` wires
  outputSchema into `server.registerTool(...)`. The registrar currently
  hardcodes `outputSchema: { data: z.any(), meta: z.any().optional() }` at
  line 241 — this is the single place to extend with a per-call override.
- `src/mcp/common/schemas.ts` already exports `MEMORY_KIND_SCHEMA`,
  `MEMORY_STATUS_SCHEMA`, `MEMORY_SCOPE_SCHEMA`, `MEMORY_LINK_SCHEMA`,
  `MEMORY_EVENT_TYPE_SCHEMA`, `MEMORY_EVENT_STATUS_SCHEMA`,
  `RESPONSE_FORMAT_SCHEMA` — same file hosts new archetypes.
- `test/mcp-annotations.test.js` (from Phase 39) has the fake-services
  harness that drives `registerAppTools()` end-to-end and captures `meta`
  from every `registerTool(...)` call. Extend the same harness to cover
  outputSchema assertions.

### Established Patterns
- `registerXxxTools` functions are symmetric — each takes `{ registerJsonTool,
  schemas, ... }` in its props and calls `registerJsonTool(name, { title,
  description, inputSchema, annotations }, handler)`. Adding an optional
  `outputSchema` to the definition object is a zero-risk extension.
- Tool files are clustered by domain: core.ts (6), memory-store.ts (13),
  memory-workflow.ts (7), retrieval.ts (14), graph-tools.ts (22),
  kg-delete-tools.ts (3), backfill-tools.ts (1), find-tools.ts (1),
  audit-tools.ts (1), symbol-tools.ts (4). Per-tool outputSchema assignment
  is mechanical once the archetype library lands.
- `RESPONSE_SCHEMA_VERSION` constant already lives next to `toolResult` for
  future versioning — keep it.

### Integration Points
- `src/app/register-tools.ts` passes `sharedSchemas` into the
  `registerXxxTools` calls. Add the new archetypes to this bag so downstream
  tools can pull them from `schemas.OUTPUT_SEARCH_RESULT` etc. without
  importing directly.
- Phase 39's `test/mcp-annotations.test.js` is the template — its
  `registerAppTools` wiring and fake-services enumeration can be reused
  verbatim. Phase 40 does not need new fake services.
- No other phase depends on Phase 40 — STRUCT-01..03 are standalone.

</code_context>

<specifics>
## Specific Ideas

- Archetype names should use the `*_RESULT_SCHEMA` convention so grep finds
  them alongside existing input schemas.
- Keep `meta` shape strict where possible — `schema_version: z.string()` and
  `pagination: PAGINATION_META_SCHEMA.optional()` are easy wins.
- The `FREEFORM_RESULT_SCHEMA` escape hatch should be used for ≤ 5 tools
  max. If more than 5 tools need it, the planner should split it into more
  archetypes instead.
- The extended test should keep the existing 72-entry `EXPECTED_ANNOTATIONS`
  map untouched and add a parallel `EXPECTED_OUTPUT_SCHEMAS` map — do not
  merge them into a single map of objects, it makes diffs harder to read.

</specifics>

<deferred>
## Deferred Ideas

- Runtime validation of responses against outputSchemas via a dev-mode
  middleware — out of scope. Test-time validation is enough for v0.3.0.
- Auto-generating outputSchemas from TypeScript return types of tool
  handlers — would require a build-time step with `ts-to-zod` or similar;
  deferred. Manual archetype assignment is the v0.3.0 approach.
- Breaking out `mcp-annotations.test.js` into multiple files — defer until
  the combined file crosses 500 lines.
- Versioning outputSchemas via `$version` field inside each archetype —
  deferred. `RESPONSE_SCHEMA_VERSION` at the meta level handles this for
  now.

</deferred>
