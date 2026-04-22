# Memory

<div className="docPanel docPanel--compact">
  <p>
    Memory lets the agent retain context across sessions. Use the workflow tools to recall prior
    context before starting work, then capture meaningful outcomes when the task is done.
  </p>
</div>

## Workflow tools

These three tools form the core memory loop: load context, do work, save results.

### `synapse_task_context`

Returns relevant memories for the current task based on the active project, recent history, and any prior outcomes.

Call this at the start of every session before analysis or code changes.

<div className="docPanel">
  <h3>Use when</h3>
  <p>Beginning a new task or resuming a previous session. This is the recommended first memory call.</p>
</div>

### `synapse_capture_outcome`

Persists a meaningful result (fix applied, decision made, preference discovered) so future sessions can recall it.

Useful parameters:

- `outcome` — free-text description of what happened
- `tags` — categorization labels for retrieval
- `nest` / `branch` — optional scoping for organized retrieval

<div className="docPanel">
  <h3>Use when</h3>
  <p>A task is complete and the result should inform future work. Avoid capturing trivial or intermediate steps.</p>
</div>

### `synapse_memory_recall`

Retrieves memories matching a natural-language query. Supports filtering by nest, branch, tags, and agent.

Useful parameters:

- `query` — what to recall
- `nest` / `branch` — scope filter
- `agent_id` — restrict to a specific agent's memories
- `limit` — max results

<div className="docPanel">
  <h3>Use when</h3>
  <p>You need targeted recall beyond what <code>task_context</code> returns automatically.</p>
</div>

## CRUD operations

<div className="docGrid docGrid--2">
  <div className="docPanel">
    <h3><code>synapse_memory_store</code></h3>
    <p>Create a new memory entry with content, tags, and optional nest/branch scoping.</p>
  </div>
  <div className="docPanel">
    <h3><code>synapse_memory_update</code></h3>
    <p>Update an existing memory by ID. Accepts partial updates to content, tags, or metadata.</p>
  </div>
  <div className="docPanel">
    <h3><code>synapse_memory_delete</code></h3>
    <p>Remove a memory by ID. Permanent and not reversible.</p>
  </div>
  <div className="docPanel">
    <h3><code>synapse_memory_get</code></h3>
    <p>Retrieve a single memory by its exact ID. Returns full content and metadata.</p>
  </div>
  <div className="docPanel">
    <h3><code>synapse_memory_list</code></h3>
    <p>List memories with optional filtering by nest, branch, tags, or agent. Supports pagination.</p>
  </div>
  <div className="docPanel">
    <h3><code>synapse_memory_status</code></h3>
    <p>Returns memory subsystem health: total count, storage backend, and configuration state.</p>
  </div>
</div>

## Relations

Relations link memories together so you can traverse connected context.

<div className="docGrid docGrid--2">
  <div className="docPanel">
    <h3><code>synapse_memory_suggest_relations</code></h3>
    <p>Suggest potential relations for a memory based on content similarity. Review before accepting.</p>
  </div>
  <div className="docPanel">
    <h3><code>synapse_memory_add_relation</code></h3>
    <p>Create a typed link between two memories (e.g., <code>related_to</code>, <code>supersedes</code>, <code>caused_by</code>).</p>
  </div>
  <div className="docPanel">
    <h3><code>synapse_memory_remove_relation</code></h3>
    <p>Remove an existing relation between two memories.</p>
  </div>
  <div className="docPanel">
    <h3><code>synapse_memory_related</code></h3>
    <p>Retrieve all memories related to a given memory ID, following relation links.</p>
  </div>
</div>

## Events

Events capture timestamped occurrences that may not warrant a full memory entry.

### `synapse_memory_capture_event`

Record a discrete event (build failure, deployment, config change) with structured metadata.

### `synapse_memory_events`

List captured events with optional filtering by type, time range, or tags.

## Duplicate detection

### `synapse_memory_check_duplicate`

Check whether a proposed memory is semantically similar to an existing entry before storing. Helps avoid redundant memories when ingesting conversation history or bulk data.

<div className="docPanel">
  <h3>Use when</h3>
  <p>Ingesting external data via <code>synapse_ingest_markdown</code> or <code>synapse_ingest_json</code>, or when programmatically storing memories in a loop.</p>
</div>

## CLI commands

```bash
# Add a memory from the command line
synapse memory add "Switched auth to JWT with refresh tokens" --tags auth,security

# Search memories by query
synapse memory search "authentication approach"

# List all memories (optionally filtered)
synapse memory list --nest my-project --limit 20

# Show a specific memory by ID
synapse memory show <memory-id>

# Delete a memory
synapse memory delete <memory-id>
```

## Recommended flow

<div className="docSteps">
  <div className="docStep">
    <span>1</span>
    <div>
      <strong>Recall before acting</strong>
      <p>Call <code>synapse_task_context</code> at the start of every session to load relevant prior context.</p>
    </div>
  </div>
  <div className="docStep">
    <span>2</span>
    <div>
      <strong>Query when needed</strong>
      <p>Use <code>synapse_memory_recall</code> for targeted lookups during the task when you need specific prior knowledge.</p>
    </div>
  </div>
  <div className="docStep">
    <span>3</span>
    <div>
      <strong>Capture durable outcomes</strong>
      <p>After completing meaningful work, call <code>synapse_capture_outcome</code> so future sessions benefit.</p>
    </div>
  </div>
  <div className="docStep">
    <span>4</span>
    <div>
      <strong>Link related memories</strong>
      <p>Use <code>synapse_memory_suggest_relations</code> to discover connections, then <code>synapse_memory_add_relation</code> to persist them.</p>
    </div>
  </div>
</div>

:::tip
Prefer `synapse_task_context` over `synapse_memory_recall` as your first call. Task context automatically aggregates the most relevant memories for the current workspace and recent history.
:::
