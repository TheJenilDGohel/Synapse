# Phase 1: Engine Isolation - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Create `src/engine/` as the canonical, protocol-agnostic cognitive layer for Synapse. All SQLite database interaction logic (queries, graph traversals, semantic indexing) currently scattered in `src/services/memory/` must be isolated into this pure module. The engine must be importable and usable without any knowledge of CLI output formatting or MCP protocol payloads. This satisfies CORE-01 and CORE-02.

</domain>

<decisions>
## Implementation Decisions

### Agent's Discretion
All implementation choices are at the agent's discretion — pure infrastructure phase. The ROADMAP phase goal, success criteria (CORE-01: SQLite in src/engine/, CORE-02: semantic/hybrid search importable without server protocols), and codebase conventions guide decisions.

Key structural points to preserve:
- `src/services/memory/` currently owns: `adapter.ts`, `schema.ts`, `store.ts`, and all subdirectories (knowledge-graph/, events/, temporal/, taxonomy/, store/, ingest/, etc.)
- `MemoryStore` class in `store.ts` is the façade used by MCP tools and CLI — it will remain as a thin coordinator
- `NodeSqliteAdapter` (adapter.ts) wraps `node:sqlite` DatabaseSync — this is the engine's DB layer
- The actual domain logic functions (e.g. `addTriple`, `recall`, `traverseGraph`) are already split into sub-modules and pass `adapter` directly — they are already engine-shaped
- Goal: `src/engine/` re-exports the pure logic functions; `src/services/memory/` wrappers import from engine

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/services/memory/adapter.ts` — `NodeSqliteAdapter` wrapping `node:sqlite` DatabaseSync; already protocol-agnostic
- `src/services/memory/schema.ts` — `ensureSchema()` + `runMigrations()` — pure SQLite DDL, no protocol coupling
- `src/services/memory/knowledge-graph/` — `kg.ts`, `kg-batch.ts`, `kg-search.ts`, `graph.ts`, `relations.ts` — all take `adapter` directly
- `src/services/memory/events/capture.ts` — event capture, adapter-driven
- `src/services/memory/store/` — `entries.ts`, `entries-batch.ts`, `dedup.ts` — pure adapter functions
- `src/services/memory/temporal/` — `whats-new.ts`
- `src/services/memory/taxonomy/` — `taxonomy.ts`, `scopes.ts`
- `src/services/memory/ingest/` — `ingest.ts`
- `src/services/memory/audit/` — `dashboard.ts`
- `src/services/retrieval/` — embedding, semantic search, vector-index — these are CORE-02

### Established Patterns
- All sub-module functions already accept `adapter` as the first param (not `MemoryStore`) — they are already decoupled from the class
- TypeScript strict-mode, ESM (`"type": "module"`), tsx for execution
- No new runtime dependencies allowed (zero new npm packages for this phase)

### Integration Points
- `src/app/create-services.ts` — creates MemoryStore and passes it to MCP tool registerers; will use engine layer after refactor
- `src/mcp/tools/*.ts` — consume MemoryStore via interface injection (MemoryService interface); untouched in Phase 1
- `src/cli/commands/` — use MemoryStore methods; untouched in Phase 1

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Create `src/engine/` as a barrel that re-exports or consolidates the pure adapter-level functions. The `MemoryStore` façade in `src/services/memory/store.ts` should delegate to `src/engine/` imports rather than the current relative imports from `./knowledge-graph/`, `./store/`, etc.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
