# Phase 41: Resource Links (MCP Spec) - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning
**Mode:** Smart discuss (accept-recommended on both areas)

<domain>
## Phase Boundary

Three file-returning MCP tools (`synapse_read_file`, `synapse_search_code`,
`synapse_search_files`) emit MCP `resource_link` content blocks alongside
their existing inline text responses. Clients that support resource links can
dereference them via the MCP resource protocol; clients that don't continue
to work against the text content unchanged (RLINK-03 fallback).

Out of scope: MCP resource protocol registration, new "resource server" mode,
modifying tools beyond the three listed, custom URI schemes, compression of
inline text output.

</domain>

<decisions>
## Implementation Decisions

### Tool Coverage — 3 File Tools Only (Accepted)
- `synapse_read_file` — single file chunk; emit **one** resource_link
- `synapse_search_files` — path search; emit **one resource_link per unique
  matched file** (dedup by absolute path)
- `synapse_search_code` — content search; emit **one resource_link per
  unique matched file** (dedup by absolute path, not per match)
- Phase 41 does NOT extend coverage to `search_hybrid`, `find_definition`,
  `find_callers`, `find_implementations`, or `rename_preview`. Their output
  shapes are fine with BUNDLE_RESULT_SCHEMA text; a follow-up phase can add
  resource_links if user demand surfaces.

### Response Shape — Both Formats (Accepted)
- Emit BOTH inline text AND `resource_link` blocks in the `content[]` array
  of the tool response. This satisfies RLINK-01 (resource_links present) AND
  RLINK-03 (backwards compat preserved) simultaneously.
- Example `content[]` for `read_file`:
  ```js
  [
    { type: 'text', text: '...existing JSON dump...' },
    { type: 'resource_link', uri: 'file:///abs/path', name: 'basename.ts',
      description: 'chunk 10-80 of 320 lines', mimeType: 'text/typescript' }
  ]
  ```
- `structuredContent.data` stays unchanged — resource_links live ONLY in
  `content[]` per the MCP spec.

### URI Scheme — `file://` (Accepted)
- Every resource_link uses `file:///<absolute-path>` format. No custom
  scheme, no project-relative paths. Clients use standard URI resolution.
- Absolute paths are resolved via `path.resolve()` at emit time inside
  `toolResult()` (or a new helper). No ~ expansion needed — paths come from
  `workspace.readFileChunk()` which already normalizes.

### resource_link Fields (Accepted)
- Required: `type: 'resource_link'`, `uri: 'file:///...'`, `name: <basename>`
- `description`:
  - `read_file`: `"chunk {start}-{end} of {total} lines"`
  - `search_files`: `"path match: {matched_path_fragment}"`
  - `search_code`: `"{N} match(es) for {query}"`
- `mimeType`: derive from file extension via a small lookup table in a new
  helper `getMimeTypeFromPath(absPath)` living in `src/mcp/common/mime.ts`
  (≤50 lines). Cover at least: `.ts → text/typescript`, `.tsx →
  text/typescript`, `.js → text/javascript`, `.jsx → text/javascript`, `.mjs
  → text/javascript`, `.cjs → text/javascript`, `.json → application/json`,
  `.md → text/markdown`, `.yaml/.yml → text/yaml`, `.toml → text/toml`,
  `.py → text/x-python`, `.go → text/x-go`, `.rs → text/x-rust`, `.html →
  text/html`, `.css → text/css`, `.txt → text/plain`. Unknown → omit
  mimeType (optional per spec).
- Intentionally skip: `size`, `icons`, `annotations.audience`,
  `annotations.priority`, `_meta`, `title` — none improve Phase 41 value
  and they bloat the response.

### Emission Strategy — Always-Emit (Accepted)
- Emit resource_links on every call regardless of response size. No
  size-gated fallback. Consistency beats micro-optimization.
- If the tool returns zero files (empty search result), emit zero
  resource_links — `content[]` has only the text block.
- If `workspace.readFileChunk` fails or the file doesn't exist, do NOT emit
  a resource_link for the missing file — keep the error shape from the text
  payload.

### Plumbing Location — Per-Tool Handler (Accepted)
- Do NOT modify `toolResult()` in `src/mcp/common/tool-utils.ts` to
  auto-inject resource_links — it would couple the generic envelope to
  file-specific logic. Instead, each of the 3 handlers builds its own
  resource_link list from its result, then passes them through a new
  optional parameter to `toolResult()`:
  ```ts
  function toolResult(
    result: unknown,
    responseFormat?: string,
    markdownTitle?: string,
    resourceLinks?: ResourceLink[]
  ): ToolResult
  ```
- `toolResult` appends the `resourceLinks` to `content[]` after the text
  block if the array is non-empty. `structuredContent` stays unchanged.
- `ToolResult` interface in `tool-utils.ts` broadens `content` from
  `Array<{ type: string; text: string }>` to
  `Array<{ type: 'text'; text: string } | { type: 'resource_link'; uri:
  string; name: string; description?: string; mimeType?: string }>`.

### Test Strategy (Accepted)
- Add a new `test/mcp-resource-links.test.js` that drives the 3 handlers
  with fake workspace services and asserts:
  1. `read_file` result has one resource_link with correct uri/name/description
  2. `search_files` with 3 path matches across 2 files emits 2 resource_links
  3. `search_code` with 5 content matches across 3 files emits 3 resource_links
  4. Missing-file error path emits ZERO resource_links
  5. Mime type derived correctly for `.ts`, `.js`, `.md`, unknown extension
- A second assertion in the same file verifies that `structuredContent.data`
  is unchanged from the existing shape — backwards compat on the data side.
- Keep `test/mcp-annotations.test.js` untouched — its EXPECTED_OUTPUT_SCHEMAS
  assertion already guards against outputSchema drift.

### Backwards Compat (Accepted)
- Existing `terse-response.test.js`, `mcp-annotations.test.js`, and any
  handler-level tests must stay green.
- Existing callers of `toolResult(data, responseFormat, markdownTitle)` keep
  working because `resourceLinks` is the 4th optional parameter with a
  default of `undefined` (treated as empty array).

### Claude's Discretion
- Exact mime-type table size (≥ 15 entries is the floor; planner may grow).
- Whether `getMimeTypeFromPath` lives in `src/mcp/common/mime.ts` or inside
  `tool-utils.ts`. Separate file is the default to keep `tool-utils.ts`
  from crossing 500 lines.
- Whether to add a tiny `buildResourceLink(absPath, description)` helper in
  the same location to reduce repetition across 3 handlers.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `toolResult()` at `src/mcp/common/tool-utils.ts:135-148` is the single
  place the tool-response envelope is built. Extending it with an optional
  `resourceLinks` parameter is a zero-risk additive change.
- `ToolResult` interface at `src/mcp/common/tool-utils.ts:128-131` is the
  type that needs the `content[]` union broadened.
- `workspace.readFileChunk(filePath, startLine, endLine, maxWidth)` at
  `src/mcp/tools/retrieval.ts:26` already returns the absolute file path in
  its normalized result — no additional workspace method required.
- `synapse_read_file` handler at `src/mcp/tools/retrieval.ts:454-487` —
  single-file case. Handler result has `path`, `start_line`, `end_line`,
  `total_lines` already.
- `synapse_search_files` handler at `src/mcp/tools/retrieval.ts:260-304`
  — path search; result items have file paths and match fragments.
- `synapse_search_code` handler at `src/mcp/tools/retrieval.ts:305-358`
  — content search; result items have file paths and match counts.
- MCP SDK `ResourceLinkSchema` at
  `node_modules/@modelcontextprotocol/sdk/dist/esm/types.d.ts:2007-2033`
  defines the canonical fields. Our implementation must match.

### Established Patterns
- Handler return shapes are normalized via `normalizeXxxResult()` helpers
  before being passed to `toolResult()`. The resource-link list should be
  computed from the normalized result (after normalization) and passed to
  `toolResult` as a fourth parameter.
- Tests in `test/*.test.js` use `node:test` + `node:assert/strict`. The new
  `test/mcp-resource-links.test.js` should follow the same pattern and run
  via `npm test` without any new dependencies.
- `src/mcp/common/` currently has: `index.ts`, `tool-utils.ts`, `schemas.ts`,
  `response-normalizers.ts`, `status.ts`, `health-monitor.ts`,
  `staleness-monitor.ts`, `terse-utils.ts`. A new `mime.ts` fits the
  established per-concern file split.
- `retrieval.ts` is currently 535 lines (pre-existing, over 500-line cap).
  Phase 41 adds ~30 lines of resource_link logic to the 3 handlers. Keep
  the helpers in `src/mcp/common/` to avoid pushing `retrieval.ts` further
  over budget.

### Integration Points
- No changes to `register-tools.ts` — the registrar pipeline already passes
  everything through.
- No changes to `src/app/mcp-server.ts` — the MCP SDK already understands
  the `resource_link` content type from the registered `ContentBlockSchema`.
- Phase 40's 8-archetype library stays untouched. The 3 affected tools all
  use BUNDLE_RESULT_SCHEMA or SEARCH_RESULT_SCHEMA for `outputSchema` —
  resource_links do NOT need their own archetype because they live in
  `content[]`, not in `structuredContent.data`.

</code_context>

<specifics>
## Specific Ideas

- Keep the new `test/mcp-resource-links.test.js` at or under 300 lines to
  stay well below the 500-line cap.
- Use `path.resolve()` explicitly — do not assume paths are already absolute,
  even though `workspace.readFileChunk` usually returns absolute paths.
- Add a one-line rationale comment at each emission site explaining "RLINK-01
  per MCP 2025-06-18 spec — both formats emitted for client backwards compat".
- The ZERO-resource-link branch (errors, missing files, empty search results)
  is as important to test as the happy path — don't skip it.

</specifics>

<deferred>
## Deferred Ideas

- Extending resource_link emission to `search_hybrid`, `find_definition`,
  `find_callers`, `find_implementations`, `rename_preview` — deferred. A
  follow-up phase can evaluate after real client feedback.
- Custom `synapse://` URI scheme with project-relative paths — deferred.
  Standard `file://` is canonical and works with any MCP-aware client.
- Size-gated emission (only emit resource_link when inline > 2KB) — deferred.
  Always-emit is simpler and more consistent.
- `size`, `icons`, `annotations.audience`, `annotations.priority`, and
  `lastModified` fields on resource_link — deferred. All optional per spec,
  no v0.3.0 value, bloat the wire format.
- Registering Synapse as an MCP resource server — out of scope for Phase 41.
  That's a larger architectural change; clients can already dereference
  `file://` URIs themselves.

</deferred>
