# Phase 6: Agent-Scoped Memory - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Per-agent memory isolation and private diary entries. agent_id column on memory_entries for scoping. Agent diary table for private scratchpad. Recall respects agent scope: sees own + global, not other agents' private data.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
- Add agent_id column to memory_entries (ALTER TABLE, schema v7 already exists — this is a v7 addendum or can be part of it)
- New table: agent_diary (id, agent_id, content, topic, created_at) — separate from memory_entries
- New module: src/services/memory/scopes.js
- Recall filter: WHERE (agent_id = '' OR agent_id = ?) to show global + own
- Diary: write/read operations scoped to agent_id
- Wire through store.js and service.js

</decisions>

<code_context>
## Existing Code Insights

### Key Files
- src/services/memory/schema.js — Add agent_id column + agent_diary table
- src/services/memory/recall.js — Add agent_id filter
- src/services/memory/entries.js — Accept agent_id on store
- src/services/memory/store.js — Wire scope methods
- src/services/memory/service.js — Wire scope methods

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond the requirements doc.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
