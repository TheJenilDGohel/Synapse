---
title: Temporal Knowledge Graph
description: A temporal entity-triple store with multi-hop traversal and time-travel queries for tracking architectural intelligence.
---

# Temporal Knowledge Graph

The Synapse Knowledge Graph is a **temporal entity-triple store** built on local SQLite. It allows AI agents to record, query, and reason about architectural facts, module relationships, and decisions—not just as they are *now*, but as they were *at any point in history*.

:::tip Knowledge is More Than Memory
While **[Persistent Memory](memory)** stores facts as semantic blobs (vectors), the Knowledge Graph stores **structured relationships** (triples). This enables complex multi-hop reasoning that vector search alone cannot achieve.
:::

## The Triple Model

Every fact in the graph is stored as a **Subject → Predicate → Object** triple, complete with a timestamp and validity period:

- **Subject**: The source entity (e.g., `AuthService`).
- **Predicate**: The relationship (e.g., `depends_on`).
- **Object**: The target entity (e.g., `PostgreSQL`).

Triples in Synapse are **immutable**. When a relationship changes (e.g., migrating a database), we don't delete the old record; we invalidate it and add a new one. This preserves the "ancestry" of your codebase.

## Key Capabilities

### 1. Time-Travel Queries (`as_of`)
Query the graph as it existed at any point in the past. This is critical for understanding why a bug occurred in a previous version or tracking how a design decision has drifted over time.

### 2. Multi-Hop Traversal
AI agents can follow relationships recursively to analyze the "Blast Radius" of a change.
> *"Which modules will be affected if I change the 'User' database schema?"*

### 3. Integrated Branching
Just like Git, Synapse supports **KG Branches**. You can record experimental architectural changes in a branch without affecting the main "Source of Truth" graph.

## Graph Power Tools

In Synapse v2026.05.0, we provide two unified controllers that handle all graph operations:

| Tool | Action | Use Case |
| :--- | :--- | :--- |
| `synapse_kg_manage` | `add_triple` | Record a new architectural relationship. |
| `synapse_kg_manage` | `delete_entity` | Purge a module and its relationships. |
| `synapse_kg_manage` | `ingest_markdown` | Import a set of facts from a document. |
| `synapse_kg_query` | `traverse` | Perform a recursive path-finding search. |
| `synapse_kg_query` | `get_state` | View the graph as it was on a specific date. |
| `synapse_kg_query` | `timeline` | See the history of a specific module. |

## Real-World Workflow: Tracking an ADR

When making an Architectural Decision (ADR), Synapse turns it into a living part of the graph:

1. **Register**: Use `synapse_kg_manage(action="add_entity")` for `ADR-007`.
2. **Link**: Use `add_triple` to connect `ADR-007` to every affected module.
3. **Persist**: Store the full decision text in [Persistent Memory](memory).

Six months later, an AI agent working on one of those modules will automatically pull `ADR-007` into its context, ensuring the original design constraints are respected.

---

**Next:** See how the graph integrates with code-level context in **[Code Intelligence](intel)**.
