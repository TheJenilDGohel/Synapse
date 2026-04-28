---
id: index
title: Home
sidebar_label: Home
slug: /
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<h1 align="center">Synapse</h1>

<p align="center">
  <strong>Bridging Context. Helping AI do the job.</strong>
</p>

<p align="center">
  The minimalist transmission layer for AI context. Bio-inspired <b>persistent memory</b>, <b>knowledge graph</b>, and <b>semantic recall</b> designed to empower AI agents with the project intelligence they need to succeed.<br/>
  <b>Zero cloud. Local-first. Pure SQLite.</b>
</p>

---

## The Philosophy: Bridging the Gap

In biology, a **Synapse** is the transmission point—the specialized gap between neurons where signals pass. Without this gap, information cannot flow, and the system is paralyzed.

In the AI ecosystem, we are that gap.

Every AI task fails because of a **loss of signal**: the agent doesn't know the architectural history, the recent breaking changes, or the specific "lessons learned" from past attempts.

**Synapse is the transmission layer** that ensures the signal reaches the AI with zero friction. We aren't the AI doing the fighting; we are the infrastructure that ensures the AI has the right context to **do the job**.

---

## Why Synapse?

Every other MCP server forces you to choose: memory **or** code intelligence. Never both.

Synapse is the first to combine all three pillars into one server that runs entirely on your machine:

| Pillar | What it does | Why it matters |
|:---|:---|:---|
| **Code Intelligence** | Hybrid BM25+vector search, AST-aware chunking, symbol finding (defs/usages/callers) | Your AI understands code structure, not just text |
| **Knowledge Graph** | Temporal entity-triple store with multi-hop traversal and `as_of` time-travel queries | Architectural decisions, dependencies, and facts — versioned over time |
| **Persistent Memory** | Cross-session recall, semantic dedup, agent-scoped isolation, conversation ingestion | Your AI remembers what you taught it — forever |

---

## How Synapse Compares

No other MCP server covers all three pillars. Here's how the landscape breaks down:

<Tabs>
  <TabItem value="memory" label="vs Memory-Only" default>

| | **Synapse** | **Mem0** | **Basic Memory** | **Basic Memory** | **AgentMemory** |
|:---|:---:|:---:|:---:|:---:|:---:|
| Persistent AI memory | **Yes** | Yes | Yes | Yes | Yes |
| Knowledge graph | **Yes** | No | No | No | No |
| Semantic code search | **Yes** | No | No | No | No |
| Symbol finding (defs/usages) | **Yes** | No | No | No | No |
| AST-aware chunking | **Yes** | No | No | No | No |
| Local-first / no cloud | **Yes** | Hybrid | Yes | Yes | Yes |
| MCP tools | **74** | 8 | ~10 | 24 | 43 |

:::info
Mem0 has 41k stars and $24M in funding — but it's memory-only with no code intelligence. Basic Memory integrates with Obsidian but can't search code. AgentMemory has auto-capture hooks but zero code features.
:::

  </TabItem>
  <TabItem value="code" label="vs Code Intelligence">

| | **Synapse** | **GitNexus** | **claude-context** | **codebase-memory-mcp** | **CodeGraphContext** |
|:---|:---:|:---:|:---:|:---:|:---:|
| Semantic code search | **Yes** | Yes | Yes | Yes | Yes |
| Knowledge graph | **Yes** | Code-only | No | Code-only | Yes |
| Persistent AI memory | **Yes** | No | No | No | No |
| Cross-session recall | **Yes** | No | No | No | No |
| Symbol finding | **Yes** | Yes | No | Yes | Yes |
| Temporal time-travel queries | **Yes** | No | No | No | No |
| Conversation ingestion | **Yes** | No | No | No | No |
| Local-first / no cloud | **Yes** | Yes | Partial | Yes | Yes |
| MCP tools | **74** | 16 | ~5 | 14 | ~10 |

:::info
GitNexus (27k stars) has strong code search but no memory. claude-context (Zilliz, 5.9k stars) is Milvus-backed with no KG or memory. codebase-memory-mcp (DeusData) is the closest competitor — code + KG in a single binary — but has no AI memory layer.
:::

  </TabItem>
</Tabs>

### Full Feature Matrix

**Synapse is the only infrastructure that unifies all three pillars into a single, local-first binary.**

---

## Helping AI Do The Job

Synapse isn't just a database; it’s an active participant in the agentic lifecycle:

| Workflow Step | How Synapse Helps |
|:---|:---|
| **Cold Start** | `agent_prime` instantly hydrates the context window with relevant memories and recent changes. |
| **Deep Investigation** | `find` runs fused search across code fragments and historical design decisions. |
| **Continuous Learning** | `teach` saves architectural rules that persist across sessions, ensuring agents never repeat mistakes. |
| **Outcome Capture** | `capture_outcome` records what worked and what didn't, building an experience base over time. |

---

---

## Quick Start

```bash
# Install
npm install -g synapse

# Setup workspace + embeddings
synapse setup

# Verify
synapse doctor
```

**Interactive dashboard:**
```bash
synapse dashboard
```

### MCP Client Config

After setup, add this to your AI client config:

```json
{
  "mcpServers": {
    "synapse": {
      "command": "synapse",
      "startup_timeout_sec": 30,
      "env": {
        "MCP_MODE": "stdio",
        "SYNAPSE_CONFIG": "~/.synapse/config/synapse.config.json",
        "SYNAPSE_INDEX_BACKEND": "sqlite-vec",
        "SYNAPSE_MEMORY_ENABLED": "true"
      }
    }
  }
}
```

Works with Claude Code, Cursor, Windsurf, Cline, Continue, Gemini CLI, and any MCP-compatible client.

---

## Tool Suites

Synapse exposes **74 specialized MCP tools**, organized into focused suites:

<details>
<summary><b>Workspace & Discovery</b> — file navigation, project summaries, scoped reads</summary>

`project_tree`, `read_file`, `file_changed`, `list_projects`, `list_roots`, `summarize_project`

</details>

<details>
<summary><b>Search & Code Intelligence</b> — hybrid search, symbols, AST-aware queries</summary>

`search_hybrid`, `search_code`, `search_files`, `find`, `find_definition`, `find_usages`, `find_callers`, `find_implementations`, `get_symbol`, `rename_preview`

</details>

<details>
<summary><b>Memory & Recall</b> — persistent cross-session memory with semantic dedup</summary>

`memory_store`, `memory_recall`, `memory_get`, `memory_update`, `memory_delete`, `memory_list`, `memory_store_batch`, `memory_delete_batch`, `memory_related`, `memory_suggest_relations`, `memory_add_relation`, `memory_remove_relation`, `memory_capture_event`, `memory_events`, `memory_status`, `memory_check_duplicate`

</details>

<details>
<summary><b>Knowledge Graph</b> — temporal triples, time-travel, multi-hop traversal</summary>

`kg_add_entity`, `kg_add_triple`, `kg_query`, `kg_invalidate`, `kg_as_of`, `kg_timeline`, `kg_stats`, `kg_add_entities_batch`, `kg_add_triples_batch`, `kg_backfill_links`, `graph_traverse`, `graph_bridges`

</details>

<details>
<summary><b>Organization</b> — nests, branches, agent isolation, diary</summary>

`nest_list`, `nest_branches`, `nest_tree`, `diary_write`, `diary_read`

</details>

<details>
<summary><b>Ingestion & Hooks</b> — conversation import, lifecycle callbacks</summary>

`ingest_markdown`, `ingest_json`, `hooks_stats`, `hooks_list_events`

</details>

<details>
<summary><b>Agent Context</b> — priming, teaching, outcomes, task context</summary>

`agent_prime`, `teach`, `capture_outcome`, `task_context`, `whats_new`

</details>

<details>
<summary><b>System</b> — health, indexing, updates, embedding status</summary>

`health`, `server_status`, `index_project`, `index_status`, `embed_status`, `update_self`, `update_status`, `audit`, `backup`, `restore`, `help`, `usage_guide`

</details>

Full parameter reference: [Tool Documentation](#tool-suites)

---

## Enterprise-Grade Reliability

Synapse is built for mission-critical development workflows:

- **OIDC Trusted Publishing**: Verifiable npm provenance via GitHub Actions.
- **Continuous CodeQL**: Deep static analysis on every commit.
- **OpenSSF Best Practices**: Proactive security monitoring and dependency hygiene.
- **Zero-Cloud Privacy**: Your code and memories never leave your machine. No telemetry, no external APIs.

---

## Troubleshooting

:::caution Installing from GitHub fails
Direct `npm install -g git+https://...` may fail with `TAR_ENTRY_ERRORS`. This is a [known npm limitation](https://github.com/npm/cli/issues/3910).

**Fix: clone, pack, install**
```bash
git clone https://github.com/TheJenilDGohel/synapse.git
cd synapse && npm pack
npm install -g ./synapse-*.tgz
```
:::

:::tip Semantic search not working
If semantic search tools return empty results or errors, ensure the transformers library is installed in the global synapse directory:

```bash
cd $(npm root -g)/synapse && npm install --no-save @huggingface/transformers
synapse doctor
```
:::

---

## Resources

- **[Documentation](/)** — Full tool reference, architecture, and guides
- **[Comparison](/docs/index#how-synapse-compares)** — Detailed competitive analysis
- **[Architecture](./architecture.md)** — Retrieval pipeline and memory graph internals
- **[Changelog](./changelog.md)** — Release history
- **[Security](./security.md)** — Vulnerability disclosure policy

---

<div align="center">
  <strong>Code intelligence. Knowledge graph. AI memory. One server. Your machine.</strong>
</div>
