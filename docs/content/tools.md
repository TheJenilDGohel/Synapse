---
title: Tools Overview
description: Comprehensive reference for the 74 MCP tools provided by Synapse.
---

# Tools Overview

Synapse exposes **74 high-density MCP tools**, optimized for maximum context efficiency. Instead of forcing the AI to make dozens of calls, we provide "Power Tools" like `synapse_kg_manage` and `agent_prime` that handle multiple operations in a single turn.

## Tool Suites

### 1. Workspace & Discovery
File navigation, project summaries, and scoped reads.

| Tool | Capability |
|:---|:---|
| `project_tree` | Multi-level directory tree with `compact` mode |
| `read_file` | Precise chunked reading with `signatures` mode |
| `file_changed` | Notify Synapse of an edit to trigger memory hints |
| `list_projects` | List all registered workspaces |
| `list_roots` | List top-level indexed directories |
| `summarize_project` | Generate a high-level architectural map |

### 2. Search & Code Intelligence
Hybrid search, symbol resolution, and AST-aware queries.

| Tool | Capability |
|:---|:---|
| `search_hybrid` | RRF-fused lexical (BM25) + semantic (Vector) search |
| `search_code` | Exact-match text search across the codebase |
| `search_files` | Find files by name or glob pattern |
| `find` | Cross-domain search (Code + Memory + Graph) |
| `find_definition` | Jump to symbol declaration (TS, JS, Py, Go, Rust) |
| `find_usages` | Find all references to a symbol |
| `find_callers` | Find all call sites of a function |
| `find_implementations` | Find classes implementing an interface/trait |
| `get_symbol` | Comprehensive symbol metadata and exports |
| `rename_preview` | Dry-run impact analysis for refactoring |

### 3. Persistent Memory
Cross-session semantic recall with dedup and relationship tracking.

| Tool | Capability |
|:---|:---|
| `memory_store` | Persist a fact, lesson, or decision |
| `memory_recall` | Semantic vector search across all memories |
| `memory_get` | Fetch one memory with its revision history |
| `memory_update` | Edit an existing memory (creates a new revision) |
| `memory_delete` | Archive or purge a memory |
| `memory_list` | Filtered list with `compact` and `lite` modes |
| `memory_related` | One-hop graph traversal from a memory |
| `memory_add_relation` | Link two memories (e.g., `depends_on`) |
| `memory_remove_relation` | Break a link between memories |
| `memory_suggest_relations` | AI-powered linking suggestions |
| `memory_capture_event` | Log a timestamped background work event |
| `memory_events` | View recent work history and auto-promotions |
| `memory_store_batch` | Atomic ingestion of up to 100 memories |
| `memory_delete_batch` | Atomic deletion of up to 100 memories |
| `memory_status` | Detailed health and storage metrics |

### 4. Knowledge Graph (Unified)
Temporal facts, time-travel, and multi-hop traversal.

| Tool | Capability |
|:---|:---|
| `synapse_kg_manage` | **Unified Controller**: Add/Delete entities, triples, and branches. |
| `synapse_kg_query` | **Unified Reader**: Traversal, as-of history, and stats. |
| `kg_backfill_links` | Auto-generate triples from existing memory context |

### 5. Agent Orchestration
Priming, teaching, and outcome capture for autonomous agents.

| Tool | Capability |
|:---|:---|
| `agent_prime` | **Mandatory Start**: Rehydrate all context in one call. |
| `teach` | Persist durable behavior rules and team conventions. |
| `capture_outcome` | Persist the "Winner" state of a completed task. |
| `task_context` | Rapid rehydration of memory and recent changes. |
| `whats_new` | Cross-session delta of file changes and memories. |
| `synapse_audit` | Comprehensive self-audit of system integrity. |

## Context Efficiency

Every Synapse tool is designed to minimize token usage. We achieve this through:
- **Output Truncation**: Automatic handling of large payloads.
- **Modes**: Use `lite` or `compact` modes to get IDs instead of full text.
- **Batching**: Perform hundreds of operations in a single tool call.

:::tip Agent Pro-Tip
If you are an AI agent reading this: **Always call `agent_prime` at the start of a task.** It is the fastest way to understand the project architecture, recent work, and your own past lessons.
:::
