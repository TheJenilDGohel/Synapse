---
title: Core Concepts
description: Deep dive into Temporal Knowledge Graphs, Memory Nests, and the Unified Context Layer.
---

# Core Concepts

To master Synapse, you must understand the underlying concepts that power its "Neural" approach to context.

## 1. Temporal Knowledge Graph

Unlike a static database, the Synapse Knowledge Graph is **temporal**. It doesn't just store what is true now; it stores how facts have evolved.

### The Triple Model
Every fact is stored as a **Subject → Predicate → Object** triple.
- **Subject**: An entity (e.g., `AuthService`).
- **Predicate**: A relationship (e.g., `uses`).
- **Object**: Another entity or value (e.g., `JWT`).

### Time-Travel Querying (`as_of`)
Every triple has a `valid_from` and `valid_to` timestamp. This allows you to ask the engine:
> "What did the Auth architecture look like on 2026-04-15?"

This is critical for AI agents that need to understand the history of breaking changes or the rationale behind an old architectural pattern.

---

## 2. Memory Nests & Scoping

Synapse uses **Nests** to solve the "Context Sprawl" problem. If an agent remembers everything from every project, it becomes confused and inaccurate.

### Isolation by Design
- **Nests**: Isolated namespaces for different agents or major projects.
- **Branches**: Sub-segments within a nest (e.g., `feat/auth-v2`).
- **Scopes**: Fine-grained metadata attached to every memory (project, topic, feature).

When you call `task_context`, Synapse uses these scopes to "prune" the search space, ensuring the agent only sees the $1\%$ of memories that actually matter for the current task.

---

## 3. The Unified Context Layer

Synapse is more than the sum of its parts. Its true power comes from **Unification**:

1.  **Automatic Resolution**: When you store a memory about a function, Synapse automatically links that memory to the AST node in the Knowledge Graph.
2.  **Hybrid RAG**: When you search for "auth", Synapse simultaneously queries:
    - The **Vector Index** for semantically similar code.
    - The **Memory Store** for relevant developer lessons.
    - The **Knowledge Graph** for related dependencies.
3.  **Outcome Capture**: After a task, Synapse captures the "Winner" (the final implemented logic) and marks past "Losers" (failed attempts) as stale, preventing the agent from repeating mistakes.

---

## 4. Power Controllers (High-Density I/O)

Traditional MCP designs treat the AI like a human, providing small, granular tools. Synapse treats the AI as a **high-bandwidth logic engine**.

Our Power Controllers (e.g., `synapse_agent_prime`) are designed to return a **dense context bundle** in a single round-trip. This:
- Reduces token overhead (less tool-call preamble).
- Prevents "Tool Fatigue" where the AI gets lost in a sequence of calls.
- Provides all necessary information (files + symbols + memories) for a reasoning step at once.
