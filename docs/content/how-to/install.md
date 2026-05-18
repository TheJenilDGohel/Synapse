---
title: How to Install and Configure Loci
description: Detailed steps for setting up Loci across different platforms and clients.
---

# How to Install and Configure Loci

This guide provides detailed instructions for installing Loci and configuring it for various AI development environments.

## System Requirements

| Component | Requirement |
|:---|:---|
| **Node.js** | `v22.6.0+` |
| **OS** | Windows (PowerShell 7 recommended), macOS, Linux |
| **Memory** | 4GB RAM minimum |

## Step 1: Global Installation

Install the package via npm:

```bash
npm install -g loci-mcp
```

## Step 2: Local Project Setup

Loci maintains a local database for each project. Run this command in your project root:

```bash
loci setup
```

This will:
1. Create a `~/.loci` directory for global configuration.
2. Initialize a local SQLite database for the current workspace.
3. Link the necessary native vector extensions.

## Step 3: Verifying the Installation

Always run the doctor command after a new installation or update:

```bash
loci doctor
```

## Step 4: Client Configuration

### Claude Desktop
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "loci": {
      "command": "loci",
      "env": {
        "MCP_MODE": "stdio"
      }
    }
  }
}
```

### Cursor / Windsurf / Cline
1. Open the MCP settings in your client.
2. Add a new server named `loci`.
3. Set the type to `command` and the command to `loci`.

## Step 5: Updating Loci

To pull the latest improvements and migrations:

```bash
loci upgrade
```
