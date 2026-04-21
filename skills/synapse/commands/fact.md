---
name: synapse:fact
description: Add a structured fact to the knowledge graph
argument-hint: "<subject> <predicate> <object>"
allowed-tools:
  - Read
  - Bash
  - mcp__synapse__synapse_kg_add_triple
---

<objective>
Add a subject-predicate-object triple to Synapse's temporal knowledge graph.
</objective>

<process>
1. Parse $ARGUMENTS for subject, predicate, and object.
   - Expected format: "Alice works_on ProjectX" or "auth-service uses JWT"
   - If fewer than 3 parts, ask the user to provide subject, predicate, and object.
2. Call `synapse_kg_add_triple` with the parsed subject, predicate, and object.
3. Check the response for contradiction warnings — if found, inform the user.
4. Report the created triple ID and any detected contradictions.
</process>
