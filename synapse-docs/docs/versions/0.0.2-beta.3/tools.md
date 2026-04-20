# 0.0.2-beta.3 Tools

<div className="docPanel docPanel--compact">
  <p>
    This beta kept the same overall tool line while materially improving how search and indexing
    results were exposed to agents.
  </p>
</div>

This release keeps the canonical `synapse_*` tool line and improves search behavior.

## Tool surface

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
- `synapse_read_file`
- `synapse_summarize_project`

## Important tool improvements

- `synapse_search_code` supports `use_regex`
- `synapse_search_code` supports `context_lines`
- `synapse_index_project` reports `failed_files`
- `synapse_search_hybrid` exposes `semantic_score_raw`
- `synapse_server_status` surfaces ripgrep availability instead of startup failure
