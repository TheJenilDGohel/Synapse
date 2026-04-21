---
name: synapse:status
description: Check Synapse server health, memory, and KG status
allowed-tools:
  - Read
  - Bash
  - mcp__synapse__synapse_server_status
  - mcp__synapse__synapse_memory_status
  - mcp__synapse__synapse_kg_stats
  - mcp__synapse__synapse_hooks_stats
---

<objective>
Show a comprehensive status of the Synapse MCP server.
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
