---
title: Tools Overview
description: All 74 MCP tools provided by Synapse — organized by functional suite.
---

# Tools Overview

Synapse exposes **74 specialized MCP tools** via the Model Context Protocol. Every tool runs locally — no cloud, no external APIs.

## Tool Suites

### 1. Workspace & Discovery
File navigation, project summaries, and scoped reads.

| Tool | Description |
|:---|:---|
| `project_tree` | Directory structure with smart filtering |
| `read_file` | Optimized file reading for large codebases |
| `file_changed` | Check if a file has changed since last index |
| `list_projects` | List all registered Synapse projects |
| `list_roots` | List indexed workspace roots |
| `summarize_project` | Generate a high-level architectural map |

### 2. Search & Code Intelligence
Hybrid search, symbol resolution, and AST-aware queries.

| Tool | Description |
|:---|:---|
| `search_hybrid` | Fused BM25 + vector retrieval (primary search) |
| `search_code` | Code-specific semantic search |
| `search_files` | Find files by name or path pattern |
| `find` | Low-level text/regex search |
| `find_definition` | Symbol definition lookup |
| `find_usages` | All references to a symbol |
| `find_callers` | All callers of a specific function |
| `find_implementations` | Implementations of interfaces/abstract classes |
| `get_symbol` | Symbol metadata and export info |
| `rename_preview` | Impact analysis for symbol renames |

### 3. Persistent Memory
Cross-session recall with semantic deduplication and relationship tracking.

| Tool | Description |
|:---|:---|
| `memory_store` | Persist a fact or lesson |
| `memory_recall` | Semantic search across stored memories |
| `memory_get` | Fetch a specific memory by ID |
| `memory_update` | Update or correct an existing memory |
| `memory_delete` | Remove a stale memory |
| `memory_list` | List memories with optional filters |
| `memory_related` | Find semantically related memories |
| `memory_add_relation` | Link two memories together |
| `memory_remove_relation` | Remove a link between memories |
| `memory_check_duplicate` | Detect near-identical existing memories |
| `memory_capture_event` | Log a timestamped event |
| `memory_events` | Retrieve the event log for an entity |
| `memory_store_batch` | Batch-store multiple memories |
| `memory_delete_batch` | Batch-delete memories |
| `memory_status` | Memory health and storage stats |
| `memory_suggest_relations` | AI-suggested links between memories |

### 4. Knowledge Graph
Temporal triples, time-travel queries, and multi-hop traversal.

| Tool | Description |
|:---|:---|
| `kg_add_entity` | Register a new entity |
| `kg_add_triple` | Record a relationship between entities |
| `kg_query` | Graph query with temporal filters |
| `kg_as_of` | Time-travel query at a past date |
| `kg_timeline` | Full history of changes to an entity |
| `kg_invalidate` | Mark a relationship as outdated |
| `kg_stats` | Graph health and coverage metrics |
| `graph_traverse` | Multi-hop relationship traversal |
| `graph_bridges` | Find critical bridge nodes in the graph |
| `kg_add_entities_batch` | Batch-register multiple entities |
| `kg_add_triples_batch` | Batch-record multiple relationships |
| `kg_backfill_links` | Link entities found in memory to the graph |

### 5. Agent Context
Priming, teaching, and outcome capture for autonomous agents.

| Tool | Description |
|:---|:---|
| `agent_prime` | Surface relevant memories before a task |
| `teach` | Batch-teach the agent project conventions |
| `capture_outcome` | Log the result of a completed task |
| `task_context` | Initialize task-scoped memory isolation |
| `whats_new` | Surface recent changes and updates |

## Live Tool List

Below is the live list of tools currently active in your Synapse instance:

<tools-list />

:::tip
For deep-dives on specific tool parameters and usage patterns, see the individual pillar pages: **[Code Intelligence](/pillars/intel)**, **[Knowledge Graph](/pillars/temporal)**, and **[Persistent Memory](/pillars/memory)**.
:::
