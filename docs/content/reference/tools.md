---
title: Power Controller Reference
description: Detailed technical reference for Loci MCP tools with JSON schemas and examples.
---

# Power Controller Reference

Loci uses a **Power Controller** model. Instead of dozens of granular tools, we provide high-density controllers that handle complex logic in a single turn.

## 1. Memory Management (`synapse_memory_manage`)
Handles the lifecycle of agent memories, workspace events, and workflow rules.

### Actions
- `store`: Persist a new fact or decision.
- `update`: Edit an existing memory (creates a revision).
- `delete`: Archive or purge memories.
- `capture_event`: Log a background event (e.g., git commit).
- `add_relation`: Link two memories (e.g., `related`, `depends_on`).
- `teach`: Store a durable behavior rule for the agent.
- `capture_outcome`: Persist the final result of a task.

### Example: Storing a Decision
**Request:**
```json
{
  "action": "store",
  "title": "Use Vitest over Jest",
  "content": "Decided to use Vitest for better ESM support and speed.",
  "kind": "decision",
  "importance": 90,
  "tags": ["testing", "esm"],
  "scope": { "project_path": "/app", "topic": "testing" }
}
```

**Response:**
```json
{
  "data": {
    "id": "mem_12345",
    "created": true,
    "title": "Use Vitest over Jest",
    "status": "active"
  },
  "meta": { "schema_version": "1.0.0" }
}
```

---

## 2. Memory Query (`synapse_memory_query`)
Retrieves and synthesizes contextual knowledge for task rehydration.

### Actions
- `recall`: Semantic vector search across memories.
- `list`: Filtered list of memories.
- `task_context`: **High Density**: Rehydrates memory, events, and symbols for a task in one call.
- `events`: View recent work history.
- `status`: Database health and metrics.
- `whats_new`: Delta query for changes since a timestamp.

### Example: Getting Task Context
**Request:**
```json
{
  "action": "task_context",
  "task": "Optimize the parser",
  "project_path": "src/parser",
  "limit": 5,
  "item_format": "compact"
}
```

**Response:**
```json
{
  "data": {
    "memories": [
      { "id": "mem_1", "title": "Parser timeout issue", "score": 0.92 },
      { "id": "mem_2", "title": "Tree-sitter migration", "score": 0.85 }
    ],
    "events": [...],
    "suggested_actions": ["check chunker.ts", "run benchmark"]
  },
  "meta": { "pagination": { "count": 2 } }
}
```

---

## 3. Unified Search (`synapse_search`)
Fuses multiple search strategies into a single discovery interface.

### Actions
- `hybrid`: Reciprocal Rank Fusion (RRF) of lexical (BM25) and semantic (Vector) search.
- `code`: Exact text matching using a optimized Ripgrep bridge.
- `files`: Fast path-based discovery.

### Example: Hybrid Search
**Request:**
```json
{
  "query": "how is auth token refreshed?",
  "project_path": "/server",
  "min_semantic_score": 0.4
}
```

**Response:**
```json
{
  "data": {
    "items": [
      {
        "file": "src/auth/service.ts",
        "line": 42,
        "type": "code_chunk",
        "text": "async refresh() { ... }",
        "final_score": 0.98
      }
    ]
  }
}
```

---

## 4. Symbol Intelligence (`synapse_symbol_query`)
Deep AST-aware tracking of codebase structure and dependencies.

### Actions
- `definition`: Jump to where a symbol (class, function, type) is defined.
- `usages`: Find every reference to a symbol.
- `callers`: Specifically find call sites of a function/method.
- `implementations`: Find classes that implement an interface or trait.

### Example: Finding Callers
**Request:**
```json
{
  "symbol": "refreshAuthToken",
  "language": "typescript"
}
```

---

## 5. Workspace Management (`synapse_workspace_manage`)
Structural exploration and precision code reading.

### Actions
- `tree`: Generate a directory tree with grouping for large projects.
- `read`: Bounded file reading with `signatures` mode for rapid structural analysis.
- `summarize`: Generate an architectural "cheat sheet" for a directory.

### Example: Reading Signatures
**Request:**
```json
{
  "path": "src/core/engine/memory/service.ts",
  "mode": "signatures"
}
```
**Response:** (Returns only function/class declarations, skipping implementation bodies to save tokens).

---

## 6. System Management (`synapse_system_manage`)
Platform health, indexing, and maintenance.

### Actions
- `index`: Refresh the semantic vector index for a project.
- `audit`: Deep health check (KG density, broken bridges, stale memories).
- `status`: View version, OS, and hardware utilization.

---

### Shared Parameters
- **`item_format`**: `verbose` (full data), `compact` (ID + Title), `lite` (ID only).
- **`terse`**: `verbose` (detailed ACK), `minimal` (boolean ACK).
- **`scope`**: Filter by `root_path`, `project_path`, `branch_name`, `topic`, or `feature`.
