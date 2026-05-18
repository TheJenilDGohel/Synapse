# Feature Landscape: AI Memory & Knowledge Graphs

**Domain:** Agent Memory & Code Intelligence
**Researched:** 2025-05-22

## Table Stakes

Features users expect in any modern memory/search solution.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Semantic Search** | Simple keyword search is no longer sufficient. | Medium | Requires vector embeddings (local or API). |
| **Persistence** | Agents must remember across sessions/restarts. | Low | SQLite/File-based storage. |
| **AST Parsing** | Code search must understand "Functions" not just "Lines". | High | Requires integration with Tree-sitter. |
| **MCP Interface** | Needed for compatibility with Claude Code, Cursor, etc. | Medium | Standard JSON-RPC protocol. |

## Differentiators

Features that set Loci apart from basic RAG.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Temporal Knowledge Graph** | Tracks *how* relationships change over time (e.g., refactors). | Very High | Bi-temporal edge tracking (valid_from/to). |
| **Task Isolation** | Prevents context bleed between unrelated tasks. | Medium | Namespacing/Scoped memory indices. |
| **Relationship Tracking** | Linking code blocks to the *memories* of why they exist. | High | Graph edges between AST nodes and Fact nodes. |
| **Local-First** | Zero latency and full privacy for enterprise codebases. | Medium | Requires all processing to happen on-device. |

## Anti-Features

Features to explicitly NOT build to maintain focus.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Cloud Hosting** | Increases privacy concerns and latency for local devs. | Stick to "Local-First" architecture. |
| **Generative UI** | Bloats the server; agents should handle the UI. | Provide structured data (JSON/Markdown) for agents. |
| **General Purpose DB** | Not a replacement for Postgres or MongoDB. | Use specialized indices (Vector/Graph) only. |

## Feature Dependencies

```
AST Parsing → Semantic Code Search (Enhanced context)
Vector Store + Graph Store → Hybrid Graph-RAG
Task Scoping → Persistent Memory (Isolation)
```

## MVP Recommendation

Prioritize:
1. **Core MCP Server**: Basic connectivity to Claude Code/Cursor.
2. **Semantic Code Search (Tree-sitter)**: Understanding functions and classes.
3. **Persistent Memory (SQLite)**: Saving facts about the current project.

Defer: **Temporal Visualization**: While cool, the agent doesn't need a UI to "see" the graph to use it.

## Sources
- [Mem0 Features](https://mem0.ai)
- [GitNexus Blast Radius](https://gitnexus.com)
- [Zep Context Engineering](https://getzep.com)
