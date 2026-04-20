# Examples

## Exact symbol lookup

Use this when the user asks for a known identifier, import, or error string.

1. `synapse_search_code(query="refreshAuthToken", project_path="...")`
2. `synapse_read_file(path="...", start_line=..., end_line=...)`
3. If needed, `synapse_find_usages(symbol="refreshAuthToken", project_path="...")`

## Module discovery

Use this when the user asks where a feature lives.

1. `synapse_search_files(query="billing", project_path="...")`
2. `synapse_project_tree(project_path=".../billing", max_depth=2)`
3. `synapse_read_file(...)`

## Concept search

Use this when the user asks how something works conceptually.

1. `synapse_index_status`
2. `synapse_embed_status`
3. `synapse_search_hybrid(query="serialize token refresh requests", project_path="...")`
4. `synapse_read_file(...)`

## Memory-first debugging

Use this for non-trivial repeated work in the same repo area.

1. `synapse_task_context(task="debug auth refresh race", project_path="...")`
2. `synapse_search_code(query="refreshAuthToken", project_path="...")`
3. `synapse_search_hybrid(query="auth refresh race", project_path="...")`
4. `synapse_read_file(...)`
5. `synapse_capture_outcome(...)`

## Review or fix outcome capture

After a meaningful fix, review finding, or durable decision:

1. `synapse_capture_outcome(...)`
2. `synapse_memory_suggest_relations(id="new-memory-id", threshold=0.7)`
3. `synapse_memory_add_relation(...)` for strong matches

## Update-safe behavior

For npm-installed Synapse:

1. `synapse_update_status`
2. Ask the user whether to update
3. If approved, `synapse_update_self(approved_by_user=true)`

For Git or commit installs:

1. do not call `synapse_update_self`
2. reinstall the pinned version
3. rerun `synapse setup`
