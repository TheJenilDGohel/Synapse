---
phase: 02-knowledge-graph-core
plan: 02
subsystem: memory/knowledge-graph
tags: [auto-creation, entity, wiring, facade, service]
dependency_graph:
  requires: [02-01]
  provides: [entity-auto-creation, kg-service-api, kg-store-api]
  affects: [03-01, 05-01, 08-02, 09-01]
tech_stack:
  added: []
  patterns: [auto-create-on-reference, transactional-entity-triple, store-passthrough, service-passthrough]
key_files:
  created: []
  modified:
    - src/services/memory/kg.js
    - src/services/memory/store.js
    - src/services/memory/service.js
decisions:
  - "ensureEntity uses INSERT OR IGNORE for idempotent auto-creation -- always returns slug ID"
  - "addTriple wraps ensureEntity + INSERT in adapter.transaction() for atomicity"
  - "Name-based params (subjectName/objectName) are alternatives to ID params -- not both required"
metrics:
  duration: 2min
  completed: 2026-04-08
  tasks: 2
  files: 3
---

# Phase 02 Plan 02: Entity Auto-creation and Store/Service Wiring Summary

ensureEntity auto-creates entities from names atomically within addTriple transactions; MemoryStore and MemoryService expose all 5 KG methods (addEntity, getEntity, addTriple, invalidateTriple, queryEntityRelationships) for downstream consumers.

## What Was Done

### Task 1: ensureEntity and Name-based addTriple (5d822a1)
- Added ensureEntity(adapter, name, type) function to kg.js -- creates entity from name using slug normalization, returns slug ID
- Modified addTriple to accept subjectName/objectName as alternatives to subjectId/objectId
- Wrapped entity auto-creation + triple insertion in adapter.transaction() for atomicity
- Validation ensures either ID or Name is provided for subject and object
- kg.js is 236 lines (under 250 limit)

### Task 2: Store and Service Wiring (18bd8e9)
- Added import of all 6 KG functions (addEntity, getEntity, addTriple, invalidateTriple, queryEntityRelationships, ensureEntity) to store.js
- Added 5 method forwards to MemoryStore class following existing adapter-passthrough pattern (await this.init() before each call)
- Added 5 method forwards to MemoryService class following existing store-passthrough pattern (this.assertEnabled() before each call)
- No existing methods modified in either file

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 5d822a1 | feat(02-02): add ensureEntity helper and name-based addTriple |
| 2 | 18bd8e9 | feat(02-02): wire kg.js into MemoryStore and MemoryService facades |

## Verification Results

- ensureEntity exported and callable
- addTriple accepts subjectName/objectName
- adapter.transaction wraps entity creation + triple insert
- ensureEntity appears 3 times (definition + 2 calls in addTriple)
- All 5 KG methods accessible on MemoryStore instance
- All 5 KG methods accessible on MemoryService instance
- kg.js is 236 lines (under 250)
