# Research Summary: Synapse Competitive Analysis

**Domain:** Agent Memory & Code Intelligence
**Researched:** 2025-05-22
**Overall confidence:** HIGH

## Executive Summary

The competitive landscape for AI agents has moved beyond simple chat history. We are entering the era of **Structural Intelligence**, where agents must understand the relationships between people (Memory), logic (AST), and time (Temporal Graph). 

The primary competition (Mem0, Zep) is rapidly moving from pure vector search to hybrid Graph-RAG. However, they remain largely "General Purpose" or "Cloud-First." Synapse's opportunity lies in being the **definitive local-first MCP server** that specializes in the developer workflow, linking the *human intent* (Memory) directly to the *code structure* (AST).

## Key Findings

**Stack:** Local-first SQLite (Vector), Tree-sitter (AST), and incremental graph logic via MCP.
**Architecture:** A Federated Brain pattern where semantic facts, relational graph edges, and temporal timestamps are unified by a single query engine.
**Critical Pitfall:** "AST Bloat"—trying to index every token. Synapse must focus on high-level structures (Functions/Classes) to remain performant locally.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Phase 1: Foundations (The Shell)** - Build the MCP server and basic SQLite/Vector storage. 
   - Addresses: Core persistence and basic Claude Code compatibility.
2. **Phase 2: Semantic Awareness (The AST)** - Integrate Tree-sitter for function/class-level indexing.
   - Addresses: Standard in high-end code agents; avoids simple text-search noise.
3. **Phase 3: Relational Intelligence (The Graph)** - Implement the Knowledge Graph linking facts to AST nodes.
   - Addresses: The differentiator of linking intent to code.
4. **Phase 4: Temporal Reasoning (The History)** - Add bi-temporal edge tracking for refactor awareness.
   - Addresses: The "Zep-killer" feature for advanced context engineering.

**Phase ordering rationale:**
- Memory and basic Search are table stakes (Phases 1-2). Without these, the product is not usable.
- The Graph and Temporal features are the "Moat" (Phases 3-4) but require a stable foundation of indexed nodes to be effective.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | MCP and Tree-sitter are the clear winners in this domain. |
| Features | HIGH | Table stakes (Mem0/Zep) are well-documented. |
| Architecture | MEDIUM | Scaling graphs locally on SQLite/FalkorDB needs performance validation. |
| Pitfalls | HIGH | Common RAG/Graph pitfalls are widely discussed in post-mortems. |

## Gaps to Address

- **Local LLM Performance**: Determining if a local model (e.g., Llama 3) is fast enough for real-time fact extraction.
- **MCP Tool Density**: Ensuring the server doesn't provide *too many* tools, overwhelming the agent's context window.
