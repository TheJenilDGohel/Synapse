---
name: loci:search
description: Search codebase and memory via Loci
argument-hint: "<query>"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - mcp__loci__synapse_search_files
  - mcp__loci__synapse_search_code
  - mcp__loci__synapse_memory_recall
  - mcp__loci__synapse_kg_query
---

<objective>
Search across code and memory using Loci's hybrid retrieval.
</objective>

<process>
1. Use $ARGUMENTS as the search query.
2. First, call `synapse_search_files` to find files matching the query.
3. If results are sparse, call `synapse_search_code` with the query for exact symbol matching.
4. If memory is enabled, also call `synapse_memory_recall` to surface relevant memories.
5. If knowledge graph has related entities, call `synapse_kg_query` for structured facts.
6. Present results grouped by source (code files, memories, KG facts).
</process>
