# 0.0.4-beta.6 Tools

<div className="docPanel docPanel--compact">
  <p>
    Beta.6 keeps the broad retrieval and memory tool surface from beta.5 and adds richer server
    health and release-validation guidance around the same top-level CLI flow.
  </p>
</div>

## Core tools present in this beta

- `synapse_usage_guide`
- `synapse_server_status`
- `synapse_health`
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

## Memory and update tools present in this beta

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

## Recommended beta.6 workflow

`synapse_server_status` -> `synapse_task_context` -> `synapse_search_files` -> `synapse_search_code` or `synapse_search_hybrid` -> `synapse_read_file` -> `synapse_capture_outcome`
