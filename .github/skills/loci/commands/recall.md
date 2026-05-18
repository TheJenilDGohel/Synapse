---
name: loci:recall
description: Recall relevant memories for the current task or query
argument-hint: "[query]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - mcp__loci__synapse_memory_recall
  - mcp__loci__synapse_memory_status
  - mcp__loci__synapse_kg_query
---

<objective>
Recall relevant memories from Loci for the current task context.
</objective>

<process>
1. If $ARGUMENTS is provided, use it as the query.
2. If no arguments, infer the query from the current conversation context (what files are open, what task is being discussed).
3. Call `synapse_memory_recall` with the query to retrieve relevant memories.
4. If memory is not enabled, call `synapse_memory_status` to check and inform the user.
5. Present recalled memories in a clear format showing title, summary, and relevance.
6. If knowledge graph triples exist for related entities, call `synapse_kg_query` to surface structured facts.
</process>
