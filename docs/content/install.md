---
title: Installation
description: System requirements and step-by-step installation guide for Synapse.
---

# Installation

Synapse is a lightweight, local-first MCP server. This guide walks you through installation and environment setup.

## System Requirements

Synapse uses modern Node.js features and native SQLite extensions. Ensure your system meets these requirements before installing:

| Requirement | Minimum |
|:---|:---|
| **Node.js** | `v22.6.0` or higher |
| **OS** | Windows (PowerShell/WSL), macOS, or Linux |
| **RAM** | 4 GB minimum (8 GB recommended for large codebases) |
| **Disk** | 500 MB+ (grows with your knowledge graph) |

:::info
Node.js v22.6.0+ is required for native SQLite support and modern ESM features used by the vector extension.
:::

## 1. Global Install

Install the `synapse-cortex` package globally. This provides the `synapse` CLI and starts the MCP server.

```bash
npm install -g synapse-cortex
```

## 2. Workspace Setup

Navigate to your project root and run the setup command. This initializes Synapse for the current workspace.

```bash
synapse setup
```

**What happens during setup:**
- A local SQLite database is created to store your knowledge graph and embeddings.
- Native vector search extensions (`sqlite-vec`) are compiled for your architecture.
- Optional tools like `ripgrep` are detected and integrated for faster code search.

## 3. Verify the Install

Run the doctor command to check that all dependencies are correctly linked and your environment is healthy:

```bash
synapse doctor
```

This detects common issues: incompatible Node.js versions, missing native bindings, or blocked ports.

## 4. Register with Your AI Client

Synapse communicates via the **Model Context Protocol (MCP)**. Add it as an MCP server in your AI client config.

### Claude Desktop / Claude Code

Add this to your `claude_desktop_config.json`:

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

Synapse also works with **Cursor**, **Windsurf**, **Cline**, **Continue**, **Gemini CLI**, and any other MCP-compatible client.

## 5. Staying Up to Date

Synapse ships updates frequently. Use the built-in upgrade command to stay current:

```bash
synapse upgrade
```
