---
phase: 05-graph-traversal-and-contradiction-detection
plan: 02
subsystem: memory-graph
tags: [bridge-detection, contradiction-detection, cross-nest, knowledge-graph]
dependency_graph:
  requires: [graph.js, kg.js, kg_triples, kg_entities, memory_entries]
  provides: [discoverBridges, contradiction-detection]
  affects: [store.js, service.js, kg.js]
tech_stack:
  added: []
  patterns: [cross-table-join, contradiction-warning, non-blocking-validation]
key_files:
  created: []
  modified: [src/services/memory/graph.js, src/services/memory/kg.js, src/services/memory/store.js, src/services/memory/service.js]
decisions:
  - "Contradiction detection runs inside transaction after entity resolution but before INSERT"
  - "Contradictions never block writes -- returned as warnings for caller to handle"
  - "Bridge detection uses INNER JOIN through memory_entries for nest resolution"
metrics:
  duration: 1min
  completed: "2026-04-08T06:58:00Z"
  tasks: 3
  files: 4
requirements:
  - TRAV-03
  - CONT-01
  - CONT-02
---

# Phase 05 Plan 02: Bridge Discovery and Contradiction Detection Summary

Cross-nest bridge discovery via entity-memory_entry joins and non-blocking contradiction detection on addTriple with same subject+predicate conflict warnings.

## What Was Done

### Task 1: Add discoverBridges to graph.js
- Appended `discoverBridges(adapter, { nest })` to `src/services/memory/graph.js`
- SQL joins kg_triples -> kg_entities -> memory_entries to compare subject_nest vs object_nest
- Optional nest filter adds `AND (ms.nest = ? OR mo.nest = ?)` clause
- Returns `{ filter_nest, bridge_count, bridges[] }` with both nests labeled per bridge triple
- **Commit:** `e83ba56`

### Task 2: Add contradiction detection to addTriple in kg.js
- Modified `addTriple` in `src/services/memory/kg.js` to check for conflicting triples inside the transaction
- Query: `SELECT t.id, t.object_id, e.name FROM kg_triples t JOIN kg_entities e ... WHERE t.subject_id=? AND t.predicate=? AND t.object_id!=? AND t.valid_to IS NULL`
- Triple is always inserted (never blocked)
- Return object now includes `contradictions[]` and `has_contradiction` boolean
- **Commit:** `ca5e4d9`

### Task 3: Wire discoverBridges through store.js and service.js
- Updated graph.js import in store.js to include `discoverBridges`
- Added `MemoryStore.discoverBridges(args)` with `await this.init()` guard
- Added `MemoryService.discoverBridges(args)` with `this.assertEnabled()` guard
- addTriple contradiction fields flow through existing wiring automatically
- **Commit:** `8dd07ec`

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. Contradiction detection query runs inside the transaction after entity resolution but before the INSERT -- ensures atomicity
2. Contradictions are returned as warnings (never block) so callers decide how to handle conflicts
3. Bridge detection uses INNER JOIN (not LEFT JOIN) on memory_entries -- only entities with explicit nest assignments qualify as bridge endpoints

## Self-Check: PASSED
