---
name: loci:context
description: Get full task context — runtime status + recalled memories in one call
allowed-tools:
  - Read
  - Bash
  - mcp__loci__synapse_task_context
---

<objective>
Bundle runtime status, memory state, and relevant recall for the current task in a single call.
</objective>

<process>
1. If $ARGUMENTS is provided, use it as the task/query context.
2. If no arguments, infer from the current conversation.
3. Call `synapse_task_context` with the query and any known project path.
4. Present the bundled result: server status, recalled memories, and any relevant context.
5. Use this information to inform the current task.
</process>
