---
name: synapse:ingest
description: Ingest a conversation file into memory and knowledge graph
argument-hint: "<file-path>"
allowed-tools:
  - Read
  - Bash
  - mcp__synapse__synapse_ingest_markdown
  - mcp__synapse__synapse_ingest_json
---

<objective>
Import a conversation export into Synapse's memory system with automatic entity extraction and KG triple creation.
</objective>

<process>
1. Parse $ARGUMENTS for the file path.
2. Read the file content using the Read tool.
3. Detect format from extension (.md/.markdown → markdown, .json → json).
4. Call `synapse_ingest_markdown` or `synapse_ingest_json` with the file content.
5. Report results: turns parsed, entries created, entities extracted, triples created, duplicates skipped.
</process>
