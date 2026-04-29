# Agent Prime Flow

The `agent_prime` tool is the entry point for almost all non-trivial agent tasks in Synapse.

## Internal Steps
1. **Embedding**: The task description is embedded using the local model.
2. **Memory Recall**: Finds the top N semantic matches from the `memories` table.
3. **Graph Traversal**: Identifies entities mentioned in the recalled memories and expands the graph to find high-importance neighbors.
4. **Context Synthesis**: Bundles memories, entities, file status, and suggested next actions into a single compact JSON.

## Optimization Tips
- Be specific about the **feature** or **module** name in the task description.
- Use `agent_prime` early in the session to avoid "context drift".
