# Phase 4: Nest/Branch Hierarchy - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Users can organize memories into a two-level hierarchy using Synapse's own "nest/branch" metaphor. Nests are top-level domains (projects, people, topics). Branches are specific subjects within nests (auth, billing, deployment). Memory recall filters by nest and/or branch for improved retrieval precision.

CRITICAL: This project uses "nest" and "branch" — NOT "wing" and "room". The research files may reference wing/room from MemPalace analysis — IGNORE those names. All columns, variables, parameters, and API fields must use "nest" and "branch".

</domain>

<decisions>
## Implementation Decisions

### Naming Convention
- Column names: `nest` and `branch` (on memory_entries table)
- NOT wing/room — that is MemPalace's naming which we explicitly rejected
- Default values: empty string '' (NOT NULL DEFAULT '', matching existing scope columns)

### Schema
- ALTER TABLE memory_entries ADD COLUMN nest TEXT NOT NULL DEFAULT ''
- ALTER TABLE memory_entries ADD COLUMN branch TEXT NOT NULL DEFAULT ''
- CREATE INDEX idx_memory_entries_nest_branch ON memory_entries(nest, branch)
- This is schema v7

### Claude's Discretion
- taxonomy.js module: list nests, list branches, get taxonomy tree
- recall.js modifications: add nest/branch filters to existing recall
- Auto-derive nest from project_path when nest is empty but project_path is set
- Auto-derive branch from topic when branch is empty but topic is set

</decisions>

<code_context>
## Existing Code Insights

### Key Files
- `src/services/memory/schema.js` — Add v7 migration (ALTER TABLE)
- `src/services/memory/recall.js` — Add nest/branch filter conditions
- `src/services/memory/store.js` — Wire taxonomy methods
- `src/services/memory/service.js` — Wire taxonomy methods
- `src/services/memory/entries.js` — Accept nest/branch on store operations

### Patterns
- Scope columns use NOT NULL DEFAULT '' (scope_project_path, topic, feature)
- recall.js builds filter chains with scope matching and scoring

</code_context>

<specifics>
## Specific Ideas

The metadata filtering approach (proven 34% retrieval boost) uses nest+branch as additional filter columns, narrowing candidates before scoring.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
