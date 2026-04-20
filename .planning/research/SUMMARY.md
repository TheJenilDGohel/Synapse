# Research Summary: Synapse Memory Enhancement

**Domain:** AI memory system with knowledge graph (local-first MCP server)
**Researched:** 2026-04-08
**Overall confidence:** HIGH

## Executive Summary

Synapse's existing memory architecture (flat entries, simple relations, event capture with auto-promotion, embedding-based recall) is well-structured and production-ready. The enhancement milestone adds five capabilities: a temporal knowledge graph (entities + triples with validity windows), hierarchical taxonomy (wing/room metadata on memories), multi-hop graph traversal, conversation ingestion, and semantic deduplication. All of these can be built with zero new runtime dependencies by leveraging SQLite's recursive CTEs for graph traversal, the existing HuggingFace embedding pipeline for dedup, and straightforward table additions for the knowledge graph.

The MemPalace system provides the strongest reference architecture. Its analysis reveals critical lessons: wing/room metadata filtering produces a 34% retrieval improvement (from 60.9% to 94.8%); lossy text compression (AAAK) causes a 12.4 percentage-point recall regression; and halls (a third taxonomy level) are declared but unused in practice -- two levels suffice. MemPalace's knowledge graph uses the exact same SQLite triple pattern (entities + triples with valid_from/valid_to) that Synapse should adopt, but critically, MemPalace performs no multi-hop traversal -- just flat triple lookups. This is Synapse's key differentiator: recursive CTE-based graph walks that discover non-obvious connections.

The build order is strictly sequential due to data dependencies. Knowledge graph tables must come first (everything references entities/triples). Taxonomy comes second (wing/room modifies memory_entries and is used by dedup scoping and agent isolation). Semantic dedup third (needs embeddings and taxonomy for scoping). Graph traversal fourth (needs a populated graph). Agent scopes fifth (needs taxonomy for wing-based isolation). Conversation ingestion last (the integration point that exercises all previous components). MCP tool registration as the final surface layer.

All schema changes are additive (CREATE TABLE IF NOT EXISTS, ALTER TABLE ADD COLUMN wrapped in try/catch), matching the existing v2-v5 migration pattern. The existing 19 MCP tools continue working unchanged. New tools use the established synapse_ prefix naming convention.

## Key Findings

**Stack:** Zero new runtime dependencies. SQLite recursive CTEs for graph traversal, existing HuggingFace embeddings for dedup, standard Node.js for parsing.

**Architecture:** Six new modules (kg.js, graph.js, taxonomy.js, dedup.js, scopes.js, ingest.js) following the existing adapter-passthrough function pattern. Three schema versions (v6-v8) adding five new tables and two new columns on memory_entries.

**Critical pitfall:** Lossy compression/summarization destroys recall. Store verbatim always. MemPalace proved this with a 12.4pp regression.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Knowledge Graph Core** - Schema v6 + entity/triple CRUD + temporal queries
   - Addresses: Triple CRUD, temporal validity, entity management
   - Avoids: Building on nonexistent foundation

2. **Taxonomy and Recall Enhancement** - Schema v7 + wing/room on memory_entries + recall filters
   - Addresses: Wing/room taxonomy, taxonomy-filtered recall (34% boost)
   - Avoids: Taxonomy drift by auto-deriving from existing scope fields

3. **Semantic Dedup** - Embedding similarity gate before storage
   - Addresses: Duplicate prevention, storage hygiene
   - Avoids: Aggressive threshold (0.92+ only, conservative)

4. **Graph Traversal** - Recursive CTE multi-hop walks with temporal filtering
   - Addresses: Multi-hop walks, cross-domain tunnel discovery
   - Avoids: Unbounded recursion (maxHops=2 default, cap at 5)

5. **Agent Scopes** - Per-agent namespaces + diary
   - Addresses: Agent isolation, private scratchpad
   - Avoids: Scope leakage via separate diary table

6. **Conversation Ingestion** - Parse Markdown/JSON/Slack -> memories + triples
   - Addresses: Conversation ingestion pipeline
   - Avoids: LLM dependency (rule-based extraction only)

7. **MCP Tool Surface** - Register all new tools, update index.js
   - Addresses: Tool exposure for all new capabilities

**Phase ordering rationale:**
- KG core first because taxonomy, traversal, ingestion, and agent scopes all reference entities/triples
- Taxonomy before dedup because dedup uses wing/room for scoping
- Dedup before ingestion because ingestion must go through the dedup gate
- Traversal after KG core but before ingestion because ingestion creates triples that traversal walks
- Agent scopes after taxonomy because isolation uses wing-based filtering
- Ingestion last because it integrates all other components

**Research flags for phases:**
- Phase 1 (KG Core): Standard pattern, MemPalace schema is proven, low risk
- Phase 4 (Graph Traversal): May need performance testing on larger graphs (>10K triples)
- Phase 6 (Conversation Ingestion): Rule-based entity extraction quality is uncertain

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new deps, all patterns verified in existing codebase |
| Features | HIGH | MemPalace analysis + PROJECT.md gap analysis provide clear feature set |
| Architecture | HIGH | Existing module pattern (adapter passthrough functions) scales cleanly |
| Pitfalls | HIGH | AAAK regression quantified (12.4pp), recursive CTE limits well-documented |
| Build Order | HIGH | Data dependency chain is unambiguous |

## Gaps to Address

- Entity extraction quality from conversations (rule-based) -- will need iteration and tuning
- Performance characteristics of recursive CTEs at >10K triples -- need benchmarking in Phase 4
- Slack export format specifics -- defer detailed research to Phase 6
- Whether combined recall (memories + triples in one response) should be a single tool or two tool calls -- UX decision for Phase 7
