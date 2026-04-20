# 0.0.3 Tools

<div className="docPanel docPanel--compact">
  <p>
    `0.0.3` exposes the stable canonical tool surface. This page is useful when you need the exact
    released tool contract without unreleased update tooling from `main`.
  </p>
</div>

## Exposed tools

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

## Recommended workflow

```text
synapse_server_status
→ synapse_list_roots
→ synapse_list_projects
→ synapse_index_status
→ synapse_index_project
→ synapse_search_files
→ synapse_search_hybrid
→ synapse_read_file
```

## Key behavior

- `response_format` supports `json` and `markdown`
- list-style tools return pagination metadata
- `synapse_search_code` supports `use_regex` and `context_lines`
- `synapse_search_hybrid` supports semantic filtering and auto-indexing
- `synapse_search_files` is the recommended first step for module discovery
