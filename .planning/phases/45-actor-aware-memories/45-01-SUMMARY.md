---
phase: 45-actor-aware-memories
plan: 01
subsystem: database
tags: [sqlite, memory, actor-attribution, schema-migration, mcp-tools]

# Dependency graph
requires:
  - phase: 42-bitemporal-kg-triples
    provides: schema migration pattern (v12 recorded_at) reused for v13 actor_id
provides:
  - actor_id column on memory_entries (schema v13 migration, idempotent ALTER TABLE + index)
  - actor_id in all TypeScript types (MemoryEntry, MemoryEntryRow, StoreEntryInput, RecallInput, ListEntriesOpts)
  - Write paths derive actorId from agent_id when omitted (storeEntry, preparePayload/batch)
  - Read/filter paths: recall and listEntries accept actorId exact-match filter
  - CompactMemory carries actor_id field; agent_prime maps it from recalled items
  - MCP tools memory_store, memory_store_batch, memory_list, memory_recall all expose actor_id
affects:
  - any future phase that reads or writes memory_entries
  - agent_prime callers that consume CompactMemory output

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "actor_id is attribution axis (who created), agent_id is visibility-scoping axis (who can see)"
    - "actor_id auto-inferred from agent_id when omitted — zero-config fallback for existing callers"
    - "actorId filter is exact-match only, not scope-broadening (unlike agentId which includes global '' memories)"
    - "idempotent migration: try/catch ALTER TABLE, then CREATE INDEX IF NOT EXISTS"

key-files:
  created: []
  modified:
    - src/services/memory/schema.ts
    - src/services/memory/types.ts
    - src/services/memory/utils.ts
    - src/services/memory/store/entries.ts
    - src/services/memory/store/entries-batch.ts
    - src/services/memory/store/recall.ts
    - src/services/memory/workflow/agent-prime.ts
    - src/mcp/tools/memory-store.ts
    - src/mcp/tools/memory-workflow.ts

key-decisions:
  - "actor_id is a peer of agent_id: agent_id is the visibility-scoping axis, actor_id is the attribution axis; auto-inferred from agent_id when omitted"
  - "actor_id filter on recall is exact-match only (not scope-broadening like agentId OR global fallback)"

patterns-established:
  - "Attribution column pattern: actor_id fallback chain input.actor_id || agentId, cleanString(…, 200)"
  - "Exact-match filter pattern: if (actorId) { filters.push('actor_id = ?'); params.push(actorId); }"

requirements-completed: [ACTOR-01, ACTOR-02, ACTOR-03, ACTOR-04]

# Metrics
duration: 5min
completed: 2026-04-13
---

# Phase 45 Plan 01: Actor-Aware Memories Summary

**actor_id attribution column added to memory_entries via schema v13 migration, propagated through all write paths with auto-inference from agent_id, filterable on recall/list, and surfaced on CompactMemory in agent_prime**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-13T10:20:35Z
- **Completed:** 2026-04-13T10:25:00Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Schema migrated to v13 with actor_id TEXT NOT NULL DEFAULT '' column and idx_memory_entries_actor_id index
- All TypeScript interfaces updated (MemoryEntry, MemoryEntryRow, StoreEntryInput, RecallInput, ListEntriesOpts)
- Write paths in storeEntry and preparePayload derive actorId = input.actor_id || agentId (zero-config fallback)
- recall() and listEntries() accept actorId as exact-match filter; listEntries SELECT includes actor_id
- CompactMemory interface gains actor_id: string; agent_prime maps it from recalled items
- All 4 MCP tools (memory_store, memory_store_batch, memory_list, memory_recall) expose actor_id in inputSchema

## Task Commits

1. **Task 1: Schema migration v13 + type definitions** - `4a78c0a` (feat)
2. **Task 2: Write paths — storeEntry, preparePayload, INSERT** - `0ff9fd7` (feat)
3. **Task 3: Read/filter paths — recall, listEntries, agent_prime, MCP schemas** - `2f4e3be` (feat)

## Files Created/Modified
- `src/services/memory/schema.ts` — SCHEMA_VERSION 12→13, actor_id in CREATE TABLE, migration v13
- `src/services/memory/types.ts` — actor_id on MemoryEntry, MemoryEntryRow, StoreEntryInput; actorId on RecallInput, ListEntriesOpts
- `src/services/memory/utils.ts` — deserializeEntry maps actor_id: row.actor_id || ''
- `src/services/memory/store/entries.ts` — actorId derivation in storeEntry; actor_id in INSERT; actorId filter + SELECT in listEntries
- `src/services/memory/store/entries-batch.ts` — actorId in PreparedRow interface + literal; actorId derivation; actor_id in INSERT
- `src/services/memory/store/recall.ts` — actorId destructured from RecallInput; exact-match filter
- `src/services/memory/workflow/agent-prime.ts` — actor_id: string on CompactMemory; mapped from recalled items
- `src/mcp/tools/memory-store.ts` — actor_id: z.string().max(200).optional() on memory_store, memory_store_batch, memory_list; actorId wired in memory_list handler
- `src/mcp/tools/memory-workflow.ts` — actor_id on memory_recall inputSchema; actorId passed to recall()

## Decisions Made
- actor_id is the attribution axis (who created), agent_id is the visibility-scoping axis (who can see)
- actor_id auto-infers from agent_id when omitted — existing callers require zero changes
- actorId filter is exact-match only, not scope-broadening (unlike agentId which also includes global '' memories)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- actor_id is available on all memory_entry rows immediately after DB init (migration runs automatically)
- All write tools are backward-compatible — actor_id is optional, falls back to agent_id
- All read tools are backward-compatible — actorId filter is optional
- 189 tests pass, build exits 0

---
*Phase: 45-actor-aware-memories*
*Completed: 2026-04-13*
