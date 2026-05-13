---
title: FAQ & Insights
description: Frequently asked questions, performance tips, and architectural pros/cons.
---

# FAQ & Insights

Understand the tradeoffs, performance characteristics, and common questions about Synapse.

## Frequently Asked Questions

### 1. Is Synapse a replacement for my AI model?
No. Synapse is **infrastructure**. It is a specialized transmission layer that provides your existing AI model (via MCP) with the project context it needs to reason accurately.

### 2. Where is my data stored?
All data—code indexes, persistent memories, and knowledge graph triples—is stored in a local SQLite database on your machine. By default, this is located at `~/.synapse/storage/synapse.db`.

### 3. Does Synapse send my code to the cloud?
**No.** Synapse is strictly local-first. We do not have a cloud backend, we do not collect telemetry, and we do not use external APIs for indexing or retrieval.

### 4. Which AI clients are supported?
Synapse works with any client that supports the **Model Context Protocol (MCP)**. This includes:
- **Claude Desktop** & **Claude Code**
- **Cursor** & **Windsurf**
- **Cline** & **Continue**
- **Gemini CLI**

### 5. How does Synapse handle very large codebases?
Synapse uses `sqlite-vec` for high-performance vector search and `ripgrep` for ultra-fast lexical search. It uses AST-aware chunking to ensure that even in large files, only the relevant functions are surfaced to the AI.

## Pros & Cons

### Pros
- **Zero Latency**: Local SQLite retrieval is significantly faster than cloud-based vector databases.
- **Total Privacy**: Your IP, code, and memories never leave your local environment.
- **Context Efficiency**: Tools like `agent_prime` and `compact` modes reduce token waste, giving your AI more room to "think."
- **Temporal Reasoning**: The only system that tracks how your architecture evolved over time, not just its current state.
- **Offline-Ready**: Full functionality without an internet connection.

### Cons
- **Local Resources**: Indexing large projects consumes local CPU and Disk space.
- **Model Storage**: Local embedding models require ~500MB of storage.
- **Node.js Dependency**: Requires a modern Node.js runtime (v22.6.0+) on the host machine.

## Performance Tips

### 1. Optimize Your Index
If indexing is slow, ensure that your `.gitignore` is up to date. Synapse respects ignore rules and won't waste time indexing `node_modules`, `dist`, or other build artifacts.

### 2. Use `agent_prime`
Instead of letting your AI agent hunt for context with dozens of small tool calls, instruct it to use `agent_prime` once at the start of a task. This rehydrates the most important context in a single round-trip.

### 3. Leverage Batch Tools
For bulk operations (like importing multiple facts or relationships), use `memory_store_batch` or `synapse_kg_manage` with the `ingest_markdown` action. This is significantly faster than individual calls.

---

**Next:** Learn about the system's underlying **[Architecture](architecture)**.
