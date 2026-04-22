# 0.0.2-beta.2 Tools

<div className="docPanel docPanel--compact">
  <p>
    This beta is the first version where the tool surface becomes significantly easier to automate
    against, even though compatibility aliases are still exposed.
  </p>
</div>

## Key tool contract changes

- canonical `synapse_*` names added
- legacy aliases still available for compatibility
- `response_format` accepted across tools
- pagination metadata added for list tools

This is the release where the external MCP tool contract becomes much easier to automate against.

## Typical exposed surface

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

Plus compatibility aliases for earlier short names.
