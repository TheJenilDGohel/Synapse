# main Tools

<div className="docPanel docPanel--compact">
  <p>
    The `main` tool surface extends stable Synapse with update-aware operations while keeping the
    same discovery, search, indexing, and verification flow.
  </p>
</div>

## Additional tools on main

- `synapse_update_status`
- `synapse_update_self`

## Existing tools still present

- `synapse_usage_guide`
- `synapse_server_status`
- `synapse_list_roots`
- `synapse_list_projects`
- `synapse_project_tree`
- `synapse_index_status`
- `synapse_index_project`
- `synapse_search_files`
- `synapse_search_code`
- `synapse_search_hybrid`
- `synapse_get_symbol`
- `synapse_find_usages`
- `synapse_read_file`
- `synapse_summarize_project`

## Key behavior

- `synapse_server_status` includes `updates`
- `synapse_update_self` requires explicit user approval
- `synapse_usage_guide` pushes `search_files` first for module discovery
- `synapse_search_hybrid` is positioned as the main concept-retrieval tool
- `synapse_index_status` can return `upgrade_recommended` for large JSON indexes
