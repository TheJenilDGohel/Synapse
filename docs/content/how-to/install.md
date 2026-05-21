---
title: How to Install and Configure Synapse
description: Detailed steps for setting up Synapse across different platforms and clients.
---

# How to Install and Configure Synapse

This guide provides detailed instructions for installing Synapse and configuring it for various AI development environments.

## System Requirements

| Component | Requirement |
|:---|:---|
| **Node.js** | `v22.6.0+` |
| **OS** | Windows (PowerShell 7 recommended), macOS, Linux |
| **Memory** | 4GB RAM minimum |

## Step 1: Global Installation

Install the package via npm:

```bash
npm install -g synapse-cortex
```

## Step 2: Local Project Setup

Synapse maintains a local database for each project. Run this command in your project root:

```bash
synapse setup
```

This will:
1. Create a `~/.synapse` directory for global configuration.
2. Initialize a local SQLite database for the current workspace.
3. Link the necessary native vector extensions.

## Step 3: Verifying the Installation

Always run the doctor command after a new installation or update:

```bash
synapse doctor
```

## Step 4: Client Configuration

### Claude Desktop
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "synapse": {
      "command": "synapse",
      "env": {
        "MCP_MODE": "stdio"
      }
    }
  }
}
```

### Cursor / Windsurf / Cline
1. Open the MCP settings in your client.
2. Add a new server named `synapse`.
3. Set the type to `command` and the command to `synapse`.

## Step 5: Updating Synapse

To pull the latest improvements and migrations:

```bash
synapse upgrade
```
