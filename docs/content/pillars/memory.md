---
title: Persistent Memory
description: Cross-session semantic memory with automatic deduplication, agent-scoped isolation, and relationship tracking.
---

# Persistent Memory

Synapse gives your AI agent a **permanent memory** that survives across sessions, projects, and conversations. Unlike context windows that evaporate when a chat ends, Synapse memory persists in a local SQLite database — and gets smarter every time you use it.

## The Problem With Stateless Agents

Every time you start a new conversation with an AI agent, it starts from zero. You re-explain the architecture. You re-teach the naming conventions. You re-describe why that module was built that way. This isn't a model limitation — it's a missing infrastructure layer.

Synapse provides that layer.

## How Memory Works

When you instruct your agent to remember something, it calls `memory_store`. The content is embedded as a semantic vector and stored in the local database with:

- **Semantic deduplication** — if a similar fact already exists, Synapse merges or flags the conflict rather than creating noise.
- **Agent-scoped isolation** — memories can be tagged to specific tasks, projects, or agents to prevent context bleed.
- **Relationship tracking** — memories can be linked to each other (`memory_add_relation`) for structured recall.

## Core Memory Tools

| Tool | What it does |
|:---|:---|
| `memory_store` | Persist a fact, decision, or lesson learned |
| `memory_recall` | Semantic search across all stored memories |
| `memory_get` | Fetch a specific memory by ID |
| `memory_update` | Update or correct an existing memory |
| `memory_delete` | Remove a stale or incorrect memory |
| `memory_related` | Find memories semantically related to a query |
| `memory_add_relation` | Link two memories together |
| `memory_check_duplicate` | Detect if a near-identical memory already exists |
| `memory_capture_event` | Log a timestamped event (e.g., a deployment, a decision) |
| `memory_events` | Retrieve the full event log for an entity |
| `memory_store_batch` | Store multiple memories in one call |
| `memory_status` | View memory health and storage stats |

## Teaching Your Agent

The `teach` tool is a higher-level wrapper designed for onboarding an agent to a codebase. Use it to batch-teach architectural conventions, team norms, and important historical context:

> *"Teach the agent that all database queries must use the repository pattern and never access ORM models directly from controllers."*

The agent stores this as a persistent memory that influences every future code review, refactor, and generation task.

## Agent Priming

Before starting a complex task, use `agent_prime` to automatically surface the most relevant memories for the current context:

> *"Prime the agent for working on the authentication module."*

Synapse will query all memories related to authentication, security decisions, and past lessons — injecting them directly into the agent's working context.

## Cross-Session Recall

```
User: "What was the reason we moved from REST to GraphQL for the user service?"

Agent calls: memory_recall("REST to GraphQL user service migration reason")
→ Returns: "Migrated on 2024-03-15. REST endpoint fan-out was causing N+1 query issues
   under load. GraphQL batching with DataLoader solved the problem."
```

This recall happens instantly, regardless of whether the original conversation was last week or six months ago.

---

**Next:** Explore how memories connect to architectural decisions in the **[Knowledge Graph](/pillars/temporal)**.
