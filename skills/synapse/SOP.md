# Synapse MCP Standard Operating Procedure (SOP)

This document contains mandatory procedural rules for AI Agents. If you are an AI, you MUST follow these steps to ensure session continuity and knowledge integrity.

## 1. Task Lifecycle Rules

### [PHASE: INITIALIZATION]
- **Rule**: ALWAYS call `synapse_agent_prime` at the very start of a task.
- **Goal**: Rehydrate project context, recall past decisions, and identify known constraints.
- **Fail-safe**: If `agent_prime` returns 0 memories, run `synapse_summarize_project` to build a mental map.

### [PHASE: EXECUTION]
- **Rule**: When you make a design choice, choose a library, or fix a tricky bug, call `synapse_capture_outcome`.
- **Goal**: Log the "Reasoning" behind the code changes into the project's permanent memory.

### [PHASE: COMPLETION]
- **Rule**: Close the loop by calling `synapse_capture_outcome` with `status: "completed"`.
- **Goal**: Mark the task as done for future `whats_new` queries and long-term history.

## 2. Corrective Learning (Teach)

- **Rule**: If the user says "Don't do X" or "I prefer Y", call `synapse_teach` with that instruction immediately.
- **Goal**: Prevent the user from having to repeat themselves in future sessions.

## 3. Tool Selection Guide

| Need | Preferred Tool | Why |
|---|---|---|
| Start a task | `agent_prime` | Fused context (Fast/Cheap) |
| Find known symbol | `get_symbol` | Instant regex match |
| Explore code logic | `search_hybrid` | Semantic understanding |
| Check cross-session | `whats_new` | See what changed while you were away |
| Report mission success | `capture_outcome` | Persistent history |

## 4. Error Recovery

- If a search fails: Broaden the query and check `synapse_index_status`. If the index is stale (>50 files), run `synapse_index_project`.
- If memory recall is irrelevant: Try different keywords or check the `nest/branch` filters.
