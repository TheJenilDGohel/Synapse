# Indexing

<div className="docPanel docPanel--compact">
  <p>
    Indexing is what makes semantic and hybrid retrieval useful. Prefer indexing a specific project
    instead of all roots unless you actually need cross-project retrieval.
  </p>
</div>

## `synapse_index_status`

Returns whether semantic index data exists and which backend is active.

When using the JSON backend on larger indexes, this response includes:

- `upgrade_recommended: true`
- `upgrade_reason`

If shown, migrate to `sqlite-vec` (Node 22.13+) for better scale and latency.

## `synapse_index_project`

Builds or refreshes semantic index data.

Important parameters:

- `project_path`
- `all_roots`
- `force`
- `max_files`

## Backends

<div className="docGrid docGrid--2">
  <div className="docPanel">
    <h3>`sqlite-vec`</h3>
    <p>Preferred for larger repositories and stronger persistent indexing behavior.</p>
  </div>
  <div className="docPanel">
    <h3>`json`</h3>
    <p>Fallback backend for older or incompatible runtimes where `sqlite-vec` is unavailable.</p>
  </div>
</div>

## Recommended flow

<div className="docSteps">
  <div className="docStep">
    <span>1</span>
    <div>
      <strong>Inspect index state</strong>
      <p>Use `synapse_index_status` to see whether the semantic index already exists and whether it is stale.</p>
    </div>
  </div>
  <div className="docStep">
    <span>2</span>
    <div>
      <strong>Index the smallest useful scope</strong>
      <p>Prefer `project_path` over `all_roots` for faster rebuilds and more focused retrieval.</p>
    </div>
  </div>
  <div className="docStep">
    <span>3</span>
    <div>
      <strong>Use hybrid search after indexing</strong>
      <p>Run `synapse_search_hybrid` once index data is ready and verify results with file reads.</p>
    </div>
  </div>
</div>
