---
name: synapse-mcp
version: 0.3.0-beta.2
description: Primary MCP for local code retrieval AND persistent agent memory. Specializes in context rehydration and temporal knowledge modeling.
category: tools
tags: [memory, knowledge-graph, search, mcp, context, persistent-memory]
allowed-tools:
  - Read
  - Write
  - Execute
---

# Synapse MCP Expert

Master the art of local AI engineering with Synapse. This skill enables agents to maintain persistent intelligence across sessions, navigate vast codebases with semantic precision, and model complex relationships through a temporal knowledge graph.

## 📋 Mandatory SOP for AI Agents

To utilize Synapse effectively, follow these procedural rules:

1. **[COLD START] Task Initialization**:
   - **Rule**: ALWAYS call `synapse_agent_prime` as your very first action for any new task.
   - **Reason**: This rehydrates your project context and surfaces previous decisions/standardized rules via `teach`.

2. **[REAL-TIME] Decision Capture**:
   - **Rule**: When you find a bug root cause or choose an architectural pattern, call `synapse_capture_outcome` immediately.
   - **Reason**: Prevents loss of context if the session resets or another agent takes over.

3. **[LEARNING] Corrective Feedback**:
   - **Rule**: If the user corrects your code style or logic pattern, use `synapse_teach` to store that preference.
   - **Reason**: Ensures you don't repeat the mistake in future tasks.

4. **[COMPLETION] Task Wrap-up**:
   - **Rule**: Call `synapse_capture_outcome` with `status: "completed"` before ending the task.

---

## Core Concepts

### 1. Context Rehydration (Agent Prime)
Instead of repetitive searching, use **Agent Prime**. It performs a fused retrieval of relevant memories, knowledge graph entities, and file changes in a single call. This "rehydrates" your mental model of the project instantly.

### 2. Temporal Knowledge Graph (KG)
Facts aren't just strings; they are subject-predicate-object triples with a time dimension. Synapse tracks when facts become valid and when they are superseded, allowing you to query the state of the project "as of" a specific date.

### 3. Proactive Memory Hints
Synapse integrates with your file reads. When you `read_file`, it automatically checks for linked memories with high importance and surfaces them as hints. This prevents you from repeating past mistakes or missing documented architectural decisions.

## Code Examples

### Example 1: Full Task Initialization
The "Golden Path" for starting any non-trivial task.
```typescript
// Rehydrate context for the current task
const context = await synapse_agent_prime({
  task: "Implement OAuth2 flow for the mobile app",
  project_path: "/abs/path/to/project"
});

// context returns:
// - relevant_memories: past decisions about auth
// - kg_entities: AuthService, TokenStore, etc.
// - suggested_actions: "Update memory id: 452 (Auth architecture)"
```

### Example 2: Batching Knowledge Extraction
Extracting multiple facts from a code review session efficiently.
```typescript
await synapse_kg_add_triples_batch({
  triples: [
    { subject_name: "AuthService", predicate: "uses", object_name: "JWT" },
    { subject_name: "JWT", predicate: "expires_in", object_name: "1hour" },
    { subject_name: "TokenStore", predicate: "depends_on", object_name: "Redis" }
  ],
  response_format: "minimal"
});
```

### Example 3: Temporal Querying
Investigating a regression by checking the state of a component last week.
```typescript
const pastState = await synapse_kg_as_of({
  entity_id: "api_config",
  as_of_date: "2026-04-01T12:00:00Z"
});
```

## Best Practices

1. **Prefer `agent_prime` over `search_hybrid`**: It is significantly more token-efficient for re-establishing context.
2. **Use Batch Tools for 3+ Items**: Tools like `memory_store_batch` use a single database transaction, ensuring consistency and massive speed gains.
3. **Capture Outcomes**: Always call `capture_outcome` or `memory_store` after a major decision. Memory is the "learned behavior" of your agent.
4. **Minimal Payloads**: Pass `terse: "minimal"` when you don't need to read back what you just wrote.

## Advanced Patterns

### The "Memory-First" Workflow
1. **Recall**: Check for existing patterns using `find`.
2. **Execute**: Build the feature.
3. **Reflect**: Capture the new knowledge using `capture_outcome`.
4. **Link**: Connect the file to the memory using `file_changed`.

## Troubleshooting

### Issue: Low Search Relevance
**Solution**: Broaden your query, disable filters, or try `find({ sources: ["memory", "triple"] })` to check if the knowledge exists in the graph but not in the code.

### Issue: Knowledge Contradictions
**Solution**: Synapse warns but doesn't block. Use `kg_timeline` to see how the fact evolved and `kg_invalidate` to mark the old fact as stale.

## References

- [Synapse Documentation](https://wmt-mobile.github.io/synapse/)
- [PCL Skill Specification](https://github.com/personamanagmentlayer/pcl)
