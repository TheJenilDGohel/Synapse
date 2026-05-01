---
title: Custom Skills
description: Extending Synapse with domain-specific knowledge.
---

Synapse is designed to be extensible. You can teach agents new behaviors and domain knowledge using **Skills**.

## What is a Skill?
A skill is a durable collection of instructions and best practices stored in Synapse memory. When an agent is "primed" with a skill, it gains specialized knowledge without needing it in its base prompt.

## usage Guide

### 1. Defining a Skill
Store a high-importance memory entry with kind `feedback` (or use the `teach` tool).
- **Rule-based**: "Always use functional components in React."
- **Task-based**: "To deploy to production, run script X then Y."

### 2. Context Rehydration
Before starting a task, agents should call `agent_prime` or `task_context`. Synapse will surface:
- Relevant past outcomes.
- Applicable skills/rules.
- Related Knowledge Graph nodes.

### 3. Continuous Improvement
When a task finishes, use `capture_outcome` to record lessons learned. This information is automatically fed back into the agent's context during similar future tasks.

## Best Practices
- **Be Technical**: Use precise terms and code examples.
- **Deduplicate**: Synapse will automatically flag similar rules to prevent context bloat.
- **Link to Code**: Associate skills with relevant directories or files using the `scope` parameter.
