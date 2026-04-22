# 0.0.4-beta.4 Tools

<div className="docPanel docPanel--compact">
  <p>
    The beta tool surface adds full memory workflow and update-aware operations on top of the stable
    discovery, search, indexing, and verification flow.
  </p>
</div>

## Added in this beta line

- `synapse_task_context`
- `synapse_memory_status`
- `synapse_memory_recall`
- `synapse_memory_list`
- `synapse_memory_get`
- `synapse_memory_store`
- `synapse_memory_update`
- `synapse_memory_delete`
- `synapse_capture_outcome`
- `synapse_memory_capture_event`
- `synapse_memory_events`
- `synapse_update_status`
- `synapse_update_self`

## Core tools still present

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

## Recommended beta workflow

`synapse_server_status` -> `synapse_task_context` -> `synapse_search_files` -> `synapse_search_code` or `synapse_search_hybrid` -> `synapse_read_file` -> `synapse_capture_outcome`

