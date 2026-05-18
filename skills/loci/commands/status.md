---
name: loci:status
description: Check Loci server health, memory, and KG status
allowed-tools:
  - Read
  - Bash
  - mcp__loci__synapse_server_status
  - mcp__loci__synapse_memory_status
  - mcp__loci__synapse_kg_stats
  - mcp__loci__synapse_hooks_stats
---

<objective>
Show a comprehensive status of the Loci MCP server.
</objective>

<process>
1. Call `synapse_server_status` for runtime info.
2. Call `synapse_memory_status` for memory backend status.
3. Call `synapse_kg_stats` for knowledge graph statistics.
4. Call `synapse_hooks_stats` for hook system status.
5. Present a clear summary:
   - Server version and health
   - Memory: enabled/disabled, backend, entry count
   - Knowledge Graph: entity count, triple count
   - Hooks: registered listener count
   - Index: backend type, freshness
</process>
