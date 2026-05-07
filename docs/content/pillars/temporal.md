---
title: Knowledge Graph
description: A temporal entity-triple store with multi-hop traversal and time-travel queries for tracking architectural decisions over time.
---

# Knowledge Graph

The Synapse Knowledge Graph is a **temporal entity-triple store** built on local SQLite. It lets your AI agent record, query, and reason about architectural facts, module relationships, and decisions — not just as they are *now*, but as they were *at any point in time*.

## Beyond Simple Memory

While **[Persistent Memory](/pillars/memory)** stores facts as semantic blobs, the Knowledge Graph stores **structured relationships** between entities. The difference:

- **Memory**: *"We use JWT with 15-minute expiry."*
- **Knowledge Graph**: `AuthService` → `uses` → `JWT` (with expiry metadata, recorded on a specific date)

This structure enables multi-hop reasoning: *"What services depend on AuthService, and when were those dependencies established?"*

## The Triple Model

Every fact in the graph is stored as a **Subject → Predicate → Object** triple with a timestamp:

```
kg_add_triple({
  subject: "AuthService",
  predicate: "depends_on",
  object: "UserRepository",
  valid_at: "2024-03-01"
})
```

Triples are immutable. When a relationship changes, you don't edit — you add a new triple and invalidate the old one. This gives you a complete history of how your architecture evolved.

## Time-Travel Queries

The `kg_as_of` tool lets you query the graph as it existed at any point in the past:

```
kg_as_of({
  subject: "PaymentService",
  as_of: "2024-01-15"
})
→ Returns the full relationship map of PaymentService as of January 15th, 2024
```

This is invaluable for debugging: *"What did the system look like before the outage?"* or *"What changed in the auth flow between v1.2 and v1.4?"*

## Multi-Hop Graph Traversal

Use `graph_traverse` to walk the dependency graph across multiple hops:

> *"Which services are indirectly affected if I change the database connection pool?"*

Synapse traverses the graph recursively, identifying the full blast radius of a proposed change — before a single line of code is written.

## Core Knowledge Graph Tools

| Tool | What it does |
|:---|:---|
| `kg_add_entity` | Register a new entity (module, service, decision, person) |
| `kg_add_triple` | Record a relationship between two entities |
| `kg_query` | Search the graph with optional temporal filters |
| `kg_as_of` | Time-travel query — see the graph at a past date |
| `kg_timeline` | View the full history of changes to an entity |
| `kg_invalidate` | Mark a relationship as no longer true |
| `kg_stats` | View graph health and coverage metrics |
| `graph_traverse` | Multi-hop relationship traversal |
| `graph_bridges` | Find critical bridge nodes in the dependency graph |
| `kg_add_entities_batch` | Batch-register multiple entities at once |
| `kg_add_triples_batch` | Batch-record multiple relationships |
| `kg_backfill_links` | Retroactively link entities found in memory to the graph |

## Real-World Example: Tracking an Architectural Decision

```
1. Record the decision entity:
   kg_add_entity({ name: "ADR-007", type: "Decision",
     description: "Migrate from MongoDB to PostgreSQL" })

2. Record relationships:
   kg_add_triple({ subject: "ADR-007", predicate: "affects", object: "UserService" })
   kg_add_triple({ subject: "ADR-007", predicate: "affects", object: "OrderService" })
   kg_add_triple({ subject: "ADR-007", predicate: "decided_by", object: "Jenil" })

3. Query six months later:
   kg_query({ subject: "ADR-007" })
   → Returns all affected services, the decision maker, and the full timeline
```

No more lost context. Every architectural decision is permanently traceable.

---

**Next:** See how the graph integrates with code-level context in **[Code Intelligence](/pillars/intel)**.
