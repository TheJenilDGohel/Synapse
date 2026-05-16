---
title: Using AI Memory
description: How to effectively use Synapse's persistent memory to build long-term AI context.
---

# Using AI Memory

Synapse's **Persistent Memory** pillar allows your AI agent to learn from every interaction. This guide covers how to teach your agent, manage memories, and ensure high-quality recall.

## Teaching Your Agent

The most powerful way to use memory is through the `teach` tool. Use this to record project-specific conventions, coding styles, or "gotchas" that the agent should always remember.

### Example: Setting a Coding Standard
> *"In this project, always use functional components and Tailwind for styling. Record this rule."*

The agent will call `teach` with this instruction. In future sessions, when the agent is "primed" (using `agent_prime`), this rule will be surfaced automatically as a high-priority "Lesson Learned."

## Capturing Lessons Learned

During a task, an agent might discover something important—like a tricky bug or an undocumented dependency. Use the `memory_store` tool to capture these insights.

### Example: Documenting a Fix
> *"The database connection fails if the `DB_TIMEOUT` is less than 5000ms. Remember this for future debugging."*

By storing this, you ensure that if the same issue arises again, the agent will have the solution ready in its context.

## Organizing with Nests

If you work on multiple unrelated projects or domains, use **Nests** to isolate context.

- **`memory_list(nest_id="frontend")`**: Only see frontend-related memories.
- **`memory_store(nest_id="security")`**: Keep security audits in a dedicated space.

## Managing Memory Health

To keep your memory context high-signal, follow these practices:

1. **Semantic Deduplication**: Synapse automatically checks for duplicates when you call `memory_store`. If a similar fact exists, it will suggest updating the existing one instead of creating a new one.
2. **Reviewing Stale Memories**: Use `memory_list(status="stale")` to find memories that might be outdated. Use `memory_update` or `memory_delete` to keep the store clean.
3. **Linking to Code**: Use `memory_add_relation` to link a memory to a specific file or symbol. This ensures that the memory is retrieved whenever that part of the code is being worked on.

## Pro-Tip: The "Winner" State
At the end of a successful task, always ask your agent to **Capture the Outcome**.
> *"Task complete. Capture the outcome and any new lessons learned into memory."*

The agent will use `capture_outcome` to store a summary of what was done, what worked, and what didn't. This "Winner" state becomes the baseline for the next agent that touches this part of the codebase.

---

**Next:** Learn how structured facts are managed in the **[Knowledge Graph](kg)**.
