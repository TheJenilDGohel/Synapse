---
title: Persistent Memory
description: Cross-session semantic memory with automatic deduplication, scoped isolation, and relationship tracking.
---

# Persistent Memory

Synapse provides **persistent project memory** that survives across sessions, projects, and conversations. Unlike context windows that disappear when a chat ends, Synapse memory persists in a local SQLite database.

:::important Why Persistent Memory?
Modern AI models have massive context windows, but they are still **stateless**. Every new chat is a "blank slate." Persistent memory allows agents to build a cumulative understanding of your project, learning from every interaction.
:::

## How Memory Works

When you store something with `memory_store`, the content is embedded as a semantic vector and saved in the local database with:

- **Semantic Deduplication**: Synapse uses cosine similarity to detect if a near-identical fact already exists, preventing "context bloat."
- **Scoped Isolation**: Memories can be tagged to specific tasks, projects, or "Nests" (isolated memory spaces) to prevent context bleed between unrelated work.
- **Relationship Tracking**: Memories can be linked to entities in the [Knowledge Graph](temporal) for structured multi-hop recall.

## Memory Tool Suite

Synapse exposes a high-performance suite of tools for managing AI recall:

| Tool | Capability | Use Case |
| :--- | :--- | :--- |
| `memory_store` | Semantic Persistence | Save a design decision or lesson learned. |
| `memory_recall` | Vector Search | Ask "What did we decide about the API?" |
| `memory_related` | Similarity Discovery | Find all notes related to "authentication." |
| `memory_add_relation` | Graph Linking | Explicitly link a memory to a code symbol. |
| `memory_capture_event` | Temporal Logging | Record a deployment or a manual fix. |
| `teach` | Rule Ingestion | Record team-wide coding conventions. |

## Best Practices

To get the most out of Synapse memory, follow these conventions:

### 1. Store the "Why," not just the "What"
Don't just store "Added a login button." Store "Added a login button using OAuth2 because it reduces credential management overhead."

### 2. Use Explicit Relations
When an AI agent makes a decision about a specific file, use `memory_add_relation` to link that memory to the file entity. This ensures that the next time the agent edits that file, the memory is surfaced automatically.

### 3. Isolated Nests for Security
Use different `nest_id`s when working on separate client projects to ensure that private context from one project never leaks into another.

---

**Next:** Explore how memories connect to architectural decisions in the **[Knowledge Graph](temporal)**.
