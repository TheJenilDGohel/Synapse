<h1 align="center">Synapse</h1>

<p align="center">
  <strong>The Unified Context Layer for AI Agents.</strong>
</p>

<p align="center">
  A production-ready MCP server combining <b>persistent AI memory</b>, <b>temporal knowledge graph</b>, and <b>semantic code intelligence</b> into a single, high-performance local engine.
  <br/>
  <b>Zero cloud. Local-first. Pure SQLite.</b>
</p>

<p align="center">
  <a href="https://github.com/TheJenilDGohel/Synapse/releases"><img src="https://img.shields.io/github/v/release/TheJenilDGohel/Synapse?color=2dd4bf&label=release&style=flat-square" alt="latest release"></a>
  <a href="https://www.npmjs.com/package/synapse-cortex"><img src="https://img.shields.io/npm/v/synapse-cortex?color=2dd4bf&label=npm&style=flat-square" alt="npm version"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/TheJenilDGohel/Synapse?color=2dd4bf&style=flat-square" alt="license"></a>
  <a href="https://github.com/TheJenilDGohel/Synapse/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/TheJenilDGohel/Synapse/ci.yml?branch=main&label=quality&style=flat-square" alt="quality status"></a>
  <a href="https://github.com/TheJenilDGohel/Synapse/security/advisories"><img src="https://img.shields.io/badge/security-monitored-2dd4bf?style=flat-square" alt="security monitored"></a>
</p>

---

## ⚡ Overview

AI coding agents often fail due to a **loss of context**: they lack awareness of past architectural decisions, the history of breaking changes, or lessons learned from previous iterations.

**Synapse** eliminates this context signal loss. By operating as the transmission layer between your codebase and your AI agent, Synapse ensures your AI has exactly the intelligence it needs to do its job.

## ✨ Enterprise-Grade Capabilities

Every other MCP server forces a choice between memory **or** code intelligence. Synapse is the first to deliver a unified solution operating securely on your machine:

- **Code Intelligence**: Hybrid BM25+vector search, AST-aware chunking, and advanced symbol tracking (definitions, usages, and callers) ensure your AI understands architectural intent, not just string matching.
- **Temporal Knowledge Graph**: A sophisticated entity-triple store with multi-hop traversal and time-travel querying (`as_of`). Track architectural facts, dependencies, and decisions as they evolve over time.
- **Persistent Agent Memory**: Enable long-term recall across sessions with semantic deduplication and agent-scoped isolation. Your AI remembers what you taught it, forever.

## 📊 The Synapse Advantage

Synapse offers an unprecedented feature set compared to specialized servers.

| Feature | **Synapse** | Mem0 | GitNexus | CodeGraphContext |
|:---|:---:|:---:|:---:|:---:|
| **Persistent AI Memory** | **✅** | ✅ | ❌ | ❌ |
| **Knowledge Graph** | **✅** | ❌ | Code-only | ✅ |
| **Semantic Code Search** | **✅** | ❌ | ✅ | ✅ |
| **AST-aware Chunking** | **✅** | ❌ | ✅ | ❌ |
| **Temporal Time-Travel** | **✅** | ❌ | ❌ | ❌ |
| **Local-first / No Cloud** | **✅** | Hybrid | ✅ | ✅ |
| **Total MCP Tools** | **74** | 8 | 16 | ~10 |

*(Note: Synapse boasts a highly optimized tool payload size, compressed for maximum context efficiency during LLM reasoning).*

## 🚀 Quick Start

Get up and running in seconds. Synapse integrates seamlessly into any MCP-compatible environment.

```bash
# 1. Install globally
npm install -g synapse-cortex

# 2. Setup workspace and local dependencies (ripgrep, sqlite-vec)
synapse setup

# 3. Verify installation health
synapse doctor
```

### Client Configuration

Add Synapse to your AI client configuration (e.g., Claude Desktop, Cursor, Windsurf, Cline).

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

## 🛠️ Comprehensive Tool Suites

Synapse exposes **74 high-density MCP tools**, thoughtfully organized into powerful domains:

- **Workspace & Discovery**: Navigate files, generate project summaries, and read code with bounded scopes (`project_tree`, `read_file`, `summarize_project`).
- **Search & Code Intelligence**: Execute hybrid searches and look up precise AST symbols (`search_hybrid`, `find_usages`, `find_implementations`).
- **Memory & Recall**: Store, retrieve, and deduplicate contextual knowledge across sessions (`memory_store`, `memory_list`, `memory_suggest_relations`).
- **Knowledge Graph**: Traverse and manage temporal entity relationships (`synapse_kg_query`, `synapse_kg_manage`).
- **Agent Context**: Prime your agent, teach lessons, and capture task outcomes (`agent_prime`, `teach`, `capture_outcome`).

## 🛡️ Enterprise Security & Reliability

Built for production environments where privacy and stability are non-negotiable:

- **Zero-Cloud Privacy**: All code parsing, embeddings, and database operations happen strictly on your machine.
- **Local-First Speed**: Powered by pure SQLite with native vector extensions (`sqlite-vec`) for blazing-fast retrieval.
- **Continuous Validation**: Monitored via continuous CodeQL static analysis and OIDC Trusted Publishing provenance.

## 🤝 Community & Support

Join us in building the ultimate context engine for AI agents!

- **[Documentation](https://TheJenilDGohel.github.io/Synapse/)** — Full guides and reference.
- **[Contributing](./CONTRIBUTING.md)** — We welcome PRs, bug reports, and new ideas.
- **[Security](./SECURITY.md)** — Report vulnerabilities securely.
- **[Changelog](./CHANGELOG.md)** — See what's new.

---

<div align="center">
  <strong>Code intelligence. Knowledge graph. AI memory. One server. Your machine.</strong>
</div>