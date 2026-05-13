---
title: Installation
description: System requirements and step-by-step installation guide for Synapse.
---

# Installation

Synapse is a lightweight, local-first MCP server. This guide walks you through system requirements, installation, and environment setup.

## System Requirements

Synapse uses modern Node.js features and native SQLite extensions.

| Requirement | Minimum |
|:---|:---|
| **Node.js** | `v22.6.0` or higher |
| **OS** | Windows (PowerShell/WSL), macOS, or Linux |
| **RAM** | 4 GB minimum (8 GB recommended for indexing large codebases) |
| **Disk** | 500 MB+ (for local embedding models and SQLite database) |

:::info Windows Users
We recommend using **PowerShell 7** or **WSL2** for the best experience. If using CMD, ensure that your PATH includes the global NPM bin directory.
:::

## 1. Global Install

Install the `synapse-cortex` package globally. This provides the `synapse` CLI and the background MCP server.

```bash
npm install -g synapse-cortex
```

## 2. Workspace Setup

Navigate to your project root and run the setup command. This initializes the local environment for that specific project.

```bash
synapse setup
```

**What happens during setup:**
- A local SQLite database is created at `~/.synapse/storage`.
- Native vector search extensions (`sqlite-vec`) are linked for your architecture.
- Default configuration is generated at `~/.synapse/config/synapse.config.json`.

## 3. Verify Health

Run the `doctor` command to ensure that your runtime is healthy and all native bindings are working correctly:

```bash
synapse doctor
```

If you see any errors, check the **[FAQ](faq)** for troubleshooting steps.

## 4. Connect Your AI Client

Synapse communicates via the **Model Context Protocol (MCP)**. You must add it as an MCP server in your AI client's configuration.

### Claude Desktop
Add this to your `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

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

### Cursor / Windsurf / Cline
Add a new MCP server with the following settings:
- **Name**: `synapse`
- **Type**: `command`
- **Command**: `synapse`

### Claude Code
Synapse integrates seamlessly with Claude Code. Ensure you run `synapse hooks install` to enable automatic memory capturing during your coding sessions.

## 5. Staying Up to Date

Synapse is actively developed. Use the built-in upgrade command to pull the latest features and migrations:

```bash
synapse upgrade
```
