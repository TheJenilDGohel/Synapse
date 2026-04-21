---
phase: 14
plan: 1
subsystem: cli/mcp
tags: [cli, mcp, lifecycle, stdio]
dependency_graph:
  requires: [runtime/config, runtime/home-layout, runtime/version, app/mcp-server]
  provides: [cli/mcp-start, cli/mcp-status, cli/mcp-config]
  affects: []
tech_stack:
  added: []
  patterns: [parseFlags, writeJson/writeError, handler-map routing]
key_files:
  modified: [src/cli/commands/mcp.js]
decisions:
  - "Direct import of mcp-server.js main() instead of child_process.fork for mcp start -- keeps stdio passthrough clean"
  - "mcp status reads runtime config and checks file existence rather than connecting to a running server -- CLI is stateless"
  - "mcp config reads saved snippet from ~/.synapse/config/mcp.synapse.json when available, generates generic config otherwise"
  - "Added --client claude flag to output Claude Code specific instructions (claude mcp add command)"
  - "Added --raw flag to skip saved snippet and output a generic npx-based config"
metrics:
  duration: 2m5s
  completed: "2026-04-08T09:02:23Z"
  tasks: 1
  files: 1
requirements: [MCP-01, MCP-02, MCP-03]
---

# Phase 14 Plan 1: MCP Lifecycle CLI Summary

Replaced the Phase 14 stub in src/cli/commands/mcp.js with three working subcommands: start (launches MCP server in stdio mode via direct import), status (builds runtime config and reports server health, index backend, memory state, embedding provider), and config (outputs ready-to-paste JSON for AI client MCP configuration).

## What Was Done

### Task 1: Implement mcp start, status, and config subcommands

**mcp start** -- Resolves the mcp-server.js entry point relative to the CLI command file, dynamically imports it, and calls main(). The process stays alive as the MCP transport holds stdio open. Supports --json for structured output before handoff.

**mcp status** -- Calls buildRuntimeConfig() and buildSynapsePaths() to gather all server settings. Reports: server name/version/mode, config file path and existence, snippet file status, index backend and DB existence, memory enabled/backend/DB, embedding provider/model/cache, and ripgrep availability. Supports --json for full structured output.

**mcp config** -- First checks for a saved snippet at ~/.synapse/config/mcp.synapse.json (created by setup). If found, outputs it directly. If not (or --raw is passed), generates a generic npx-based mcpServers JSON block. The --client claude flag outputs the `claude mcp add` command instead. Supports --json for all paths.

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 677632f | feat(14-1): implement MCP lifecycle CLI (start, status, config) |

## Self-Check: PASSED
