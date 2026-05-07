---
title: Temporal Knowledge Graph
description: A temporal entity-triple store with multi-hop traversal and time-travel queries for tracking architectural decisions over time.
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

### 2. Blast Radius Analysis
Use `graph_traverse` to calculate the recursive impact of a change.
> *"If I modify the User schema, which 3rd-level downstream services will be affected?"*

### 3. Structural Reasoning
Find bridges and bottlenecks in your architecture with `graph_bridges`. Identify which modules are single points of failure before they cause production issues.

## Graph Tool Suite

| Tool | Capability | Use Case |
| :--- | :--- | :--- |
| `kg_add_triple` | Fact Recording | Link `UserService` to `Redis` cache. |
| `kg_as_of` | Temporal Recall | View the architecture as of `2024-01-01`. |
| `graph_traverse` | Multi-hop Path | Trace dependencies across 5+ services. |
| `kg_timeline` | Entity History | See every decision that affected `AuthModule`. |
| `graph_bridges` | Network Analysis | Find critical dependencies in the graph. |
| `kg_backfill_links` | Auto-Linking | Convert memory blobs into structured triples. |

## Real-World Workflow: Tracking an ADR

When making an Architectural Decision (ADR), Synapse turns it into a living part of the graph:

1. **Register the Decision**: `kg_add_entity` for `ADR-007`.
2. **Link the Impact**: `kg_add_triple` between `ADR-007` and every affected module.
3. **Link the Owner**: `kg_add_triple` between `ADR-007` and the developer.

Six months later, an AI agent working on one of those modules will automatically pull `ADR-007` into its context, ensuring the original design constraints are respected.

---

**Next:** See how the graph integrates with code-level context in **[Code Intelligence](intel)**.
