---
name: synapse-runtime
version: 2026.5.0
description: Expert system for Synapse runtime architecture, installation orchestration, and diagnostic systems.
category: tools
tags: [lifecycle, installation, diagnostics, configuration, startup-performance]
allowed-tools:
  - Read
  - Write
---

# MCP Runtime Expert

Master the installation and initialization lifecycle of Synapse. This skill covers the critical glue between the codebase, the user's OS, and the diverse set of AI agents (Cursor, Claude Code, Cline, Windsurf, etc.) that depend on Synapse.

## Core Concepts

### 1. The PCL Skill System
Synapse treats "Skill Installation" as a primary runtime event. The runtime expert uses `install-synapse-skill.mjs` to synchronize instructions across 10+ different AI tool families, generating client-native files (like `.mdc` for Cursor or `AGENTS.md` for OpenCode) to ensure seamless tool discovery.

### 2. Diagnostic Integrity (Health/Status)
The `synapse_health` and `synapse_server_status` tools are the source of truth for runtime health. They validate Node.js versions, verify database connectivity, audit knowledge graph density, and check if the semantic index is current.

### 3. Graceful Startup
Synapse implements a "lazy-start" architecture. Heavy modules (like semantic retrievers or indexers) are only imported when their specific tools (e.g., `synapse_search({ action: "hybrid" })`) are called. This keeps the MCP server's initial heartbeat fast enough to satisfy strict agent timeout requirements.

## Code Examples

### Example 1: Robust Tool Feature Detection
Standardizing how tools report their capability/health to the runtime.
```javascript
export async function getRuntimeStatus() {
  const nodeVersion = process.versions.node;
  const isV4 = parseInt(nodeVersion.split('.')[0]) >= 22;
  
  return {
    version: pkg.version,
    memorySupported: isV4,
    databasePath: resolveDbPath(),
    activeBackend: isV4 ? 'node:sqlite' : 'none'
  };
}
```

### Example 2: Idempotent Setup Logic
Ensuring `synapse setup` can be run multiple times safely.
```javascript
async function ensureConfigDir(path) {
  if (!fs.existsSync(path)) {
    await fs.promises.mkdir(path, { recursive: true });
    // Seed default config only on first run
    await seedDefaultConfig(path);
  }
}
```

## Best Practices

1. **Test the Published CLI**: Always verify changes by running the compiled/linked CLI (`synapse`) rather than just the raw source scripts.
2. **Zero-Lock Startup**: Ensure that checking the server status or running `synapse_health` never acquires a database lock that could block a long-running indexing process.
3. **Environment Variable Precedence**: System configuration should follow a clear hierarchy: CLI Flags > Environment Variables > Config File > Defaults.
4. **Tool-Family Awareness**: When generating instruction files, always respect the specific formatting and file-naming conventions of the target AI client.

## Troubleshooting

### Issue: MCP Server Times Out (Agent Error)
**Solution**: Audit top-level imports. If a module takes >500ms to load, move it inside the tool execution handler with an `async import()`.

### Issue: Skills Not Updating in Client
**Solution**: Check the `install-synapse-skill.mjs` logs for target directory resolution errors. Verify that the client is not using a cached version of the instruction files.

## References

- [PCL Skill Specification](https://github.com/pcl-org/pcl)
- [Synapse Runtime Hooks](./references/hooks.md)
