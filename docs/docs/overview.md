# Overview

Synapse MCP is a local-first MCP server and CLI tool that combines **semantic code search**, a **temporal knowledge graph**, and **persistent AI memory** in one package — giving AI agents scoped access to your codebase with hybrid search, semantic indexing, and cross-session recall that never leaves your machine.

**74 MCP tools** | **Temporal knowledge graph** | **Multi-hop graph traversal** | **Agent-scoped memory** | **Zero cloud dependencies**

## Use this documentation by intent

- [Install and configure Synapse](./setup/install)
- [Review configuration and env vars](./setup/configuration)
- [Understand the runtime architecture](./architecture)
- [Browse tool documentation](./tools/overview)
- [See the current stable package and behavior](./releases/current)
- [See the release matrix](./releases/history)
- [Preview 0.1.0 features](./releases/0.1.0)

## Core ideas

- Synapse only reads from configured roots.
- Lexical search works without indexing; hybrid search benefits from a semantic index.
- Local memory is opt-in and stays on your machine.
- The fastest workflow is usually: find files first, search within them second, read exact lines last.
- Memory results are guidance, not final evidence. Verify with file tools before concluding.

## What makes Synapse different

Synapse is the only MCP server that covers all three pillars in one local-first package. See the [full comparison](/docs/comparison) for detailed benchmarks against Mem0, GitNexus, Graphiti, codebase-memory-mcp, and others.

## Key capabilities

- **Temporal knowledge graph** -- store structured facts as subject-predicate-object triples with time validity. Query what was true at any point in time with `as_of`.
- **Multi-hop graph traversal** -- walk relationships 2-5 hops deep via recursive CTEs.
- **Nest/Branch hierarchy** -- two-level memory taxonomy for organized retrieval.
- **Agent-scoped memory** -- per-agent isolation with private diary entries. Multiple agents, zero cross-contamination.
- **Semantic dedup** -- embedding similarity gate (0.92 cosine threshold) prevents near-duplicate memory pollution.
- **Conversation ingestion** -- import Markdown/JSON chat exports with automatic entity extraction and KG triple creation.
- **Hooks system** -- pre/post operation callbacks for memory, KG, traversal, ingestion.
- **CLI-first architecture** -- unified `synapse <noun> <verb>` commands. Shell completions for bash, zsh, fish.
- **74 MCP tools** covering search, memory, KG, nests, traversal, diary, ingest, dedup, and hooks.
