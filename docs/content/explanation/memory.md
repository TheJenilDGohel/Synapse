---
title: Persistent Memory
description: Cross-session semantic memory with automatic deduplication, scoped isolation, and teacher-mode instructions.
---

# Persistent Memory

Loci provides **persistent project memory** that survives across sessions, projects, and conversations. Unlike standard context windows that are wiped clean when a chat ends, Loci memory persists in a local SQLite database, allowing AI agents to build a cumulative understanding of your project.

:::important The Statelessness Problem
Modern AI models have massive context windows, but they are still **stateless**. Every new chat is a "blank slate." Loci breaks this cycle by providing a "hard drive" for AI reasoning.
:::

## Key Features

### 1. Teacher-Mode Instructions (`teach`)
The `teach` tool is the primary way to shape an agent's long-term behavior. Use it to record team-wide coding conventions, architectural constraints, or "never do X" rules. 
- **Persistence**: These rules are automatically surfaced via `agent_prime` in future sessions.
- **Priority**: Teacher-mode memories carry higher weight in retrieval.

### 2. Outcome Capture (`capture_outcome`)
The "Winner" state of a task is often the most valuable piece of context for the *next* developer. `capture_outcome` allows an agent to record:
- What was achieved.
- Which files were changed and why.
- Any new "Gotchas" discovered during the process.

### 3. Semantic Deduplication
To prevent "context bloat," Loci uses **Vector Similarity Analysis** (via `sqlite-vec`). When a new memory is stored:
- Loci calculates its cosine similarity against existing records.
- If a near-identical fact exists, the agent is notified to update the existing memory instead of creating a duplicate.

### 4. Scoped Isolation (Nests)
Memories can be isolated into **Nests**. This is critical for developers working on multiple client projects. 
- Context from "Project A" will never bleed into "Project B" unless explicitly requested.

## Memory Tool Suite

| Tool | Capability | Use Case |
| :--- | :--- | :--- |
| `memory_store` | Semantic Persistence | Save a design decision or lesson learned. |
| `memory_recall` | Vector Search | Ask "What did we decide about the API?" |
| `teach` | Rule Ingestion | Record team-wide coding conventions. |
| `capture_outcome`| Outcome Tracking | Log the result of a completed milestone. |
| `agent_prime` | Total Rehydration | Get all relevant lessons at the start of a task. |

## Real-World Workflow: The Learning Loop

1. **Start**: Agent calls `agent_prime` and learns that "We use Vitest for this repo."
2. **Execute**: Agent writes a test using Vitest.
3. **Learn**: Agent discovers that "Vitest needs `jsdom` for this specific module."
4. **Store**: Agent calls `memory_store` to record the `jsdom` requirement.
5. **Close**: Agent calls `capture_outcome` to summarize the new test coverage.
6. **Future**: Next week, a different agent works on the same module and automatically receives the `jsdom` tip.

---

**Next:** See how memories connect to structured architectural facts in the **[Knowledge Graph](temporal)**.

