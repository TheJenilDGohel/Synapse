---
name: localnest:teach
description: Teach your AI a durable behavior rule that persists across sessions
argument-hint: "<instruction>"
allowed-tools:
  - mcp__localnest__localnest_teach
  - mcp__localnest__localnest_memory_list
---

<objective>
Store a durable behavior modifier via localnest_teach. The instruction surfaces automatically in future sessions through agent_prime recall.
</objective>

<process>
1. If $ARGUMENTS is provided, use it as the instruction.
2. If no arguments, ask: "What behavior rule should your AI remember?"
3. Call `localnest_teach({ instruction: $ARGUMENTS })` to store the feedback memory.
4. Confirm the teach memory was stored with its ID.
</process>
