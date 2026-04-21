---
phase: 02-knowledge-graph-core
plan: 01
subsystem: memory/knowledge-graph
tags: [schema, migration, entities, triples, crud]
dependency_graph:
  requires: [01-01]
  provides: [kg_entities-table, kg_triples-table, kg-crud-module]
  affects: [02-02, 03-01, 05-01, 08-02, 09-01]
tech_stack:
  added: []
  patterns: [adapter-passthrough, slug-normalization, insert-or-ignore-upsert]
key_files:
  created:
    - src/services/memory/kg.js
  modified:
    - src/services/memory/schema.js
decisions:
  - "Entity IDs use slug normalization (lowercase, underscore-separated) for deterministic deduplication"
  - "Triples use random UUID prefixed with triple_ to avoid collisions"
  - "addEntity uses INSERT OR IGNORE + UPDATE updated_at pattern for idempotent upsert"
  - "queryEntityRelationships uses UNION dedup for 'both' direction to avoid duplicate triples"
metrics:
  duration: 2min
  completed: 2026-04-08
  tasks: 2
  files: 2
---

# Phase 02 Plan 01: Schema v6 Migration and KG CRUD Summary

Schema v6 migration adds kg_entities and kg_triples tables with 7 indexes; kg.js provides entity/triple CRUD with slug-normalized IDs, provenance tracking via source_memory_id, and direction-filtered relationship queries.

## What Was Done

### Task 1: Schema v6 Migration (294c692)
- Bumped SCHEMA_VERSION from 5 to 6
- Added v6 migration creating kg_entities table (id, name, entity_type, properties_json, memory_id, created_at, updated_at)
- Added kg_triples table (id, subject_id, object_id, predicate, valid_from, valid_to, confidence, source_memory_id, source_type, created_at)
- Created 7 indexes: entity type, entity memory, triple subject, triple object, triple predicate, triple validity range, triple source
- Foreign keys from kg_triples to kg_entities on subject_id and object_id

### Task 2: kg.js CRUD Module (c85df93)
- Created src/services/memory/kg.js (204 lines) with 5 exported async functions + 1 re-export
- addEntity: slug-normalized IDs, INSERT OR IGNORE with UPDATE fallback for idempotent upsert
- getEntity: returns entity with parsed properties and current outgoing/incoming triples
- addTriple: random UUID, confidence clamping 0.0-1.0, provenance via source_memory_id
- invalidateTriple: sets valid_to on currently-valid triples
- queryEntityRelationships: direction filtering (outgoing/incoming/both), excludes invalidated triples by default
- normalizeEntityId exported as alias of internal toSlug helper

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 294c692 | feat(02-01): add v6 migration for kg_entities and kg_triples tables |
| 2 | c85df93 | feat(02-01): create kg.js with entity and triple CRUD functions |

## Verification Results

- SCHEMA_VERSION is 6
- All 6 kg.js exports verified importable
- normalizeEntityId('Alice O\'Brien') returns 'alice_o_brien'
- normalizeEntityId('  Project Synapse  ') returns 'project_synapse'
- File is 204 lines (under 250 limit)
