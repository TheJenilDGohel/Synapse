---
title: Comparison
description: How Synapse compares to other tools.
---

| Feature | Synapse | Mem0 | Graphiti | GitNexus |
|---------|---------|------|----------|-----------|
| **Backend** | Local SQLite | Cloud / Vector DB | Neo4j | Cloud |
| **Code Search** | Hybrid (BM25+Vec) | No | No | Yes |
| **KG Domain** | Temporal Triples | Key-Value | Graph | No |
| **Privacy** | 100% Local | Cloud-based | Local/Cloud | Cloud |
| **Agent Protocol** | Native MCP | SDK | SDK | Custom |

## Why Synapse?

1. **Privacy**: Your code never leaves your machine. Everything is indexed and searched locally.
2. **Hybrid Search**: We combine traditional lexical search (BM25) with modern vector search for the best results.
3. **Temporal Awareness**: Facts in the Knowledge Graph are versioned. You can ask "What did I know about X last Tuesday?"
