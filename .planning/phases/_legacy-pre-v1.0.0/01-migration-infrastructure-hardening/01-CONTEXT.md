# Phase 1: Migration Infrastructure Hardening - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Schema migrations are safe to run against production databases with rollback protection. Each schema version bump executes inside its own SQLite transaction. The migration runner checks current schema_version before applying and skips versions already applied. Running migrations on an already-current database is a safe no-op.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

</decisions>

<code_context>
## Existing Code Insights

### Key Files
- `src/services/memory/schema.js` — Current schema v5 with migrations, ensureSchema(), runMigrations()
- `src/services/memory/adapter.js` — NodeSqliteAdapter with exec/run/get/all methods
- `src/services/memory/store.js` — MemoryStore that orchestrates init and schema

### Known Issues
- Research identified: `runMigrations` sets `schema_version` once at the end of all migrations, not per-version. A failure mid-migration leaves no record of which versions succeeded.
- Raw `exec('BEGIN')` strings won't scale to multi-table KG operations needing atomicity.

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Fix the atomicity bug in migration runner before adding v6/v7/v8 schema changes.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
