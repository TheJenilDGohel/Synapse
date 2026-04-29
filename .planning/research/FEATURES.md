# Feature Landscape

**Domain:** AI Development Infrastructure
**Researched:** April 2026

## Table Stakes

Features users expect in an MCP-based AI assistant tool.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Semantic Code Search | Finding relevant code by intent, not just keywords. | High | Requires embeddings + vector store. |
| Symbol Navigation | Jump to definitions, find usages, see callers. | Medium | Powered by Tree-sitter. |
| Persistent Memory | AI remembers past instructions and decisions. | Medium | Essential for multi-session work. |
| Project Indexing | Fast retrieval across the entire codebase. | High | Needs efficient incremental updates. |

## Differentiators

Features that set Synapse apart from competitors like Mem0 or GitNexus.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Temporal Knowledge Graph | "Time-travel" queries; see how relationships changed over time. | High | Uses `valid_from`/`valid_to` triples. |
| KG-Enriched Recall | Memory retrieval is enriched with structured KG facts automatically. | Medium | Connects unstructured memory to structured facts. |
| Unified Find | Single query searches across code, memory, and graph. | High | Sophisticated fusion and reranking logic. |
| Agent/Nest Isolation | Scoped memory environments (like git branches) for agents. | Medium | Prevents context pollution between different tasks. |

## Anti-Features

Features to explicitly NOT build to maintain the project's philosophy.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Cloud Synchronization | Compromises privacy and adds external dependencies. | Local-first; manual backup/restore. |
| Background Service | Adds operational surface and complexity. | In-process execution via stdio MCP. |
| LLM Query Answering | Increases latency and cost; shifts focus from context to execution. | Be the "transmission layer" (context provider). |

## Feature Dependencies

```
AST Chunking → Vector Indexing → Semantic Search
Entity Extraction → Knowledge Graph → KG-Enriched Recall
```

## MVP Recommendation

Synapse is already past MVP. Current priorities should be:
1. **Refining the Unified Find** - Better reranking across disparate sources.
2. **Local Enrichment** - Using small models (Qwen) to improve search metadata.
3. **Cross-Platform Parity** - Ensure SQLite extensions work seamlessly on Windows/macOS/Linux.

## Sources

- `C:\Jenil\synapse\README.md`
- `C:\Jenil\synapse\docs\docs\comparison.md`
- `C:\Jenil\synapse\src\core\engine\retrieval\search\service.ts`
