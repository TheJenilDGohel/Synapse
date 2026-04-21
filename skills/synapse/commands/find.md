---
name: synapse:find
description: Fused search across memory, code, and KG in one call
argument-hint: "<query>"
allowed-tools:
  - mcp__synapse__synapse_find
---

<objective>
Run a fused cross-domain search via synapse_find. Returns ranked results from memory, code, and knowledge graph sources.
</objective>

<process>
1. If $ARGUMENTS is provided, use it as the query.
2. If no arguments, ask: "What are you looking for?"
3. Call `synapse_find({ query: $ARGUMENTS })` to search across all sources.
4. Present results grouped by source (memory, code, KG) with scores.
</process>
