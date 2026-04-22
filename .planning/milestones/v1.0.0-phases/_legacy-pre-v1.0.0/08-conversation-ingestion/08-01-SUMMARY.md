---
phase: "08"
plan: "01"
subsystem: memory/ingestion
tags: [conversation, markdown, json, entity-extraction, dedup, knowledge-graph]
dependency_graph:
  requires: [entries.js, kg.js, dedup.js, schema.js]
  provides: [ingest.js, conversation_sources table]
  affects: [store.js, service.js, schema.js]
tech_stack:
  added: []
  patterns: [rule-based entity extraction, SHA-256 re-ingestion tracking, per-turn dedup pipeline]
key_files:
  created: [src/services/memory/ingest.js]
  modified: [src/services/memory/schema.js, src/services/memory/store.js, src/services/memory/service.js]
decisions:
  - Schema v9 adds conversation_sources table with unique index on (file_path, file_hash)
  - Markdown parser handles 3 role patterns (## Role, **Role:**, Role:) with human/ai normalization
  - Entity extraction uses 5 regex pattern types (capitalized phrases, quoted terms, file paths, URLs, ALL_CAPS)
  - KG triples use mentioned_by and co_occurs_with predicates with 0.7 and 0.5 confidence respectively
  - Per-turn dedup threshold 0.92 matches Phase 7 default
  - Turn importance set to 30 (low) since conversation turns are high-volume
metrics:
  duration: 3min
  completed: 2026-04-08
---

# Phase 8 Plan 1: Conversation Ingestion Summary

Markdown and JSON conversation parsers with per-turn memory storage, regex-based entity extraction for KG triples, semantic dedup per turn, and SHA-256 file hash re-ingestion tracking via schema v9 conversation_sources table.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Schema v9 migration for conversation_sources | 59f0b8c | schema.js |
| 2 | Create ingest.js with parsers, entity extraction, dedup | de6c740 | ingest.js |
| 3 | Wire ingest methods through store.js and service.js | e7ba368 | store.js, service.js |

## Decisions Made

1. **Schema v9 conversation_sources table**: Tracks ingested files by path + SHA-256 hash with unique composite index for O(1) re-ingestion detection
2. **Three Markdown role patterns**: `## Role`, `**Role:**`, `Role:` covers common conversation export formats; human/ai aliases normalize to user/assistant
3. **Five entity extraction regex types**: Capitalized multi-word phrases, quoted terms, file paths, URLs, and ALL_CAPS identifiers -- with 100+ stop words to reduce noise
4. **KG triple predicates**: `mentioned_by` (entity->role, confidence 0.7) and `co_occurs_with` (entity->entity, confidence 0.5) -- limited to first 10 entities per turn to avoid quadratic explosion
5. **Turn importance 30**: Conversation turns are high-volume/low-signal; keeps them below manually-created memories (default 50)

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all functions are fully wired with real data flows.
