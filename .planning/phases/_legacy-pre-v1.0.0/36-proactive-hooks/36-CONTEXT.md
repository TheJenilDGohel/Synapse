# Phase 36: Proactive Hooks - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning
**Mode:** Manual (plan requested)

<domain>
## Phase Boundary

Agents receive high-importance memory hints automatically when they Read or Edit files linked to tracked memories. The hook response is appended to the tool result as advisory metadata -- agents can ignore it without breaking the underlying action. Push, not pull.

Requirements: HOOK-07, HOOK-08, HOOK-09
Depends on: Phase 26 (stable foundation)

</domain>

<decisions>
## Implementation Decisions

### Architecture: MCP tool-layer hooks, not MemoryHooks events

The existing `MemoryHooks` system (src/services/memory/hooks.ts) handles memory-lifecycle events (before:store, after:recall, etc.). Proactive hooks are different -- they intercept *retrieval* tool calls (synapse_read_file) and surface memory hints alongside the normal response. They belong in the MCP tool layer, not the memory event bus.

Approach:
1. **New module** `src/services/memory/proactive-hints.ts` -- pure query logic. Given a file path, find memories with importance >= 70 whose `links[].path` matches the file path. Return hint payloads.
2. **Modify** `src/mcp/tools/retrieval.ts` -- after `synapse_read_file` returns its normal result, call the hint lookup and append a `_memory_hints` field to the response.
3. **No new MCP tools** -- hints are advisory metadata on existing tool responses, not separate tool calls.
4. **Non-blocking** -- hint lookup failures are swallowed; the read/edit response is always returned unmodified.

### Key constraints
- `links` field on memory entries stores `Link[]` = `{ path: string; line: number | null; label: string }`. The `path` field is the connection point between a file and a memory.
- Importance threshold is 70 (per HOOK-07 requirement).
- No new runtime dependencies.
- All files under 500 lines.

</decisions>

<code_context>
## Existing Code Insights

### Memory links (types.ts)
```typescript
export interface Link {
  path: string;
  line: number | null;
  label: string;
}
```
Links are stored as `links_json` TEXT column in `memory_entries`. Queried via `JSON_EACH` or by loading all high-importance entries and filtering in-memory.

### Hook system (hooks.ts)
MemoryHooks is a pub/sub event bus on the MemoryStore class. Events: before:store, after:store, before:recall, etc. Listeners can cancel operations or mutate payloads. Not the right place for proactive file-read hints -- those need to intercept MCP tool responses.

### Read file tool (retrieval.ts)
`synapse_read_file` calls `workspace.readFileChunk(filePath, startLine, endLine, 800)` and normalizes the result via `normalizeReadFileChunkResult`. The tool is registered in `registerRetrievalTools()` which receives workspace, vectorIndex, and search services. It does NOT currently receive the memory service -- this must be added.

### Tool registration (register-tools.ts)
`registerAppTools` creates all tool registrations. It has access to `services.memory` (MemoryService). To pass memory to retrieval tools, the `RegisterRetrievalToolsOptions` interface needs a new optional `memory` field.

### VALID_EVENTS (hooks.ts)
The hooks system has a VALID_EVENTS set. We may optionally add `'after:file:read'` and `'after:file:edit'` events for extensibility, but the core proactive hint logic is in the MCP tool layer.

</code_context>

<specifics>
## Specific Ideas

### SQLite query for file-linked memories
```sql
SELECT me.id, me.title, me.importance, me.kind, me.summary
  FROM memory_entries me, JSON_EACH(me.links_json) AS je
 WHERE me.importance >= 70
   AND me.status = 'active'
   AND JSON_EXTRACT(je.value, '$.path') = ?
 ORDER BY me.importance DESC
 LIMIT 5
```
This uses SQLite's JSON_EACH to unnest the links array and match the file path. The query is indexed on importance (integer column) and filtered by status.

### Edit hint: flag for memory update suggestion
When a file is edited (not just read), the hint should include a `suggest_update: true` flag on each linked memory, signaling that the memory's content may now be stale.

### No edit tool in Synapse
Synapse does not have an "edit file" MCP tool -- it is read-only. The "Edit-file hook" from HOOK-08 would need to be triggered when the agent writes to a file tracked by Synapse. Since Synapse does not write files, the edit hook must be exposed as a callable MCP tool (`synapse_file_changed`) that agents (or the host IDE) call after editing a file. This tool returns memory hints with `suggest_update: true`.

</specifics>

<deferred>
## Deferred Ideas

- HNSW-based semantic matching of file content to memories (would allow hints even when no explicit link exists). Out of scope for Phase 36.
- Automatic re-indexing of changed files after edit hints fire. Separate concern.

</deferred>
