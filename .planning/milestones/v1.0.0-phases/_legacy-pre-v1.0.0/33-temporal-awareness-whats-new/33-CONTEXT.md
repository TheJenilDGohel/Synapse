# Phase 33: Temporal Awareness `whats_new` - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode)

<domain>
## Phase Boundary

A single `synapse_whats_new(since)` MCP tool that returns a cross-session delta: new memories, new KG triples, changed files, and a structured natural-language summary since a given ISO timestamp or the magic value `"last_session"`. Also validates that the existing `synapse_kg_as_of` tool works correctly with auto-stamped `valid_from` from Phase 26.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices at Claude's discretion -- autonomous mode. Key constraints from requirements:
- Accepts ISO timestamp string OR the literal `"last_session"`
- `"last_session"` resolves to the most recent `memory_entries.created_at` for the current agent + project scope
- Response shape: `{ files_changed, new_memories, new_triples, recent_commits, summary }`
- Summary is natural language, capped at 200 characters
- No new runtime dependencies -- pure SQLite queries
- `kg_as_of` already exists (Phase 3); just needs validation that `valid_from` is auto-populated (Phase 26)
- New file `src/services/memory/temporal/whats-new.ts` for the query logic
- Single MCP tool registration in a new or existing tools file

</decisions>

<code_context>
## Existing Code Insights

### Database Tables (from schema.ts)
- `memory_entries` has `created_at TEXT NOT NULL`, `updated_at TEXT NOT NULL`, `agent_id TEXT`, `scope_project_path TEXT`, `nest TEXT`, `branch TEXT`
- `kg_triples` has `created_at TEXT NOT NULL`, `valid_from TEXT` (auto-stamped since Phase 26), `valid_to TEXT`
- `kg_entities` has `created_at TEXT NOT NULL`, `updated_at TEXT NOT NULL`

### Existing Patterns
- `listEntries` in `store/entries.ts` uses parameterized WHERE clauses with `clampInt` for pagination
- `queryTriplesAsOf` in `kg.ts` filters by `valid_from <= ?` and `valid_to IS NULL OR valid_to > ?`
- MCP tools registered via `registerJsonTool` with zod schemas (see `memory-store.ts`, `graph-tools.ts`)
- Response normalization via `../common/response-normalizers.ts` and `../common/terse-utils.ts`
- Service layer (`service.ts`) delegates to `MemoryStore` (`store.ts`) which delegates to functional modules

### Key Interfaces
- `Adapter` for all DB access (exec, run, get, all, transaction)
- `RegisterJsonToolFn` for MCP tool registration
- `MemoryService` provides the service-layer API used by MCP tools

</code_context>

<specifics>
## Specific Ideas

- The `since` parameter must handle both ISO-8601 timestamps and `"last_session"` magic value
- For `"last_session"` resolution: `SELECT MAX(created_at) FROM memory_entries WHERE agent_id = ? AND scope_project_path = ?`
- Files changed: query `memory_entries` with `source_type = 'file_change'` or count entries with link paths, or simply count new memories that reference file paths in their links_json
- Recent commits: not stored in DB today; can query `memory_events` with `event_type` containing commit-related types, or return empty if no commit tracking exists
- Summary generation: pure string templating, no LLM -- e.g. "3 new memories, 5 new triples, 2 files changed since 2026-04-01"

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
