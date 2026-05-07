# Brain Skill: Synapse Persistent Memory & Context

## Description
This skill enables agents to leverage Synapse's local cognitive engine for long-term memory, knowledge graph reasoning, and rapid task context rehydration.

## Usage Guide

### 1. Conceptualize Memories (Knowledge Graph)
When discovering facts or relationships, store them as entities and triples rather than flat text.
- Use `synapse_kg_add_entity` for nouns/concepts.
- Use `synapse_kg_add_triple` for relationships (Subject -> Predicate -> Object).
- Prefer existing predicates: `depends_on`, `implements`, `part_of`, `assigned_to`, `status_is`.

### 2. Task Context Rehydration
Before starting a new task or resuming after a context reset:
- Call `synapse_agent_prime` or `synapse_task_context` with your current `task` summary.
- The Brain will return relevant past outcomes, code snippets, and related knowledge graph nodes.

### 3. Capture Outcomes
When a task is finished:
- Call `synapse_capture_outcome` (or `synapse_memory_capture_event` for background events).
- Include the final status and a terse summary of "What happened" and "What changed".
- This ensures the next agent starting the same project has immediate context.

## Best Practices
- **Terse Summaries**: Avoid fluff. Be technical and precise.
- **Entity Identity**: Use consistent names for entities (e.g., "auth-service" instead of "authentication layer").
- **Transactional Links**: When storing a memory, link it to the relevant code files using the `project_path` or `roots` fields.
