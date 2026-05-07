---
title: Introduction
description: Welcome to Synapse — the unified context layer for AI agents. Code intelligence, knowledge graph, and persistent memory. One server. Your machine.
---

# Introduction

**Synapse** is the transmission layer for AI agents.

In biology, a synapse is the specialized gap between neurons where signals pass. Without it, information cannot flow. In the AI ecosystem, Synapse fills that same role — ensuring your agent has the precise, persistent, and semantically-aware context it needs to actually **do the job**.

:::tip
Synapse isn't an AI. It's the infrastructure that makes your AI smarter.
:::

## The Problem Synapse Solves

Every AI coding agent suffers from the same failure mode: **signal loss**. The agent doesn't know the architectural history, the recent breaking changes, or the specific lessons learned from past attempts. It reads files but doesn't *understand* the project.

Current solutions force you to choose:

- **Memory-only servers** (like Mem0) — great recall, zero code understanding.
- **Code intelligence servers** — great search, zero cross-session memory.

**Synapse is the first to combine all three pillars in a single local server.**

## The Three Pillars

Synapse is built on three tightly integrated pillars that give your agent a complete picture of your codebase:

1. **[Code Intelligence](/pillars/intel)** — Hybrid BM25 + vector search, AST-aware chunking, and symbol resolution (`find_definition`, `find_usages`, `find_callers`). Your agent understands code structure, not just text.

2. **[Knowledge Graph](/pillars/temporal)** — A temporal entity-triple store with multi-hop graph traversal and `as_of` time-travel queries. Architectural decisions, module relationships, and facts — all versioned over time.

3. **[Persistent Memory](/pillars/memory)** — Cross-session semantic recall with automatic deduplication and agent-scoped isolation. Your agent remembers what you taught it — permanently.

## Zero Cloud. Pure Local.

Everything runs on your machine. Your codebase, your memories, and your knowledge graph are stored in a high-performance local SQLite database using the `sqlite-vec` extension. No telemetry, no external APIs, no cloud.

Ready to connect your agent? Head to the **[Quick Start](/quickstart)** guide.
