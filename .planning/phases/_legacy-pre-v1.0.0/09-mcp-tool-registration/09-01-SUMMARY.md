---
phase: "09"
plan: "01"
subsystem: mcp-tools
tags: [mcp, tools, knowledge-graph, nest, graph, diary, ingest, dedup]
dependency_graph:
  requires: [kg.js, graph.js, taxonomy.js, scopes.js, dedup.js, ingest.js, service.js, store.js]
  provides: [graph-tools.js]
  affects: [index.js, register-tools.js]
tech_stack:
  added: []
  patterns: [registerJsonTool pattern, zod schema validation, tool annotations]
key_files:
  created: [src/mcp/tools/graph-tools.js]
  modified: [src/mcp/tools/index.js, src/app/register-tools.js]
decisions:
  - All 17 tools in single registrar file (377 lines, under 500 limit)
  - Tool naming follows synapse_ prefix convention with domain grouping (kg_, nest_, graph_, diary_, ingest_)
  - Dedup tool uses synapse_memory_check_duplicate to stay in memory namespace
metrics:
  duration: 2min
  completed: 2026-04-08
---

# Phase 9 Plan 1: MCP Tool Registration for Graph, Nest, Diary, Ingest, and Dedup Summary

17 MCP tools registered covering KG CRUD/temporal, nest/branch taxonomy, graph traversal, agent diary, conversation ingestion, and semantic dedup -- all following the registerJsonTool pattern with zod schemas and tool annotations.

## What Was Done

### Task 1: Create graph-tools.js registrar
Created `src/mcp/tools/graph-tools.js` with `registerGraphTools()` function registering 17 tools:

| Category | Count | Tools |
|----------|-------|-------|
| KG (synapse_kg_*) | 7 | add_entity, add_triple, query, invalidate, as_of, timeline, stats |
| Nest (synapse_nest_*) | 3 | list, branches, tree |
| Graph (synapse_graph_*) | 2 | traverse, bridges |
| Diary (synapse_diary_*) | 2 | write, read |
| Ingest (synapse_ingest_*) | 2 | markdown, json |
| Dedup | 1 | synapse_memory_check_duplicate |

Each tool has:
- Zod input schemas matching service method signatures
- Tool annotations (readOnlyHint, destructiveHint, idempotentHint, openWorldHint)
- Snake_case MCP params mapped to camelCase service args

### Task 2: Wire into index.js and register-tools.js
- Added `registerGraphTools` export to `src/mcp/tools/index.js`
- Imported and called `registerGraphTools` in `src/app/register-tools.js`

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 7d4de1c | 17 MCP tools in graph-tools.js |
| 2 | 87d5275 | Wire into index.js and register-tools.js |

## Deviations from Plan

None -- plan executed exactly as written.

## Requirements Fulfilled

- TOOL-01: All knowledge graph operations exposed as synapse_kg_* MCP tools
- TOOL-02: All nest/branch operations exposed as synapse_nest_* MCP tools
- TOOL-03: All graph traversal operations exposed as synapse_graph_* MCP tools
- TOOL-04: Agent diary operations exposed as synapse_diary_* MCP tools
- TOOL-05: Conversation ingestion exposed as synapse_ingest_* MCP tools
- TOOL-06: Duplicate check exposed as synapse_memory_check_duplicate MCP tool
