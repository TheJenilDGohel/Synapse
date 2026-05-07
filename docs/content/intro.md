---
title: Introduction
description: Synapse is a local MCP context server for semantic code search, persistent memory, and a temporal knowledge graph. Zero-cloud, local-first infrastructure for AI agents.
---

# Introduction

**Synapse** is a local context server for MCP-compatible clients.

It gives coding assistants and automation tools a reliable way to search code, remember project facts, and query architectural relationships without sending your data to a hosted service.

:::tip
Synapse is not a model. It is local infrastructure for retrieval, memory, and project context.
:::

## The Problem Synapse Solves

Modern coding assistants often lose project signal between sessions. They may not know the architectural history, recent breaking changes, or lessons learned from past work. They can read files, but they need structured context to reason about a project consistently.

### How Synapse Compares

| Feature | Synapse | Basic Memory | Code Search |
| :--- | :---: | :---: | :---: |
| **Local-First** | ✅ | ✅ | ✅ |
| **Code Intelligence** | ✅ | ❌ | ✅ |
| **Persistent Memory** | ✅ | ✅ | ❌ |
| **Temporal Graph** | ✅ | ❌ | ❌ |
| **Time-Travel Queries** | ✅ | ❌ | ❌ |

## The Three Pillars

Synapse is built on three tightly integrated pillars that give MCP clients a complete picture of your codebase:

1. **[Code Intelligence](pillars/intel)**: Hybrid BM25 + vector search, AST-aware chunking, and symbol resolution (`find_definition`, `find_usages`, `find_callers`).

2. **[Knowledge Graph](pillars/temporal)**: A temporal entity-triple store with multi-hop graph traversal and `as_of` time-travel queries.

3. **[Persistent Memory](pillars/memory)**: Cross-session semantic recall with automatic deduplication and scoped isolation.

## Zero Cloud. Pure Local.

Everything runs on your machine. Your codebase, memories, and knowledge graph are stored in a local SQLite database using the `sqlite-vec` extension. No telemetry, no hosted index, no external API requirement.

Ready to connect a client? Head to the **[Quick Start](quickstart)** guide.

