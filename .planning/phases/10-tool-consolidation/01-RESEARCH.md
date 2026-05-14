# Research: MCP Tool Consolidation (Phase 10)

## Objective
Reduce the total number of MCP tools exposed by Synapse to minimize token overhead and cognitive load for AI agents, without sacrificing functionality or quality.

## Current Tool Inventory

### Core (`src/interfaces/mcp/tools/core.ts`)
| Tool Name | Action | Status |
|-----------|--------|--------|
| `synapse_server_status` | Get server status | Level: CORE |
| `synapse_health` | Get health summary | Level: CORE |
| `synapse_usage_guide` | Get usage guide | Level: CORE |
| `synapse_help` | Get task-scoped help | Level: CORE |
| `synapse_discovery` | Discover/Activate tools | Level: CORE |
| `synapse_update_status` | Check for updates | Level: ADVANCED |
| `synapse_update_self` | Perform update | Level: ADVANCED |

### Memory Management (`src/interfaces/mcp/tools/memory-store.ts`)
| Tool Name | Action | Status |
|-----------|--------|--------|
| `synapse_memory_list` | List entries | Granular |
| `synapse_memory_get` | Fetch entry | Granular |
| `synapse_memory_store` | Save entry | Granular |
| `synapse_memory_update` | Update entry | Granular |
| `synapse_memory_delete` | Delete entry | Granular |
| `synapse_memory_delete_batch` | Bulk delete | Granular |
| `synapse_memory_capture_event` | Capture event | Granular |
| `synapse_memory_events` | List events | Granular |
| `synapse_memory_suggest_relations` | Suggest links | Granular |
| `synapse_memory_add_relation` | Link entries | Granular |
| `synapse_memory_remove_relation` | Unlink entries | Granular |
| `synapse_memory_related` | Get related entries | Granular |
| `synapse_memory_store_batch` | Bulk store | Granular |

### Memory Workflow (`src/interfaces/mcp/tools/memory-workflow.ts`)
| Tool Name | Action | Status |
|-----------|--------|--------|
| `synapse_memory_status` | Get memory system status | Granular |
| `synapse_memory_recall` | Task-specific recall | Granular |
| `synapse_memory_store` (Duplicate?) | Wait, let me check | - |
| `synapse_capture_outcome` | Capture task outcome | Granular |
| `synapse_task_context` | Rehydrate task context | Granular |
| `synapse_agent_prime` | Initial rehydration | Level: CORE |
| `synapse_whats_new` | Cross-session delta | Granular |
| `synapse_teach` | Durable behavior rule | Granular |

### Knowledge Graph (`src/interfaces/mcp/tools/graph-tools.ts`)
| Tool Name | Action | Status |
|-----------|--------|--------|
| `synapse_kg_manage` | Mutation controller | **Consolidated** |
| `synapse_kg_query` | Query controller | **Consolidated** |

### Search & Intelligence (`src/interfaces/mcp/tools/retrieval.ts`)
| Tool Name | Action | Status |
|-----------|--------|--------|
| `synapse_index_status` | Get index status | Granular |
| `synapse_embed_status` | Get embedding status | Granular |
| `synapse_index_project` | Trigger indexing | Granular |
| `synapse_search_files` | File path search | Granular |
| `synapse_search_code` | Text/Regex search | Granular |
| `synapse_search_hybrid` | Semantic retrieval | Granular |
| `synapse_get_symbol` | Symbol definitions | Granular |
| `synapse_find_usages` | Call sites/imports | Granular |

### Symbol Intelligence (`src/interfaces/mcp/tools/symbol-tools.ts`)
| Tool Name | Action | Status |
|-----------|--------|--------|
| `synapse_find_callers` | Function callers | Granular |
| `synapse_find_definition` | Symbol declaration | Granular |
| `synapse_find_implementations` | Trait/Interface impls | Granular |
| `synapse_rename_preview` | Refactor impact | Granular |

### Workspace (`src/interfaces/mcp/tools/retrieval-workspace.ts`)
| Tool Name | Action | Status |
|-----------|--------|--------|
| `synapse_list_roots` | List roots | Granular |
| `synapse_list_projects` | List projects | Granular |
| `synapse_project_tree` | Get file tree | Granular |
| `synapse_read_file` | Read file chunk | Granular |
| `synapse_file_changed` | Notify file edit | Granular |
| `synapse_summarize_project` | Project summary | Granular |

### Other Tools
- `synapse_audit` (`audit-tools.ts`)
- `synapse_project_backfill` (`backfill-tools.ts`)
- `synapse_backup` / `synapse_restore` (`backup-tools.ts`)
- `synapse_find` (`find-tools.ts`)

## Proposed Consolidation Clusters

### 1. `synapse_memory_manage` (Mutations)
- `store` (from `memory_store`)
- `update` (from `memory_update`)
- `delete` (merges `delete` + `delete_batch`)
- `capture_event` (from `memory_capture_event`)
- `add_relation` / `remove_relation`
- `store_batch`
- `teach` (from `memory-workflow`)
- `capture_outcome` (from `memory-workflow`)

### 2. `synapse_memory_query` (Reads)
- `list` (from `memory_list`)
- `get` (from `memory_get`)
- `events` (from `memory_events`)
- `suggest` (from `memory_suggest_relations`)
- `related` (from `memory_related`)
- `status` (from `memory_status`)
- `recall` (from `memory_recall`)
- `task_context` (from `memory_context`)
- `whats_new`

### 3. `synapse_search` (Code Discovery)
- `files` (from `search_files`)
- `code` (from `search_code`)
- `hybrid` (from `search_hybrid`)
- `find` (cross-source search)

### 4. `synapse_symbol_query` (Static Analysis)
- `callers`
- `definition`
- `implementations`
- `usages`
- `get`
- `rename_preview`

### 5. `synapse_workspace_manage` (File Ops & Metadata)
- `list_roots`
- `list_projects`
- `tree`
- `read`
- `file_changed`
- `summarize`
- `backfill`

### 6. `synapse_system_manage` (Admin/Lifecycle)
- `index_status`
- `embed_status`
- `index_project`
- `audit`
- `backup`
- `restore`
- `update_status`
- `update_self`

## Strategy for Non-Breaking UX (Aliasing)
While this is a breaking change for the protocol, we can ensure the LLM still "sees" the same capabilities by:
1. Updating `synapse_discovery` and `synapse_help` to guide the LLM to the new Power Controllers.
2. Maintaining the same parameter names inside the `action` objects.
3. Providing clear error messages if a legacy tool is called (if possible, though the MCP server will just reject it).

## Quality Preservation
- Every action will have its own strictly typed Zod schema within the `discriminatedUnion`.
- No loss of validation or documentation (descriptions will be preserved in schema properties).
- Standardized response formats across all actions.
