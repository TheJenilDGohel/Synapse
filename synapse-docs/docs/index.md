---
slug: /
sidebar_position: 1
title: Synapse — Code Intelligence + Knowledge Graph + AI Memory
description: The only MCP server combining semantic code search, temporal knowledge graph, and persistent AI memory. 74 tools, zero cloud, pure SQLite.
keywords:
  - MCP server
  - AI memory
  - knowledge graph
  - code search
  - local-first
  - Mem0 alternative
  - GitNexus alternative
---

# Synapse MCP

**The only MCP server that combines code intelligence, knowledge graph, and AI memory in one local-first package.**

Every other MCP server forces you to choose: memory **or** code intelligence. Synapse is the first to unify all three pillars — 74 tools, zero cloud, pure SQLite.

| Pillar | What it does |
|:---|:---|
| **Code Intelligence** | Hybrid BM25+vector search, AST-aware chunking, symbol finding (defs/usages/callers) |
| **Knowledge Graph** | Temporal entity-triple store with multi-hop traversal and time-travel queries |
| **Persistent Memory** | Cross-session recall, semantic dedup, agent-scoped isolation |

:::info 100% Private
No data leaves your machine. Embeddings, index, and memory stay local.
:::

## Quick Start

```bash
npm install -g synapse
synapse setup
synapse doctor
```

**Beta track** (interactive TUI dashboard):
```bash
npm install -g synapse@beta
synapse dashboard
```

---

## How We Compare

No other MCP server covers all three pillars:

| Feature | Synapse | Memory Servers | Code Servers |
|:---|:---:|:---:|:---:|
| Semantic code search | **Yes** | No | Yes |
| Knowledge graph | **Yes** | No | Partial |
| Persistent AI memory | **Yes** | Yes | No |
| 74 MCP tools | **Yes** | 8-43 | 5-16 |
| Local-first / no cloud | **Yes** | Mixed | Mixed |

See the full breakdown: **[Synapse vs Alternatives](/docs/comparison)**

---

## Next Steps

<div className="container">
  <div className="row">
    <div className="col col--6">

### [Getting Started](/docs/setup/install)
Install and connect to Claude Code, Cursor, Windsurf, or any MCP client.

</div>
    <div className="col col--6">

### [Tool Reference](/docs/tools/overview)
All 74 tools — search, memory, graph, organization, and system.

</div>
  </div>
  <div className="row">
    <div className="col col--6">

### [vs Alternatives](/docs/comparison)
Detailed competitive analysis against Mem0, GitNexus, Graphiti, and more.

</div>
    <div className="col col--6">

### [Architecture](/docs/architecture)
Retrieval pipeline, memory graph internals, and SQLite design.

</div>
  </div>
</div>

---

<p align="center">
  <b>Code intelligence. Knowledge graph. AI memory. One server. Your machine.</b>
</p>
