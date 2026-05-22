<h1 align="center">Synapse</h1>

<p align="center">
  <strong>The memory palace for AI agents.</strong>
</p>

<p align="center">
  A <b>powerful, self-contained AI context layer</b> combining <b>persistent memory</b>, <b>temporal knowledge graphs</b>, and <b>hybrid code intelligence</b> into a single local engine.
  <br/>
  <b>100% Local. Zero Cloud. Private by Design.</b>
</p>

<p align="center">
  <a href="https://github.com/TheJenilDGohel/Synapse/releases"><img src="https://img.shields.io/github/v/release/TheJenilDGohel/Synapse?color=2dd4bf&label=release&style=flat-square" alt="latest release"></a>
  <a href="https://www.npmjs.com/package/synapse-cortex"><img src="https://img.shields.io/npm/v/synapse-cortex?color=2dd4bf&label=npm&style=flat-square" alt="npm version"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/TheJenilDGohel/Synapse?color=2dd4bf&style=flat-square" alt="license"></a>
  <a href="https://github.com/TheJenilDGohel/Synapse/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/TheJenilDGohel/Synapse/ci.yml?branch=beta&label=quality&style=flat-square" alt="quality status"></a>
</p>

---

## 🏛️ The Philosophy: Intelligence in its Place

AI agents today are orators without a palace. Every session starts from nothing — no memory of past decisions, no map of the codebase, no record of what failed. The signal dies, and you pay the "context tax" every time you re-explain your project.

**Synapse is the memory palace for your AI agents.**

We give every piece of knowledge a place: a code symbol, an architectural decision, a lesson learned, a dependency relationship. Your agent walks the palace and finds exactly what it needs — entirely on your machine.

---

## ⚡ See It In Action

**Without Synapse — the AI starts from zero every session:**
> **User:** "Refactor the auth service like we decided last week"  
> **AI:** "I don't have context from previous sessions. Could you remind me what was decided?"

**With Synapse — the AI picks up exactly where you left off:**
> **User:** "Refactor the auth service like we decided last week"  
> **AI:** *[recalls stored decision]* "Based on the architectural decision recorded on May 14th to migrate from session tokens to JWT with refresh-token rotation, here's the refactor for AuthService..."

**Code search that understands intent, not just strings:**
```bash
# grep finds: nothing (no literal "rate limit" in the handler name)
grep -r "rate limit handler" ./src

# Synapse hybrid search finds: the actual implementation
# → RateLimitMiddleware.ts (semantic: rate limiting logic)
# → CircuitBreaker.ts (semantic: failure threshold handling)
# → RetryPolicy.ts (semantic: backoff on limit exceeded)
```

**Knowledge graph with time-travel:**
```bash
# What did AuthService depend on 3 months ago?
kg_as_of --entity "AuthService" --timestamp "2025-02-01"
# → Redis (session store), PostgreSQL (user table)

# What does it depend on now?
kg_query --entity "AuthService"
# → PostgreSQL (user table), JWT issuer (new)
# Redis dependency was invalidated on 2025-03-15
```

---

## ✨ Core Capabilities

Synapse is the only MCP server combining temporal time-travel queries with persistent AI memory and hybrid code search in a single local SQLite database.

- **Temporal Knowledge Graph**: A sophisticated entity-triple store with multi-hop traversal and **time-travel querying** (`as_of`). Track architectural facts and dependencies as they evolve.
- **Persistent Agent Memory**: Long-term recall across sessions with semantic deduplication and **agent-scoped isolation**. Perfect for multi-agent workflows.
- **Semantic Code Intelligence**: Hybrid BM25+vector search, AST-aware chunking, and advanced symbol tracking (definitions, usages, and callers).
- **Performance Optimized**: Optimized AST parsing using `WeakMap` memoization (reduced resolution complexity from **O(N²)** to **O(N)**).

---

## 🛠️ Focused Tool Suites

Synapse tools are organized into focused suites. Instead of a menu of 70+ granular options, agents invoke the right suite for their specific workflow:

- **📂 Workspace & Discovery**: Navigate files, generate project summaries, and read code with bounded scopes.
- **🔍 Search & Intelligence**: Execute hybrid semantic searches and look up precise AST symbols.
- **🧠 Memory & Recall**: Store, retrieve, and deduplicate contextual knowledge across sessions.
- **🌐 Knowledge Graph**: Traverse and manage temporal entity relationships.
- **🤖 Agent Context**: Prime your agent with project-specific "lessons" and capture task outcomes for future recall.

---

## 🚀 Quick Start

Get up and running in seconds.

> **Note:** This is `synapse-cortex` by **TheJenilDGohel** — the MCP server for persistent AI memory + knowledge graph + code intelligence.
> npm: [https://www.npmjs.com/package/synapse-cortex](https://www.npmjs.com/package/synapse-cortex)

```bash
# 1. Install globally
npm install -g synapse-cortex          # latest stable
npm install -g synapse-cortex@beta     # latest beta

# 2. Setup workspace and local dependencies (ripgrep, sqlite-vec)
synapse setup

# 3. Verify installation health
synapse doctor
```

### Client Configuration (MCP)
Add Synapse to your AI client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "synapse": {
      "command": "synapse",
      "args": ["start"],
      "env": {
        "SYNAPSE_MEMORY_ENABLED": "true"
      }
    }
  }
}
```

---

## ⚖️ Why Synapse?

| Feature | Synapse | Cloud-based Alternatives |
|:---|:---:|:---:|
| **Privacy** | 100% Local. No data leaves your machine. | Data processed/stored in the cloud. |
| **Persistence** | Cross-session memory & temporal tracking. | Often limited to single-session context. |
| **Intelligence** | AST-aware + Hybrid Search. | Often limited to string matching or basic RAG. |
| **Cost** | Free (Self-hosted). | Monthly subscriptions or per-token fees. |
| **Tradeoff** | Requires local resources (RAM/CPU). | Lightweight local footprint. |

*Self-reported comparison as of May 2026 — contributions welcome.*

---

## 🛡️ Security & Privacy

- **Zero-Cloud Privacy**: All code parsing, embeddings, and database operations happen strictly on your machine.
- **No Telemetry**: We do not track your usage, queries, or code.
- **Local-First Speed**: Powered by pure SQLite with native vector extensions (`sqlite-vec`) for blazing-fast retrieval.

---

## 🤝 Community & Support

- **[Documentation](https://thejenildgohel.github.io/Synapse/)** — *Note: Our documentation site is hosted on Firebase; the Synapse runtime itself is 100% local.*
- **[Contributing](./CONTRIBUTING.md)** — We welcome PRs and bug reports.
- **[Changelog](./CHANGELOG.md)** — See what's new.

---

<div align="center">
  <strong>Code intelligence. Knowledge graph. AI memory. One server. Your machine.</strong>
</div>
