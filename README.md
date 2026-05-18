<h1 align="center">Loci</h1>

<p align="center">
  <strong>The memory palace for AI agents.</strong>
</p>

<p align="center">
  A production-ready MCP server combining <b>persistent AI memory</b>, <b>temporal knowledge graph</b>, and <b>semantic code intelligence</b> into a single, high-performance local engine.
  <br/>
  <b>Zero cloud. Local-first. Pure SQLite.</b>
</p>

<p align="center">
  <a href="https://github.com/TheJenilDGohel/Loci/releases"><img src="https://img.shields.io/github/v/release/TheJenilDGohel/Loci?color=2dd4bf&label=release&style=flat-square" alt="latest release"></a>
  <a href="https://www.npmjs.com/package/loci-mcp"><img src="https://img.shields.io/npm/v/loci-mcp?color=2dd4bf&label=npm&style=flat-square" alt="npm version"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/TheJenilDGohel/Loci?color=2dd4bf&style=flat-square" alt="license"></a>
  <a href="https://github.com/TheJenilDGohel/Loci/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/TheJenilDGohel/Loci/ci.yml?branch=main&label=quality&style=flat-square" alt="quality status"></a>
  <a href="https://github.com/TheJenilDGohel/Loci/security/advisories"><img src="https://img.shields.io/badge/security-monitored-2dd4bf?style=flat-square" alt="security monitored"></a>
</p>

---

## 🏛️ The Philosophy: The Memory Palace

In ancient Greece, orators memorized entire speeches using a technique called the
**Method of Loci** — the memory palace. They would mentally walk through a familiar
place, anchoring each idea to a specific location. To recall, they simply walked the
path again.

Every great mind needs a place where knowledge lives.

AI agents today are orators without a palace. Every session starts from nothing —
no memory of past decisions, no map of the codebase, no record of what was tried
and why it failed. The context is lost. The signal dies.

**Loci is the memory palace for your AI agents.**

We give every piece of knowledge a place: a code symbol, an architectural decision,
a lesson learned, a dependency relationship. Your agent walks the palace and finds
exactly what it needs — every time, across every session, entirely on your machine.

*Intelligence lives in its place.*

## ✨ Enterprise-Grade Capabilities

Every other MCP server forces a choice between memory **or** code intelligence. Loci is the first to deliver a unified solution operating securely on your machine:

- **Code Intelligence**: Hybrid BM25+vector search, AST-aware chunking, and advanced symbol tracking (definitions, usages, and callers) ensure your AI understands architectural intent, not just string matching.
- **Temporal Knowledge Graph**: A sophisticated entity-triple store with multi-hop traversal and time-travel querying (`as_of`). Track architectural facts, dependencies, and decisions as they evolve over time.
- **Persistent Agent Memory**: Enable long-term recall across sessions with semantic deduplication and agent-scoped isolation. Your AI remembers what you taught it, forever.

## 📊 The Loci Advantage

Loci offers an unprecedented feature set compared to specialized servers.

| Feature | **Loci** | Mem0 | GitNexus | CodeGraphContext |
|:---|:---:|:---:|:---:|:---:|
| **Persistent AI Memory** | **✅** | ✅ | ❌ | ❌ |
| **Knowledge Graph** | **✅** | ❌ | Code-only | ✅ |
| **Semantic Code Search** | **✅** | ❌ | ✅ | ✅ |
| **AST-aware Chunking** | **✅** | ❌ | ✅ | ❌ |
| **Temporal Time-Travel** | **✅** | ❌ | ❌ | ❌ |
| **Local-first / No Cloud** | **✅** | Hybrid | ✅ | ✅ |
| **MCP Tool Model** | **Power Controllers** | Granular | Granular | Granular |

*(Note: Loci uses a high-density "Power Controller" model with ~14 tools that replace 74+ granular ones, maximizing context efficiency for LLM reasoning).*

## 🚀 Quick Start

Get up and running in seconds. Loci integrates seamlessly into any MCP-compatible environment.

```bash
# 1. Install globally
npm install -g loci-mcp

# 2. Setup workspace and local dependencies (ripgrep, sqlite-vec)
loci setup

# 3. Verify installation health
loci doctor
```

### Client Configuration

Add Loci to your AI client configuration (e.g., Claude Desktop, Cursor, Windsurf, Cline).

```json
{
  "mcpServers": {
    "loci": {
      "command": "loci",
      "startup_timeout_sec": 30,
      "env": {
        "MCP_MODE": "stdio",
        "LOCI_CONFIG": "~/.loci/config/loci.config.json",
        "LOCI_INDEX_BACKEND": "sqlite-vec",
        "LOCI_MEMORY_ENABLED": "true"
      }
    }
  }
}
```

## 🛠️ Comprehensive Tool Suites

Loci exposes high-density **Power Controllers**, compatible with Gemini and Claude:

- **Workspace & Discovery**: Navigate files, generate project summaries, and read code with bounded scopes (`synapse_workspace_manage`).
- **Search & Code Intelligence**: Execute hybrid searches and look up precise AST symbols (`synapse_search`, `synapse_symbol_query`).
- **Memory & Recall**: Store, retrieve, and deduplicate contextual knowledge across sessions (`synapse_memory_manage`, `synapse_memory_query`).
- **Knowledge Graph**: Traverse and manage temporal entity relationships (`synapse_kg_manage`, `synapse_kg_query`).
- **Agent Context**: Prime your agent, teach lessons, and capture task outcomes (`synapse_agent_prime`, `synapse_memory_manage`).

## 🛡️ Enterprise Security & Reliability

Built for production environments where privacy and stability are non-negotiable:

- **Zero-Cloud Privacy**: All code parsing, embeddings, and database operations happen strictly on your machine.
- **Local-First Speed**: Powered by pure SQLite with native vector extensions (`sqlite-vec`) for blazing-fast retrieval.
- **Continuous Validation**: Monitored via continuous CodeQL static analysis and OIDC Trusted Publishing provenance.

## 🤝 Community & Support

Join us in building the ultimate context engine for AI agents!

- **[Documentation](https://TheJenilDGohel.github.io/Loci/)** — Full guides and reference.
- **[Contributing](./CONTRIBUTING.md)** — We welcome PRs, bug reports, and new ideas.
- **[Security](./SECURITY.md)** — Report vulnerabilities securely.
- **[Changelog](./CHANGELOG.md)** — See what's new.

---

<div align="center">
  <strong>Code intelligence. Knowledge graph. AI memory. One server. Your machine.</strong>
</div>
