---
title: Power Controller Reference
description: Detailed technical reference for Synapse MCP tools.
---

# Power Controller Reference

Synapse uses a **Power Controller** model. Instead of dozens of granular tools, we provide high-density controllers that maximize context efficiency for LLMs.

## 1. Memory Management (`synapse_memory_manage`)
Handles the lifecycle of agent memories and workspace events.

| Action | Description |
|:---|:---|
| `store` | Persist a new memory entry. |
| `update` | Update an existing memory (creates a new revision). |
| `delete` | Archive or purge a memory. |
| `ingest` | Import conversations or external documents. |
| `capture_event` | Log background work (git commits, file edits). |

## 2. Memory Query (`synapse_memory_query`)
Retrieves and synthesizes contextual knowledge.

| Action | Description |
|:---|:---|
| `recall` | Semantic vector search across memories. |
| `list` | Filtered list of memories by tags or status. |
| `context` | **The Brain**: Synthesizes task-relevant history in one call. |
| `related` | Traverse the memory knowledge graph. |

## 3. Unified Search (`synapse_search`)
High-performance code and file discovery.

| Action | Description |
|:---|:---|
| `hybrid` | RRF-fused BM25 (lexical) + Vector (semantic) search. |
| `code` | Exact-match text search using Ripgrep. |
| `files` | Fast file path discovery. |

## 4. Symbol Intelligence (`synapse_symbol_query`)
AST-aware symbol tracking for deep code understanding.

| Action | Description |
|:---|:---|
| `definition` | Jump to the declaration of a symbol. |
| `usages` | Find all call sites and references. |
| `callers` | Specifically find what calls a function. |
| `implementations` | Find classes implementing an interface. |

## 5. Workspace Management (`synapse_workspace_manage`)
Explore and read the project structure.

| Action | Description |
|:---|:---|
| `tree` | Directory structure with `compact` grouping. |
| `read` | Bounded file reading with `signatures` mode. |
| `summarize` | Generate a high-level architectural map. |

## 6. System Management (`synapse_system_manage`)
Maintenance and health checks.

| Action | Description |
|:---|:---|
| `index` | Force a refresh of the semantic index. |
| `audit` | Comprehensive self-audit of system integrity. |
| `status` | View runtime metrics and backend info. |

---

:::info Token Efficiency
All controllers support `item_format: 'compact'` or `'lite'`. Use these to get IDs and titles only, saving up to 80% of tokens when processing large result sets.
:::
