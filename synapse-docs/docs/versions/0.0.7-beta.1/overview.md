# 0.0.7-beta.2 Overview

<div className="docPanel docPanel--compact">
  <p>
    Major feature release. Temporal knowledge graph, multi-hop traversal, nest/branch hierarchy,
    agent-scoped memory, semantic dedup, conversation ingestion, hooks system, CLI-first architecture,
    and 13-client skill distribution.
  </p>
</div>

## Key changes from 0.0.6-beta.1

### Knowledge Graph
- Temporal triples with `valid_from`/`valid_to` and `as_of` point-in-time queries
- Multi-hop graph traversal via SQLite recursive CTEs (2-5 hops)
- Contradiction detection at write time
- Entity auto-creation with slug normalization

### Memory Organization
- Nest/Branch two-level hierarchy (Synapse's own taxonomy)
- Metadata-filtered recall for precision retrieval
- Agent-scoped memory with private diary entries

### Data Quality
- Semantic duplicate detection (0.92 cosine threshold)
- Conversation ingestion (Markdown + JSON) with entity extraction
- Re-ingestion protection via SHA-256 content hashing

### CLI-First Architecture
- Unified `synapse` noun-verb subcommands (memory, kg, skill, mcp, ingest)
- Shell completions for bash, zsh, fish
- Global flags: `--json`, `--verbose`, `--quiet`, `--config`
- Legacy binary deprecation with warnings

### Infrastructure
- Pre/post operation hooks system (26 event types)
- Schema v5 through v9 (all additive, backward-compatible)
- Client-native skill formats for 13 AI tools

## Tools

52 MCP tools total:

| Category | Count |
|----------|-------|
| Core/System | 5 |
| Memory Workflow | 4 |
| Memory Store | 11 |
| Retrieval/Search | 11 |
| Knowledge Graph | 7 |
| Nest/Branch | 3 |
| Graph Traversal | 2 |
| Agent Diary | 2 |
| Ingestion | 2 |
| Dedup | 1 |
| Hooks | 2 |
| Updates | 2 |

## Requirements

- **Node.js** 18+ (search and file tools), 22.13+ (memory and KG features)
- **ripgrep** recommended for fast lexical search
- **Zero new runtime dependencies** added
