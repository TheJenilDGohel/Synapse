# Feature Landscape

**Domain:** AI memory system with knowledge graph (local-first MCP server)
**Researched:** 2026-04-08

## Table Stakes

Features users expect in a structured memory system. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Triple CRUD (add/query/invalidate) | Core of any knowledge graph | Medium | subject-predicate-object with confidence |
| Temporal validity (valid_from/valid_to) | Facts change over time; agents need point-in-time queries | Medium | as_of queries, NULL = still valid |
| Entity management | Triples reference entities; entities need types and properties | Low | Slug-based IDs, type classification |
| Wing/room taxonomy on memories | MemPalace proved 34% retrieval boost from metadata filtering | Low | Two columns added to memory_entries |
| Taxonomy-filtered recall | Retrieval must respect wing/room if provided | Low | Extends existing recall.js filter chain |
| Agent namespace isolation | Multi-agent systems need per-agent memory boundaries | Medium | Wing-based isolation + agent_scopes table |
| Semantic dedup before storage | Agents produce redundant memories; must not pollute the store | Medium | Cosine similarity gate, 0.92+ threshold |
| Conversation ingestion (Markdown) | Primary format for Claude/ChatGPT conversation exports | Medium | Turn splitting, verbatim storage |
| Conversation ingestion (JSON) | ChatGPT/Claude JSON export format | Medium | {role, content, timestamp} arrays |

## Differentiators

Features that set Synapse apart. Not expected in every memory system, but high-value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Multi-hop graph traversal | Navigate relationships 2-3 hops deep, discover non-obvious connections | Medium | Recursive CTE in SQLite; MemPalace has NO multi-hop traversal |
| Temporal timeline queries | "Show me everything that changed about X in order" | Low | ORDER BY valid_from on kg_triples |
| Cross-domain tunnel discovery | Find entities connected across different wings/projects | Medium | Traversal that ignores wing boundaries |
| Agent diary | Private scratchpad per agent, separate from shared knowledge | Low | Simple table, not queryable by other agents |
| Triple provenance tracking | Every triple links back to the memory_entry that produced it | Low | source_memory_id FK on kg_triples |
| Slack export ingestion | Team conversation history into structured memory | High | Slack JSON format parsing with user mapping |
| Combined recall (memories + triples) | Single query returns both relevant memories AND related graph facts | Medium | Recall returns memories; graph enrichment adds triples for top results |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| LLM-based entity extraction | No LLM runtime, offline-first constraint, adds cloud dependency | Rule-based regex/heuristic extraction |
| LLM-based summarization | MemPalace AAAK regression: 96.6% -> 84.2% recall when summarizing | Store verbatim text always |
| ChromaDB integration | Adds Python dependency, Synapse is Node.js only | Use existing embedding_json column + cosine similarity |
| Neo4j / external graph DB | Contradicts local-first, single-file simplicity | SQLite tables + recursive CTEs |
| Real-time conversation streaming | MCP is request/response, not streaming; batch is sufficient | File-based ingestion pipeline |
| Automatic relation creation from triples | Too noisy; let agents decide what to link | Separate triple and relation systems |
| Hall/corridor as third taxonomy level | MemPalace analysis shows halls are "not used in retrieval ranking" | Wing + room is sufficient (two levels) |

## Feature Dependencies

```
Schema v6 (KG tables)
  --> Triple CRUD (kg.js)
    --> Temporal validity queries
    --> Triple provenance
    --> Graph traversal (needs triples to walk)
      --> Cross-domain tunnel discovery

Schema v7 (wing/room + agent tables)
  --> Wing/room taxonomy
    --> Taxonomy-filtered recall
    --> Agent namespace isolation (wing-based)
      --> Agent diary

Semantic dedup
  --> Requires: EmbeddingService (existing), wing/room (schema v7)
  --> Consumed by: entries.js, ingest.js

Schema v8 (conversation_sources)
  --> Conversation ingestion (Markdown, JSON)
    --> Requires: entries.js, kg.js, dedup.js, taxonomy.js
    --> Slack export ingestion (extension of same pipeline)

Combined recall
  --> Requires: recall.js (existing) + kg.js (Phase 1) + taxonomy (Phase 2)
```

## MVP Recommendation

Prioritize for first usable milestone:

1. **Triple CRUD with temporal validity** -- foundational, everything depends on it
2. **Wing/room taxonomy** -- low complexity, high retrieval impact (34% boost)
3. **Taxonomy-filtered recall** -- immediate value to existing users
4. **Semantic dedup** -- prevents pollution as agents store more aggressively
5. **Graph traversal (2-hop)** -- the differentiator that no other SQLite memory system has

Defer:
- **Slack export ingestion**: High complexity, niche use case, do after Markdown/JSON work
- **Cross-domain tunnel discovery**: Useful but requires a populated multi-wing graph first
- **Combined recall (memories + triples)**: Nice UX but agents can call two tools today

## Sources

- [MemPalace architecture](https://github.com/milla-jovovich/mempalace) -- wing/room taxonomy, no halls in practice (HIGH confidence)
- [MemPalace analysis](https://github.com/lhl/agentic-memory/blob/main/ANALYSIS-mempalace.md) -- 34% retrieval boost, AAAK regression, no multi-hop traversal (HIGH confidence)
- Existing codebase analysis -- feature gap identification (HIGH confidence)
