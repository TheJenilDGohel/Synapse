# M000: Context - Synapse State (April 2026)

## Project Overview
Synapse is a local-first MCP server providing persistent memory, a temporal knowledge graph, and semantic code search for AI agents.

## Current State
- **Version**: 0.3.2
- **Tools**: 74 MCP tools implemented across Code, Memory, and KG domains.
- **Backend**: Pure SQLite with `node:sqlite` and `sqlite-vec` extension.
- **Capabilities**:
  - AST-aware chunking for TypeScript.
  - Temporal Knowledge Graph (`valid_from`/`valid_to`).
  - Agent-scoped memory (Nests/Branches).
  - Hybrid search (Lexical + Semantic).
  - Semantic deduplication (0.92 threshold).

## Architecture Highlights
- **Domain-Driven**: Strict separation between `interfaces`, `services`, and `core`.
- **Downwards Isolation**: Interfaces call services; services call core; core interacts with system/DB.

## Challenges & Gaps
- **Vector Scaling**: `sqlite-vec` performance may degrade at very large scales (>10M vectors).
- **Binary Compatibility**: Ensuring SQLite extensions load reliably across all user platforms.
- **Metadata Quality**: Retrieval depends on source code quality; enrichment via LLMs is missing.
- **Language Coverage**: Primary optimization is for TypeScript.

## Performance Metrics
- **Indexing**: Seconds for thousands of files; minutes for tens of thousands.
- **Search Latency**: <100ms for standard repositories.
- **Deduplication**: Effective at preventing memory pollution.

## References
- See `.planning/research/SUMMARY.md` for full research details.
