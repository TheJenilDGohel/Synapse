---
title: Architectural Explanation
description: Deep dive into the design and principles of Loci.
---

# Architectural Explanation

Loci is designed to solve the **Context Loss** problem in AI-assisted development. This document explains the core concepts and design decisions behind the engine.

## The Three Pillars of Context

Loci integrates three distinct types of intelligence into a single local-first engine:

1.  **Code Intelligence (The Present)**: Knowing exactly what the code does right now via AST-aware indexing and hybrid search.
2.  **Persistent Memory (The Intent)**: Remembering *why* decisions were made, based on past developer instructions and task outcomes.
3.  **Knowledge Graph (The Relationships)**: Tracking how entities (functions, classes, requirements) relate to each other over time.

## Domain-Driven Design

The codebase is structured into four distinct layers to ensure stability and performance:

- **Interface Layer**: CLI and MCP entrypoints. They are thin wrappers that orchestrate the inner engines.
- **Contract Layer**: Pure TypeScript interfaces. Every service depends on these, not concrete implementations.
- **Engine Layer**: The "Brains." Isolated logic for Memory, Retrieval, and Graph traversal.
- **Core/Runtime Layer**: The "Foundation." Low-level SQLite management, OS abstractions, and configuration.

## Why Local-First?

Loci performs all parsing, embedding, and indexing strictly on your machine.
- **Privacy**: Your code never leaves your local environment.
- **Speed**: No network latency for search or retrieval.
- **Reliability**: Works offline and doesn't require expensive API keys for base indexing.

## The Power Controller Model

Traditional MCP servers provide 50+ granular tools. This often confuses LLMs and wastes tokens on tool discovery. 

Loci consolidates these into **~14 Power Controllers**. This high-density model allows agents to reason more effectively by providing them with a smaller, more powerful API surface. It also ensures compatibility with clients that have tool-call limits, such as Gemini and Vertex AI.

## Performance Optimization

Loci is built for large-scale codebases:
- **O(N) Scoping**: AST resolution is memoized, allowing for near-instant mapping of even massive source files.
- **RRF Fusion**: We combine keyword search (BM25) with vector search (Cosine Similarity) using Reciprocal Rank Fusion to ensure the most relevant results are always at the top.
