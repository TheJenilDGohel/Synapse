---
phase: 08
title: Memory Service Consolidation
---

# Plan: Memory Service Consolidation

## Objective
Fix the "spaghetti" maintainability issues inside `src/services/memory`. Consolidate overlapping files/directories and enforce single-responsibility bounded contexts for memory operations.

## Current Pain Points
- The folder `src/services/memory` suffers from extreme directory/file collision code-smells:
  - `store.ts` vs `store/`
  - `workflow.ts` vs `workflow/`
  - `types.ts` vs `types/`
- Files like `utils.ts` (11KB+) and `store.ts` (20KB+) are massive monoliths.
- Features like `ingest` (which handles ML text processing like classification and NER) are tightly coupled.

## Approach
1. **Unify Collisions**: Determine if `workflow.ts` should be an `index.ts` inside `workflow/`, or vice-versa. Move contents appropriately and delete the redundant files.
2. **Decompose Monoliths**: Break `store.ts` into smaller query-specific files or domain repositories (e.g. `graph-store`, `semantic-store`).
3. **Decouple Ingest Logic**: Formalize `src/services/memory/ingest` into a clean processing pipeline that takes raw inputs and outputs ready-to-save Memory blocks, using index/barrel exports.

## Success Criteria
- No files share the same name as a directory in `src/services/memory`.
- Decrease maximum file size in the module; logic is segmented clearly.
- Imports across the codebase resolve cleanly.
