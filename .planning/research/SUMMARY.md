# Research Summary: Synapse (synapse)

**Domain:** AI Development Infrastructure / MCP Server
**Researched:** April 2026
**Overall confidence:** HIGH

## Executive Summary

Synapse is a high-performance, local-first MCP server designed to serve as the "transmission layer" for AI context. It addresses the common "signal loss" problem in AI-assisted development by unifying three critical pillars: **Semantic Code Intelligence**, a **Temporal Knowledge Graph**, and **Persistent AI Memory**. 

Unlike fragmented alternatives that focus on only one area (e.g., Mem0 for memory or GitNexus for code search), Synapse provides a integrated environment where memories are enriched with knowledge graph facts, and code search results are aware of historical design decisions. The system is built on pure SQLite with the `sqlite-vec` extension, ensuring privacy and zero cloud dependencies while maintaining high performance.

The implementation is highly mature, featuring 74 specialized MCP tools, AST-aware chunking for code, and a temporal KG that allows "time-travel" queries. The architecture follows a strict domain-driven separation, ensuring scalability and maintainability.

## Key Findings

**Stack:** Node.js, SQLite (`node:sqlite`), `sqlite-vec` for vectors, Tree-sitter for AST analysis, Ripgrep for lexical search.
**Architecture:** Domain-Driven layers (Core, Services, Interfaces) with a "downwards isolation" principle.
**Critical pitfall:** Dependency on `node:sqlite` (Node 22.13+) and `sqlite-vec` binary compatibility, which can be tricky on some platforms.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Backend Stabilization** - Focus on maturing the semantic backend transition.
   - Addresses: `sqlite-vec` limitations and transition to `vec1` or `LanceDB`.
   - Avoids: Performance bottlenecks as local indices grow.

2. **Metadata Enrichment** - Introduce background indexing with local LLMs.
   - Addresses: Poor code naming or lack of documentation in source files.
   - Uses: Qwen2.5-Coder-1.5B for local, privacy-preserving enrichment.

3. **Multi-Language Expansion** - Broaden AST support beyond TypeScript optimization.
   - Rationale: Increase market reach to polyglot codebases.

**Phase ordering rationale:**
- Stabilization of the core retrieval engine is the highest priority for reliability. Enrichment adds value on top of a stable engine. Language expansion is a horizontal growth step.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Explicitly documented and verified in code. |
| Features | HIGH | Verified implementation of all 74 tools and core logic. |
| Architecture | HIGH | Clear domain separation and isolation principles followed. |
| Pitfalls | MEDIUM | Platform-specific SQLite extension issues are common but manageable. |

## Gaps to Address

- **Semantic Backend:** `sqlite-vec` is a placeholder for more mature options like `vec1` or `LanceDB`.
- **Language Coverage:** Currently optimized for TypeScript; needs broader tree-sitter grammars for other languages.
- **Metadata Quality:** Retrieval depends on existing code quality; local LLM enrichment is planned but not fully integrated.
