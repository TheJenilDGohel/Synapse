---
phase: "07"
plan: "01"
subsystem: memory/dedup
tags: [dedup, embedding, cosine-similarity, semantic]
dependency-graph:
  requires: [retrieval/core/relevance.js, retrieval/embedding/service.js]
  provides: [memory/dedup.js, checkDuplicate API]
  affects: [memory/entries.js, memory/event-capture.js, memory/store.js, memory/service.js]
tech-stack:
  added: []
  patterns: [cosine-similarity gate, embedding comparison, configurable threshold]
key-files:
  created: [src/services/memory/dedup.js]
  modified: [src/services/memory/entries.js, src/services/memory/event-capture.js, src/services/memory/store.js, src/services/memory/service.js]
key-decisions:
  - "Default threshold 0.92 for semantic similarity -- high enough to avoid false positives"
  - "Max 200 candidate entries compared per check -- recent-first ordering for relevance"
  - "Scope filtering by nest, branch, projectPath narrows comparison set"
  - "Graceful degradation when embeddings disabled -- returns isDuplicate: false"
  - "Dedup in event-capture runs before merge candidate check for early exit"
metrics:
  duration: 2min
  completed: 2026-04-08
---

# Phase 7 Plan 01: Embedding Similarity Gate and Integration Summary

Cosine similarity dedup gate using existing MiniLM-L6-v2 embeddings, wired into storeEntry and event-capture promotion flow with configurable 0.92 threshold.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create dedup.js with checkDuplicate | 5afc5cb | src/services/memory/dedup.js |
| 2 | Wire dedup into entries, event-capture, store, service | 4254eb9 | entries.js, event-capture.js, store.js, service.js |

## Requirements Satisfied

- DEDUP-01: System checks embedding similarity before storing (threshold 0.92 default, configurable)
- DEDUP-02: User can check for duplicates via service.checkDuplicate(content, { threshold })
- DEDUP-03: Duplicate detection returns matching entry (id, title, similarity score)
- DEDUP-04: Event capture pipeline runs dedup check before auto-promotion

## Decisions Made

1. **Default threshold 0.92**: High enough to catch near-duplicates without false positives on merely similar content
2. **Max 200 candidates**: Limits comparison set to recent entries, ordered by updated_at DESC
3. **Scope filtering**: nest/branch/projectPath narrow candidates for performance
4. **Graceful degradation**: When embeddings are disabled or fail, checkDuplicate returns { isDuplicate: false } -- never blocks writes
5. **Dedup before merge in event-capture**: Early exit skips merge candidate lookup when semantic duplicate found

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all data paths are wired to real embedding and similarity comparison.

## Self-Check: PASSED

- src/services/memory/dedup.js: FOUND
- Commit 5afc5cb: FOUND
- Commit 4254eb9: FOUND
