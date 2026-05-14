# Examples

## Exact symbol lookup

Use this when the user asks for a known identifier, import, or error string.

1. `synapse_search({ action: "code", query: "refreshAuthToken", project_path: "..." })`
2. `synapse_workspace_manage({ action: "read", path: "...", start_line: ..., end_line: ... })`
3. If needed, `synapse_symbol_query({ action: "usages", symbol: "refreshAuthToken", project_path: "..." })`

## Module discovery

Use this when the user asks where a feature lives.

1. `synapse_search({ action: "files", query: "billing", project_path: "..." })`
2. `synapse_workspace_manage({ action: "tree", project_path: ".../billing", max_depth: 2 })`
3. `synapse_workspace_manage({ action: "read", ... })`

## Concept search

Use this when the user asks how something works conceptually.

1. `synapse_system_manage({ action: "index_status" })`
2. `synapse_system_manage({ action: "embed_status" })`
3. `synapse_search({ action: "hybrid", query: "serialize token refresh requests", project_path: "..." })`
4. `synapse_workspace_manage({ action: "read", ... })`

## Memory-first debugging

Use this for non-trivial repeated work in the same repo area.

1. `synapse_agent_prime({ task: "debug auth refresh race", project_path: "..." })`
2. `synapse_search({ action: "code", query: "refreshAuthToken", project_path: "..." })`
3. `synapse_search({ action: "hybrid", query: "auth refresh race", project_path: "..." })`
4. `synapse_workspace_manage({ action: "read", ... })`
5. `synapse_memory_manage({ action: "capture_outcome", ... })`

## Review or fix outcome capture

After a meaningful fix, review finding, or durable decision:

1. `synapse_memory_manage({ action: "capture_outcome", ... })`
2. `synapse_memory_query({ action: "suggest", id: "new-memory-id", threshold: 0.7 })`
3. `synapse_memory_manage({ action: "add_relation", ... })` for strong matches

## Update-safe behavior

For npm-installed Synapse:

1. `synapse_system_manage({ action: "update_status" })`
2. Ask the user whether to update
3. If approved, `synapse_system_manage({ action: "update_self", approved_by_user: true })`

For Git or commit installs:

1. do not call `synapse_system_manage({ action: "update_self" })`
2. reinstall the pinned version
3. rerun `synapse setup`
