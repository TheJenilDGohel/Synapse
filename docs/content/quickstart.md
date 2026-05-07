---
title: Quick Start
description: Get Synapse connected to your AI agent in under 2 minutes.
---

# Quick Start

Get Synapse running and connected to your AI agent in minutes.

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

`setup` creates the local SQLite database and installs native dependencies. `doctor` confirms everything is healthy.

## 3. Connect Your AI Agent

Add Synapse as an MCP server in your AI client configuration:

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

This works with Claude Desktop, Claude Code, Cursor, Windsurf, Cline, Continue, and Gemini CLI.

## 4. Prime Your Agent

Once connected, your agent has 74 tools available. Start with an architecture overview:

> *"Using Synapse, analyze the project structure and identify the core services and their relationships."*

The agent will call `summarize_project`, `search_hybrid`, and `project_tree` to give you a deep, semantically-accurate map of your codebase.

## 5. Teach the Agent Something

Store a project-level fact that persists across all future sessions:

> *"Remember that the authentication module uses JWT with 15-minute expiry. Store this in memory."*

The agent will call `memory_store`, and this fact will be available in every future conversation via `memory_recall`.

---

**What's Next?**
- Understand **[Code Intelligence](/pillars/intel)** — semantic search, symbol finding, and AST-aware retrieval.
- Explore the **[Knowledge Graph](/pillars/temporal)** — temporal triples and architectural decision tracking.
- Learn about **[Persistent Memory](/pillars/memory)** — cross-session recall and agent-scoped isolation.
