# Synapse MCP Standard Operating Procedure (SOP)

This document contains mandatory procedural rules for AI Agents. If you are an AI, you MUST follow these steps to ensure session continuity and knowledge integrity.

## 1. Task Lifecycle Rules

### [PHASE: INITIALIZATION]
- **Rule**: ALWAYS call `synapse_agent_prime` at the very start of a task.
- **Goal**: Rehydrate project context, recall past decisions, and identify known constraints.
- **Fail-safe**: If `agent_prime` returns 0 memories, run `synapse_workspace_manage({ action: "summarize" })` to build a mental map.

### [PHASE: EXECUTION]
- **Rule**: When you make a design choice, choose a library, or fix a tricky bug, call `synapse_memory_manage({ action: "capture_outcome" })`.
- **Goal**: Log the "Reasoning" behind the code changes into the project's permanent memory.

### [PHASE: COMPLETION]
- **Rule**: Close the loop by calling `synapse_memory_manage({ action: "capture_outcome", status: "completed" })`.
- **Goal**: Mark the task as done for future `whats_new` queries and long-term history.

## 2. Corrective Learning (Teach)

- **Rule**: If the user says "Don't do X" or "I prefer Y", call `synapse_memory_manage({ action: "teach" })` with that instruction immediately.
- **Goal**: Prevent the user from having to repeat themselves in future sessions.

## 3. Tool Selection Guide

| Need | Preferred Tool | Why |
|---|---|---|
| Start a task | `synapse_agent_prime` | Fused context (Fast/Cheap) |
| Find known symbol | `synapse_symbol_query({ action: "get" })` | Instant regex match |
| Explore code logic | `synapse_search({ action: "hybrid" })` | Semantic understanding |
| Check cross-session | `synapse_memory_query({ action: "whats_new" })` | See what changed while you were away |
| Report mission success | `synapse_memory_manage({ action: "capture_outcome" })` | Persistent history |

## 4. Error Recovery

- If a search fails: Broaden the query and check `synapse_system_manage({ action: "index_status" })`. If the index is stale (>50 files), run `synapse_system_manage({ action: "index_project" })`.
- If memory recall is irrelevant: Try different keywords or check the `nest/branch` filters.
