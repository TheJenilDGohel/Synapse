# Synapse Agent Skill

Operational guidance for AI agents interacting with a Synapse-equipped workspace.

## Context Injection Workflow
1. **Prime**: Always call `synapse_agent_prime` at the start of a task to rehydrate context.
2. **Recall**: Use `synapse_memory_query` with `item_format: 'compact'` to find relevant history.
3. **Search**: Use `synapse_search` for initial discovery, then `synapse_symbol_query` for precise mapping.

## Operational Rules
- **Respect Nests**: Use the current task, branch, or feature name as the `nest` when storing memories.
- **Efficiency**: Use `lite` or `compact` formats for large queries to minimize token tax.
- **Verification**: Call `synapse_memory_manage` (event_type: 'task') after completing a major sub-task.
- **Outcome**: Use `synapse_memory_manage` (event_type: 'task', status: 'completed') to persist final winners.

## Tool Preferences
- Prefer `synapse_search` (hybrid) for conceptual queries.
- Use `synapse_symbol_query` when you have an exact symbol name.
- Use `synapse_workspace_manage` for reading files with `mode: 'signatures'` when only structure is needed.
