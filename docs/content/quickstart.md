---
title: Quick Start
description: Install Synapse and connect it to any MCP-compatible client.
---

# Quick Start

Get Synapse running and connected to an MCP-compatible client in minutes.

## 1. Install

```bash
npm install -g synapse-cortex
```

:::info
Requires **Node.js >= 22.6.0**. Check your version with `node --version`.
:::

## 2. Initialize Your Workspace

Navigate to your project root and run setup:

```bash
synapse setup
synapse doctor
```

`setup` creates the local SQLite database and installs native dependencies. `doctor` confirms the runtime is healthy.

## 3. Connect Your MCP Client

Add Synapse as an MCP server in your client configuration:

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

This works with Claude Desktop, Claude Code, Cursor, Windsurf, Cline, Continue, Gemini CLI, and other MCP-compatible clients.

## 4. Query Your Project

Once connected, your client can call Synapse tools for code search, memory, and graph queries. Start with an architecture overview:

> *"Using Synapse, analyze the project structure and identify the core services and their relationships."*

Synapse can use `summarize_project`, `search_hybrid`, and `project_tree` to produce a semantically accurate map of your codebase.

## 5. Store Project Knowledge

Store a project-level fact that persists across future sessions:

> *"Remember that the authentication module uses JWT with 15-minute expiry. Store this in memory."*

Synapse stores this with `memory_store`, and the fact can be retrieved later with `memory_recall`.

---

**What's Next?**

- Understand **[Code Intelligence](pillars/intel)**: semantic search, symbol finding, and AST-aware retrieval.
- Explore the **[Knowledge Graph](pillars/temporal)**: temporal triples and architectural decision tracking.
- Learn about **[Persistent Memory](pillars/memory)**: cross-session recall and scoped isolation.
