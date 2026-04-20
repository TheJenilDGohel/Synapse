---
title: CLI Reference
description: Complete command reference for the synapse CLI tool
sidebar_label: CLI Reference
sidebar_position: 8
---

# CLI Reference

Synapse is a full CLI tool. Everything is managed from the terminal with `synapse <noun> <verb>` subcommands.

## Global Flags

| Flag | Description |
|------|-------------|
| `--json` | Machine-readable JSON output |
| `--verbose` | Detailed output |
| `--quiet` | Suppress non-essential output |
| `--config <path>` | Override config file location |

## Core Commands

```bash
synapse setup              # configure roots, backends, AI clients
synapse doctor             # health check
synapse upgrade            # self-update
synapse version            # current version
synapse status             # runtime status
```

## Memory Commands

```bash
synapse memory add "content" --type decision --importance 80 --nest myproject
synapse memory search "query" --limit 10 --nest myproject
synapse memory list --kind decision --json
synapse memory show <id>
synapse memory delete <id> -f
```

## Knowledge Graph Commands

```bash
synapse kg add Alice works_on ProjectX --confidence 0.9
synapse kg query Alice --direction outgoing
synapse kg timeline Alice
synapse kg stats
```

## Skill Commands

```bash
synapse skill install       # install skills to all detected AI clients
synapse skill list          # show installed skills
synapse skill remove <name> # uninstall a skill
```

## MCP Commands

```bash
synapse mcp start           # start MCP server (stdio mode)
synapse mcp status          # server health and config
synapse mcp config          # output MCP config JSON for AI clients
synapse mcp config --client claude  # output claude mcp add command
```

## Ingest Commands

```bash
synapse ingest ./chat.md                    # auto-detect format
synapse ingest ./export.json --format json  # explicit format
synapse ingest ./chat.md --nest project --branch auth
```

## Shell Completions

```bash
synapse completion bash >> ~/.bashrc
synapse completion zsh >> ~/.zshrc
synapse completion fish > ~/.config/fish/completions/synapse.fish
```
