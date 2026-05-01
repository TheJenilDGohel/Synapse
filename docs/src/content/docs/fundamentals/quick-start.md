---
title: Quick Start
description: Get up and running with Synapse in minutes.
---

## 1. Installation

Install Synapse globally via npm:

```bash
npm install -g synapse
```

## 2. Initialization

Initialize your workspace and configure your first project:

```bash
synapse setup
```

Follow the interactive prompts to:
- Select your embedding model (default: `all-MiniLM-L6-v2`).
- Add your first project root.
- Index your codebase.

## 3. Connect to your AI Agent

Synapse works with any MCP-compliant client. 

### Cursor / Windsurf
Add a new MCP server with:
- **Type**: `command`
- **Command**: `npx -y synapse`

### Gemini CLI
Synapse is automatically discovered if installed globally.

## 4. First Search

Try searching for a concept in your code:

```bash
synapse search "authentication logic"
```
