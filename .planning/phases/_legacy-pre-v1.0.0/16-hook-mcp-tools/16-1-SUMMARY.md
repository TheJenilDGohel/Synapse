---
phase: 16
plan: 1
subsystem: mcp-hooks
tags: [hooks, mcp-tools, introspection, skill-docs]
dependency_graph:
  requires: [hooks.js, store.js, graph-tools.js]
  provides: [synapse_hooks_stats, synapse_hooks_list_events]
  affects: [SKILL.md, tool-reference.md]
tech_stack:
  added: []
  patterns: [static-method-import, store-hooks-access]
key_files:
  created: []
  modified:
    - src/mcp/tools/graph-tools.js
    - skills/synapse/SKILL.md
    - skills/synapse/tool-reference.md
decisions:
  - Access hooks via memory.store.hooks (MemoryService.store.hooks) for instance stats
  - Import MemoryHooks class for static validEvents() call
  - Return events as { events: [...] } wrapper for consistent JSON structure
metrics:
  duration: 1m50s
  completed: 2026-04-08
---

# Phase 16 Plan 1: Hook MCP Tools Summary

Hook introspection MCP tools exposing MemoryHooks stats and valid event names, with skill documentation and usage examples.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add hook MCP tools to graph-tools.js | 4c054ff | src/mcp/tools/graph-tools.js |
| 2 | Add hooks workflow and examples to SKILL.md | c107ba2 | skills/synapse/SKILL.md |
| 3 | Add hook tools to tool-reference.md | ea323f6 | skills/synapse/tool-reference.md |

## Implementation Details

### synapse_hooks_stats
- Calls `memory.store.hooks.getStats()` on the MemoryHooks instance
- Returns `{ enabled, total_listeners, events }` where events is a map of event name to listener count
- Read-only, idempotent

### synapse_hooks_list_events
- Calls `MemoryHooks.validEvents()` static method (imported from hooks.js)
- Returns `{ events: [...] }` array of all valid event names
- Covers: memory lifecycle, KG ops, graph traversal, diary, ingestion, dedup, taxonomy, wildcards, error
- Read-only, idempotent

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.
