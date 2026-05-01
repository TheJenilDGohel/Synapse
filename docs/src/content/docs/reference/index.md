---
title: Tool Overview
description: High-level overview of the 74 available MCP tools.
---

Synapse exposes 74 specialized Model Context Protocol (MCP) tools, organized into functional suites.

## 1. Workspace & Discovery
Navigate your project structure and get high-level summaries.
- `project_tree`, `read_file`, `list_projects`, `summarize_project`.

## 2. Search & Code Intelligence
Find anything in your code using hybrid search and AST awareness.
- `search_hybrid`, `find_definition`, `find_usages`, `find_callers`.

## 3. Memory & Recall
Store and retrieve long-term context with semantic deduplication.
- `memory_store`, `memory_recall`, `memory_capture_event`.

## 4. Knowledge Graph
Manage temporal facts and relationships.
- `kg_add_triple`, `kg_query`, `kg_as_of`, `graph_traverse`.

## 5. Organization
Organize context using Nests, Branches, and Diaries.
- `nest_list`, `nest_tree`, `diary_write`.

## 6. Agent Context
Prime agents and capture task outcomes.
- `agent_prime`, `teach`, `capture_outcome`.

## 7. System & Health
Monitor performance and update Synapse.
- `health`, `server_status`, `audit`, `update_self`.

---

*Note: For detailed parameter documentation, use the `help` or `usage_guide` tools within your MCP client.*
