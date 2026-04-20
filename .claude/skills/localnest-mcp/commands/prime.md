---
name: localnest:prime
description: Get full task context — memories, entities, files, changes, and actions in one call
argument-hint: "<task description>"
allowed-tools:
  - mcp__localnest__localnest_agent_prime
---

<objective>
Call agent_prime to get everything needed to start a task: recalled memories, matched KG entities, relevant files, recent changes, and suggested next actions.
</objective>

<process>
1. If $ARGUMENTS is provided, use it as the task description.
2. If no arguments, infer the task from conversation context.
3. Call `localnest_agent_prime({ task: $ARGUMENTS })`.
4. Present the unified context: memories, entities, relevant files, recent changes, and suggested actions.
</process>
