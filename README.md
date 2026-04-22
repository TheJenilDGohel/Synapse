<p align="center">
  <img src="media/logo_minimal.png" width="200" alt="Synapse Logo" />
</p>

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

### vs Memory-Only Servers

| | **Synapse** | **Mem0** | **Basic Memory** | **MCP Memory Service** | **AgentMemory** |
|:---|:---:|:---:|:---:|:---:|:---:|
| Persistent AI memory | **Yes** | Yes | Yes | Yes | Yes |
| Knowledge graph | **Yes** | No | No | No | No |
| Semantic code search | **Yes** | No | No | No | No |
| Symbol finding (defs/usages) | **Yes** | No | No | No | No |
| AST-aware chunking | **Yes** | No | No | No | No |
| Local-first / no cloud | **Yes** | Hybrid | Yes | Yes | Yes |
| MCP tools | **74** | 8 | ~10 | 24 | 43 |

> Mem0 has 41k stars and $24M in funding — but it's memory-only with no code intelligence. Basic Memory integrates with Obsidian but can't search code. AgentMemory has auto-capture hooks but zero code features.

### vs Code Intelligence Servers

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

> GitNexus (27k stars) has strong code search but no memory. claude-context (Zilliz, 5.9k stars) is Milvus-backed with no KG or memory. codebase-memory-mcp (DeusData) is the closest competitor — code + KG in a single binary — but has no AI memory layer.

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
<p><code>project_tree</code>, <code>read_file</code>, <code>file_changed</code>, <code>list_projects</code>, <code>list_roots</code>, <code>summarize_project</code></p>
</details>

<details>
<summary><b>Search & Code Intelligence</b> — hybrid search, symbols, AST-aware queries</summary>
<p><code>search_hybrid</code>, <code>search_code</code>, <code>search_files</code>, <code>find</code>, <code>find_definition</code>, <code>find_usages</code>, <code>find_callers</code>, <code>find_implementations</code>, <code>get_symbol</code>, <code>rename_preview</code></p>
</details>

<details>
<summary><b>Memory & Recall</b> — persistent cross-session memory with semantic dedup</summary>
<p><code>memory_store</code>, <code>memory_recall</code>, <code>memory_get</code>, <code>memory_update</code>, <code>memory_delete</code>, <code>memory_list</code>, <code>memory_store_batch</code>, <code>memory_delete_batch</code>, <code>memory_related</code>, <code>memory_suggest_relations</code>, <code>memory_add_relation</code>, <code>memory_remove_relation</code>, <code>memory_capture_event</code>, <code>memory_events</code>, <code>memory_status</code>, <code>memory_check_duplicate</code></p>
</details>

<details>
<summary><b>Knowledge Graph</b> — temporal triples, time-travel, multi-hop traversal</summary>
<p><code>kg_add_entity</code>, <code>kg_add_triple</code>, <code>kg_query</code>, <code>kg_invalidate</code>, <code>kg_as_of</code>, <code>kg_timeline</code>, <code>kg_stats</code>, <code>kg_add_entities_batch</code>, <code>kg_add_triples_batch</code>, <code>kg_backfill_links</code>, <code>graph_traverse</code>, <code>graph_bridges</code></p>
</details>

<details>
<summary><b>Organization</b> — nests, branches, agent isolation, diary</summary>
<p><code>nest_list</code>, <code>nest_branches</code>, <code>nest_tree</code>, <code>diary_write</code>, <code>diary_read</code></p>
</details>

<details>
<summary><b>Ingestion & Hooks</b> — conversation import, lifecycle callbacks</summary>
<p><code>ingest_markdown</code>, <code>ingest_json</code>, <code>hooks_stats</code>, <code>hooks_list_events</code></p>
</details>

<details>
<summary><b>Agent Context</b> — priming, teaching, outcomes, task context</summary>
<p><code>agent_prime</code>, <code>teach</code>, <code>capture_outcome</code>, <code>task_context</code>, <code>whats_new</code></p>
</details>

<details>
<summary><b>System</b> — health, indexing, updates, embedding status</summary>
<p><code>health</code>, <code>server_status</code>, <code>index_project</code>, <code>index_status</code>, <code>embed_status</code>, <code>update_self</code>, <code>update_status</code>, <code>audit</code>, <code>backup</code>, <code>restore</code>, <code>help</code>, <code>usage_guide</code></p>
</details>

Full parameter reference: [Tool Documentation](https://wmt-mobile.github.io/synapse/docs/tools/overview)

---

## Enterprise-Grade Reliability

Synapse is built for mission-critical development workflows:

- **OIDC Trusted Publishing**: Verifiable npm provenance via GitHub Actions.
- **Continuous CodeQL**: Deep static analysis on every commit.
- **OpenSSF Best Practices**: Proactive security monitoring and dependency hygiene.
- **Zero-Cloud Privacy**: Your code and memories never leave your machine. No telemetry, no external APIs.

---

## Troubleshooting

<details>
<summary><b>Installing from GitHub fails</b></summary>

Direct `npm install -g git+https://...` may fail with `TAR_ENTRY_ERRORS`. This is a [known npm limitation](https://github.com/npm/cli/issues/3910).

**Fix: clone, pack, install**
```bash
git clone https://github.com/TheJenilDGohel/synapse.git
cd synapse && npm pack
npm install -g ./synapse-*.tgz
```
</details>

<details>
<summary><b>Semantic search not working</b></summary>

```bash
cd $(npm root -g)/synapse && npm install --no-save @huggingface/transformers
synapse doctor
```
</details>

---

## Resources

- **[Documentation](https://wmt-mobile.github.io/synapse/)** — Full tool reference, architecture, and guides
- **[Comparison](https://wmt-mobile.github.io/synapse/docs/comparison)** — Detailed competitive analysis
- **[Architecture](https://wmt-mobile.github.io/synapse/docs/architecture)** — Retrieval pipeline and memory graph internals
- **[Changelog](./CHANGELOG.md)** — Release history
- **[Security](./SECURITY.md)** — Vulnerability disclosure policy

---

<div align="center">
  <strong>Code intelligence. Knowledge graph. AI memory. One server. Your machine.</strong>
</div>
