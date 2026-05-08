<h1 align="center">Synapse</h1>

<p align="center">
  <strong>Bridging Context. Helping AI do the job.</strong>
</p>

<p align="center">
  The minimalist transmission layer for AI context. Bio-inspired <b>persistent memory</b>, <b>knowledge graph</b>, and <b>semantic recall</b> designed to empower AI agents with the project intelligence they need to succeed.<br/>
  <b>Zero cloud. Local-first. Pure SQLite.</b>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/synapse-cortex"><img src="https://img.shields.io/npm/v/synapse-cortex?color=2dd4bf&label=npm&style=flat-square" alt="npm version"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/TheJenilDGohel/Synapse?color=2dd4bf&style=flat-square" alt="license"></a>
  <a href="https://github.com/TheJenilDGohel/Synapse/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/TheJenilDGohel/Synapse/ci.yml?branch=main&label=quality&style=flat-square" alt="quality status"></a>
  <a href="https://github.com/TheJenilDGohel/Synapse/security/advisories"><img src="https://img.shields.io/badge/security-monitored-2dd4bf?style=flat-square" alt="security monitored"></a>
</p>

---

## 🧬 The Philosophy: Bridging the Gap

In biology, a **Synapse** is the transmission point—the specialized gap between neurons where signals pass. Without this gap, information cannot flow, and the system is paralyzed.

In the AI ecosystem, we are that gap.

Every AI task fails because of a **loss of signal**: the agent doesn't know the architectural history, the recent breaking changes, or the specific "lessons learned" from past attempts.

**Synapse is the transmission layer** that ensures the signal reaches the AI with zero friction. We aren't the AI doing the fighting; we are the infrastructure that ensures the AI has the right context to **do the job**.

---

## 💎 Why Synapse?

Every other MCP server forces you to choose: memory **or** code intelligence. Never both.

Synapse is the first to combine all three pillars into one server that runs entirely on your machine:

| Pillar | What it does | Why it matters |
|:---|:---|:---|
| **Code Intelligence** | Hybrid BM25+vector search, AST-aware chunking, symbol finding (defs/usages/callers) | Your AI understands code structure, not just text |
| **Knowledge Graph** | Temporal entity-triple store with multi-hop traversal and `as_of` time-travel queries | Architectural decisions, dependencies, and facts — versioned over time |
| **Persistent Memory** | Cross-session recall, semantic dedup, agent-scoped isolation, conversation ingestion | Your AI remembers what you taught it — forever |

---

## 📊 How Synapse Compares

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
| MCP tools (v0.0.1-beta.3) | **52** | 16 | ~5 | 14 | ~10 |

> **Context Efficiency Update:** As of v0.0.1-beta.3, Synapse has compressed its tool payload by **~65%**, providing you with more effective context for actual reasoning.

---

## 🚀 Quick Start

```bash
# Install
npm install -g synapse-cortex

# Setup workspace + dependencies (ripgrep, sqlite-vec)
synapse setup

# Verify installation health
synapse doctor
```

### MCP Client Configuration

Add this to your AI client config (e.g., Claude Desktop, Cursor, Windsurf):

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

Works with **Claude Code**, **Cursor**, **Windsurf**, **Cline**, **Continue**, **Gemini CLI**, and any MCP-compatible client.

---

## 🛠️ Tool Suites

Synapse exposes **52 high-density MCP tools**, optimized for maximum context efficiency:

<details>
<summary><b>Workspace & Discovery</b> — file navigation, project summaries, scoped reads</summary>
<p><code>project_tree</code> (with <code>compact</code> mode), <code>read_file</code> (with <code>signatures</code> mode), <code>file_changed</code>, <code>list_projects</code>, <code>list_roots</code>, <code>summarize_project</code></p>
</details>

<details>
<summary><b>Search & Code Intelligence</b> — hybrid search, symbols, AST-aware queries</summary>
<p><code>search_hybrid</code>, <code>search_code</code>, <code>search_files</code>, <code>find</code>, <code>find_definition</code>, <code>find_usages</code>, <code>find_callers</code>, <code>find_implementations</code>, <code>get_symbol</code>, <code>rename_preview</code></p>
</details>

<details>
<summary><b>Memory & Recall</b> — persistent cross-session memory with semantic dedup</summary>
<p><code>memory_store</code>, <code>memory_get</code>, <code>memory_update</code>, <code>memory_delete</code>, <code>memory_list</code> (with <code>compact</code>/<code>lite</code> modes), <code>memory_store_batch</code>, <code>memory_delete_batch</code>, <code>memory_related</code>, <code>memory_suggest_relations</code>, <code>memory_add_relation</code>, <code>memory_remove_relation</code>, <code>memory_capture_event</code>, <code>memory_events</code>, <code>memory_status</code>, <code>memory_check_duplicate</code></p>
</details>

<details>
<summary><b>Knowledge Graph</b> — temporal triples, time-travel, multi-hop traversal</summary>
<p><code>synapse_kg_manage</code> (Unified mutation controller), <code>synapse_kg_query</code> (Unified read/traversal controller), <code>kg_backfill_links</code></p>
</details>

<details>
<summary><b>Agent Context</b> — priming, teaching, outcomes, task context</summary>
<p><code>agent_prime</code>, <code>teach</code>, <code>capture_outcome</code>, <code>task_context</code>, <code>whats_new</code></p>
</details>

---

## 🏗️ Architecture

Synapse follows a strictly decoupled, layered architecture to ensure performance and reliability:

- **Core (`src/core/`)**: System fundamentals, engine logic (Memory, Retrieval, Update), and infrastructure.
- **Interfaces (`src/interfaces/`)**: Entrypoints (CLI, MCP, App) that orchestrate core domains.
- **Hardened Foundation (v0.0.1-beta.3)**: Centralized Dependency Injection (DI) and O(N) AST parsing for ultra-fast indexing.

For deeper technical details, see the [Architecture Overview](./ARCHITECTURE.md).

---

## 🛡️ Enterprise-Grade Reliability

- **OIDC Trusted Publishing**: Verifiable npm provenance via GitHub Actions.
- **Continuous CodeQL**: Deep static analysis on every commit.
- **Zero-Cloud Privacy**: Your code and memories never leave your machine. No telemetry, no external APIs.
- **Local-First**: Powered by SQLite and native vector extensions for maximum speed.

---

## 🤝 Contributing & Community

We welcome contributions from the community! Whether it's fixing bugs, adding new tool suites, or improving documentation.

- **[Contributing Guide](./CONTRIBUTING.md)** — How to get started with development.
- **[Code of Conduct](./CODE_OF_CONDUCT.md)** — Our community standards.
- **[Security Policy](./SECURITY.md)** — How to report vulnerabilities.
- **[Changelog](./CHANGELOG.md)** — Track our progress.

---

<div align="center">
  <strong>Code intelligence. Knowledge graph. AI memory. One server. Your machine.</strong>
</div>
