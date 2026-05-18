---
title: CLI Reference
description: Guide to the Loci command-line interface and its subcommands.
---

# CLI Reference

The `loci` command-line tool allows you to manage your local infrastructure, perform diagnostics, and manually interact with the memory and knowledge graph pillars.

## Core Commands

### `loci setup`
Initializes a new Loci workspace. It creates the necessary database folders, downloads native extensions, and prepares the environment for AI integration.

### `loci doctor`
Runs a comprehensive health check on your environment. It verifies Node.js version, native SQLite extensions, file system permissions, and network connectivity for model downloads.

### `loci upgrade`
Checks for and installs the latest version of Loci. It also migrates your configuration and database schema if necessary.

### `loci onboard`
A guided, interactive walkthrough for new users to help them configure their first workspace and connect their AI client.

### `loci dashboard`
Starts a local web-based dashboard (if enabled) to visually explore your persistent memory and knowledge graph.

## Pillar Commands

### `loci memory <verb>`
Manually interact with the memory pillar.
- **`add <content>`**: Store a new fact.
- **`search <query>`**: Search for memories.
- **`list`**: List all stored memories.
- **`delete <id>`**: Remove a memory.

### `loci kg <verb>`
Manually interact with the knowledge graph.
- **`add <subj> <pred> <obj>`**: Record a triple.
- **`query <entity>`**: Show relationships for an entity.
- **`timeline <entity>`**: Show historical changes for an entity.
- **`stats`**: Show graph density and coverage.

## Utility Commands

### `loci selftest`
Runs an end-to-end validation suite, testing indexing, retrieval, and memory storage to ensure the system is working perfectly.

### `loci version`
Prints the current version of the Loci server.

## Global Flags

These flags can be appended to almost any command:

| Flag | Description |
|:---|:---|
| `--json` | Output results in machine-readable JSON format. |
| `--verbose` | Increase output detail for debugging. |
| `--quiet` | Suppress all non-essential output. |
| `--config <path>` | Specify a custom path to a `loci.config.json` file. |
| `--help, -h` | Show help for the command or subcommand. |

---

**Next:** Learn about the **[Configuration Options](config)**.
