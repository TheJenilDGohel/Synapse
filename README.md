> ⚠️ **DISCONTINUED** — This project is no longer actively maintained.
> Development ended June 2025. The repository is preserved for reference only.
> No new features, bug fixes, or PRs will be reviewed.
> Read the full story → [Medium article](https://medium.com/@thejenildgohel)

<h1 align="center">Synapse</h1>

<p align="center">
  <strong>The self-contained AI context layer.</strong>
</p>

<p align="center">
  A <b>powerful, local-first MCP server</b> combining <b>persistent memory</b>, <b>temporal knowledge graphs</b>, and <b>hybrid code intelligence</b> into a single SQLite engine. Zero cloud. 100% private.
</p>

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
      "command": "npx",
      "args": ["-y", "synapse-cortex", "mcp", "start"],
      "env": {
        "PROJECT_ROOTS": "/path/to/your/project"
      }
    }
  }
}
```

---

## ✨ Core Capabilities

Synapse exposes 6 consolidated "Power Suites" to your AI agent, enforcing strict SOLID and Clean Architecture principles underneath.

### 1. Persistent Memory
Store facts, decisions, and preferences that survive between sessions.
- `synapse_memory_manage` - Store, update, and merge memory fragments.
- `synapse_memory_query` - Recall context, find related facts, and view history.

### 2. Temporal Knowledge Graph
Map the evolution of your software architecture.
- `synapse_kg_manage` - Add or invalidate entities and relationship triples.
- `synapse_kg_query` - Traverse the graph, find bridges, and time-travel to past states.

### 3. Hybrid Code Intelligence
Find code by meaning, not just exact text.
- `synapse_search` - Fused BM25 (lexical) and Vector (semantic) search over AST chunks.
- `synapse_symbol` - Instantly resolve definitions, callers, and interface implementations.

### 4. Intelligence & Prevention
Proactively predict context, prevent recurring mistakes, and analyze architectural risks.
- `context_predict` - Predict context needed for the current session.
- `immune_record_mistake` / `immune_scan` - Teach Synapse about a bug so it never happens again.
- `premortem_analyze` - Analyze how an architectural approach has historically failed.

### 5. Workspace Operations
- `synapse_workspace_manage` - Safely read, explore, and summarize local project structures.

### 6. System Lifecycle
- `synapse_core` - Manage the MCP server lifecycle, health checks, and global settings.

---

## 🏗️ Architecture

Synapse is built on a **Clean Architecture** model, ensuring 100% local privacy and deep separation of concerns.

- **Zero Cloud / Local-First**: All data, embeddings, and relationships are stored in a local SQLite database (`~/.synapse/`). No telemetry, no external API calls.
- **Dependency Inversion**: The core cognitive engine (`src/core/engine`) is entirely decoupled from the MCP and CLI delivery mechanisms (`src/interfaces`).
- **High Performance**: Leverages `sqlite-vec` for blazing-fast vector similarity search and `ripgrep` for ultra-fast lexical filtering.
- **Graceful Resilience (Lite Mode)**: Heavyweight native dependencies are optional. If native vector extensions or deep-learning runtimes fail to install (common in restricted or offline environments), Synapse automatically enters **Lite Mode**, maintaining full Knowledge Graph and Lexical (ripgrep) search capabilities.

## ⚖️ Why Synapse? (Competitive Edge)

Synapse is purpose-built for **developers using AI coding agents** in long-running projects.

| Feature | Synapse | Mem0 | Zep / Graphiti |
| :--- | :--- | :--- | :--- |
| **Privacy** | 100% Local (SQLite) | Cloud-first | Cloud/Docker |
| **Code Search** | Hybrid (AST + Vec) | ❌ | ❌ |
| **Temporal KG** | Bi-temporal (kg_as_of) | ❌ | ✅ |
| **Setup Time** | < 30s (zero-conf) | Instant (but Cloud) | Minutes (Docker) |
| **Moat** | The *intersection* of local-first privacy, code intelligence, and temporal knowledge. | Large-scale generic AI memory. | Enterprise-scale graph memory. |

**Choose Synapse if:** You are a solo developer or security-conscious team using Claude Code, Cursor, or Windsurf and want your AI to "remember" your architectural decisions and code context week-over-week without sending data to a third-party memory cloud.

For full details, read [ARCHITECTURE.md](./docs/ARCHITECTURE.md) and [PROJECT.md](./docs/PROJECT.md).

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md).

## 📄 License

MIT License. See [LICENSE](./LICENSE) for details.
