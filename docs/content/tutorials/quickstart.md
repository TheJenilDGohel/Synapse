---
title: Quick Start Tutorial
description: Get your first win with Synapse in 5 minutes.
---

# Quick Start Tutorial

Welcome to Synapse! This tutorial will guide you through installing Synapse and using it to "prime" an AI agent with your project's context.

## Prerequisites
- Node.js **v22.6.0** or higher.
- An MCP-compatible client (e.g., **Claude Desktop**, **Cursor**, or **Gemini CLI**).

## 1. Installation

Install the Synapse CLI globally:

```bash
npm install -g synapse-cortex
```

## 2. Workspace Initialization

Navigate to a project you are currently working on and run the setup sequence:

```bash
synapse setup
synapse doctor
```

- **`setup`**: Initializes your local context database.
- **`doctor`**: Confirms your environment is ready.

## 3. Connecting to your AI

Add Synapse to your AI client. For **Claude Desktop**, add this to your configuration file:

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

## 4. Your First "Prime"

Start a new chat with your agent and ask:

> "Prime yourself with this project and give me a high-level summary of the architecture."

**What happens:** The agent will automatically call `synapse_agent_prime`. This tool reads your project structure, existing memories, and recent changes to give the agent an immediate "mental map" of your work.

## 5. Capturing a Lesson

Tell the agent something important about your workflow:

> "Remember that for this project, we always use functional components for React and avoid class components."

**What happens:** The agent uses `synapse_memory_manage` to store this rule. In your next session, Synapse will automatically remind the agent of this preference.

---

**Next Steps:**
- [Detailed Installation Guide](../how-to/install.md)
- [Explore the Power Controllers](../reference/tools.md)
