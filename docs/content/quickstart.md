---
title: Quick Start
description: Install Synapse and connect it to any MCP-compatible client in 5 minutes.
---

# Quick Start

Get Synapse running and connected to an MCP-compatible client in minutes.

## 1. Install

```bash
npm install -g synapse-cortex
```

:::info Compatibility
Requires **Node.js >= 22.6.0**. Check your version with `node --version`. Works on Windows, macOS, and Linux.
:::

## 2. Initialize Your Workspace

Navigate to your project root and run the setup sequence:

```bash
synapse setup
synapse doctor
```

- **`setup`**: Creates the local SQLite database and downloads native vector extensions.
- **`doctor`**: Verifies that your environment is healthy and ready for AI integration.

## 3. Connect Your MCP Client

Add Synapse to your AI client configuration. This enables the agent to call Synapse tools during a chat.

### Recommended Config (Claude Desktop)
Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "synapse": {
      "command": "synapse",
      "env": {
        "MCP_MODE": "stdio",
        "SYNAPSE_MEMORY_ENABLED": "true"
      }
    }
  }
}
```

Works with **Claude Code**, **Cursor**, **Windsurf**, **Cline**, **Continue**, **Gemini CLI**, and any MCP-compatible environment.

## 4. Prime the Agent

Once connected, the most effective way to start is by "priming" the agent with the project's current state.

> *"Analyze the project structure and summarize the core modules and their relationships."*

The agent will use tools like `agent_prime`, `project_tree`, and `summarize_project` to build a mental map of your codebase.

## 5. Teach and Remember

Synapse excels at capturing knowledge that usually gets lost between sessions.

> *"Remember that we use Vitest for unit tests, not Jest. Always apply this rule."*

The agent will use `teach` or `memory_store` to persist this fact. In future sessions, Synapse will automatically surface this rule when the agent starts a testing task.

---

**Deep Dives:**

- **[Installation Guide](install)**: OS-specific setup and client configuration.
- **[Tools Reference](tools)**: Comprehensive list of all 74 available MCP tools.
- **[The Three Pillars](pillars/intel)**: Understanding Code Intelligence, Memory, and Knowledge Graph.
