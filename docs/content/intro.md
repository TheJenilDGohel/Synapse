---
title: Introduction | Synapse
description: Synapse is the minimalist transmission layer for AI context. Bio-inspired persistent memory, temporal knowledge graph, and semantic code search for elite AI agents.
keywords: AI, Agents, MCP, Semantic Search, Knowledge Graph
---

# Introduction

**Synapse** is the minimalist transmission layer for AI project context.

It provides coding assistants and automation agents with a reliable, bio-inspired system for **persistent memory**, **temporal knowledge graphs**, and **semantic code intelligence**—all running entirely on your machine.

:::tip The Philosophy: Bridging the Signal Gap
In biology, a synapse is the specialized gap between neurons where signals pass. In the AI ecosystem, Synapse is that gap. We ensure the "signal" of architectural history, design decisions, and project intelligence reaches your AI agent with zero friction.
:::

## The Problem Synapse Solves

Every AI task fails because of a **loss of signal**. 

Standard AI agents lose context between sessions. They don't know the "why" behind a refactor, the recent breaking changes, or the specific lessons learned from past attempts. They can read your files, but they lack the **project intelligence** to reason about them consistently over time.

Synapse bridges this gap.

## How Synapse Compares

No other MCP server combines all three pillars into a single, local-first system.

| Pillar | Synapse | Mem0 | GitNexus | code-context |
| :--- | :---: | :---: | :---: | :---: |
| **Persistent AI Memory** | ✅ | ✅ | ❌ | ❌ |
| **Temporal Knowledge Graph** | ✅ | ❌ | ❌ | ❌ |
| **Semantic Code Search** | ✅ | ❌ | ✅ | ✅ |
| **AST-Aware Chunking** | ✅ | ❌ | ✅ | ❌ |
| **Local-First / No Cloud** | ✅ | ⚠️ | ✅ | ⚠️ |
| **MCP Tools (v2026.05.0)** | **74** | 8 | 16 | ~10 |

## The Three Pillars

Synapse is built on three tightly integrated systems that provide a complete picture of your codebase:

1. **[Code Intelligence](pillars/intel)**: Hybrid BM25 + vector search, AST-aware chunking, and precise symbol resolution (`find_definition`, `find_usages`, `find_callers`).

2. **[Knowledge Graph](pillars/temporal)**: A temporal entity-triple store with multi-hop traversal and `as_of` time-travel queries for tracking architectural evolution.

3. **[Persistent Memory](pillars/memory)**: Cross-session semantic recall with automatic deduplication, scoped isolation, and teacher-mode instructions.

## Zero Cloud. Pure Local.

Everything runs on your machine. Your codebase, memories, and knowledge graph are stored in a local SQLite database using the `sqlite-vec` extension. 

- **Privacy First**: Your data never leaves your machine.
- **Speed**: Local SQLite performance beats network-bound vector DBs every time.
- **Offline-Ready**: Work without an internet connection.

Ready to connect a client? Head to the **[Quick Start](quickstart)** guide.

