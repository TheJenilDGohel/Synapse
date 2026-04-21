---
phase: 04-nest-branch-hierarchy
plan: 02
subsystem: memory
tags: [taxonomy, nest, branch, query, hierarchy]
dependency_graph:
  requires: [04-01]
  provides: [taxonomy-queries, nest-listing, branch-listing, taxonomy-tree]
  affects: [store, service]
tech_stack:
  added: []
  patterns: [group-by-aggregation, facade-delegation, map-accumulator]
key_files:
  created:
    - src/services/memory/taxonomy.js
  modified:
    - src/services/memory/store.js
    - src/services/memory/service.js
decisions:
  - listNests filters status=active and nest!='' for meaningful results
  - listBranches requires nest parameter with validation
  - getTaxonomyTree uses Map accumulator for O(n) single-pass aggregation
  - Taxonomy methods follow same init-then-delegate pattern as existing store methods
metrics:
  duration: 1min
  completed: 2026-04-08
---

# Phase 04 Plan 02: taxonomy.js + Wiring Summary

Taxonomy query module with listNests, listBranches, getTaxonomyTree -- SQL GROUP BY aggregations wired through MemoryStore and MemoryService facades.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create taxonomy.js with listNests, listBranches, getTaxonomyTree | f082870 | src/services/memory/taxonomy.js |
| 2 | Wire taxonomy.js into MemoryStore and MemoryService | f3e8fdc | src/services/memory/store.js, service.js |

## What Was Done

1. **taxonomy.js**: Created new module with three exported async functions. `listNests` returns all nests with their memory counts via `GROUP BY nest`. `listBranches` accepts a nest parameter and returns branches within that nest via `GROUP BY branch WHERE nest = ?`. `getTaxonomyTree` returns a full nested tree structure with `total_nests`, `total_branches`, `total_memories`, and nested arrays using Map accumulator for single-pass aggregation.

2. **MemoryStore wiring**: Imported all three functions from taxonomy.js with aliased names. Added `listNests()`, `listBranches(nest)`, and `getTaxonomyTree()` methods following the existing `await this.init()` then delegate pattern.

3. **MemoryService wiring**: Added `listNests()`, `listBranches(nest)`, and `getTaxonomyTree()` methods following the existing `this.assertEnabled()` then delegate pattern.

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all taxonomy queries are fully wired from taxonomy.js through store and service.

## Self-Check: PASSED

All files found, all commits verified (f082870, f3e8fdc).
