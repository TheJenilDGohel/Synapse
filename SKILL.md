# Brain Skill: Synapse Persistent Memory & Context (v2026.5.0)

## Description
This skill enables agents to leverage Synapse's local cognitive engine for long-term memory, knowledge graph reasoning, and rapid task context rehydration.

## Usage Guide

### 1. Conceptualize Memories (Knowledge Graph)
When discovering facts or relationships, store them as entities and triples rather than flat text.
- Use `synapse_kg_manage({ action: "add_entity" })` for nouns/concepts.
- Use `synapse_kg_manage({ action: "add_triple" })` for relationships (Subject -> Predicate -> Object).
- Prefer existing predicates: `depends_on`, `implements`, `part_of`, `assigned_to`, `status_is`.

### 2. Task Context Rehydration
Before starting a new task or resuming after a context reset:
- ALWAYS call `synapse_agent_prime` with your current `task` summary.
- Synapse will return relevant past outcomes, code snippets, and related knowledge graph nodes in a single call.

### 3. Capture Outcomes
When a task is finished:
- Call `synapse_memory_manage({ action: "capture_outcome" })` to record completion.
- Include the final status and a terse summary of "What happened" and "What changed".
- This ensures the next agent starting the same project has immediate context.

## Best Practices
- **Terse Summaries**: Avoid fluff. Be technical and precise.
- **Entity Identity**: Use consistent names for entities (e.g., "auth-service" instead of "authentication layer").
- **Controller Pattern**: Use the `action` parameter with the high-density Power Controllers (`synapse_search`, `synapse_memory_manage`, etc.) for maximum efficiency.
