# Loci Tool Reference (v2026.5.0)

Loci uses high-density **Power Controllers** to minimize context window overhead and ensure compatibility with strict AI clients like Gemini. Always use the `action` parameter to specify the operation.

## 🚀 Orchestration

### `synapse_agent_prime`
**[MANDATORY START]** The most important tool for task initialization. Rehydrates project context, recalled memories, KG entities, relevant files, recent changes, and suggested actions in one call. Always call this BEFORE deeper research.

## 🔍 Search & Intelligence

### `synapse_search`
Unified controller for discovery and retrieval.
- `action: "files"`: Search file paths and names.
- `action: "code"`: Lexical search (ripgrep) for symbols, imports, or patterns.
- `action: "hybrid"`: Lexical + semantic retrieval with RRF ranking.
- `action: "find"`: Fused search across memories, code, and KG triples.

### `synapse_symbol_query`
Unified static code intelligence.
- `action: "callers"`: Find all call sites of a function or method.
- `action: "definition"`: Jump to symbol declaration location.
- `action: "implementations"`: Find classes/structs implementing an interface.
- `action: "usages"`: Find all imports and usages of a symbol.
- `action: "get"`: Comprehensive symbol lookup.
- `action: "rename_preview"`: Dry-run preview of a symbol rename.

## 🧠 Memory Management

### `synapse_memory_manage`
Unified controller for memory mutations.
- `action: "store"`: Manual durable memory write.
- `action: "update"`: Update existing memory and append revision.
- `action: "delete"`: Remove memory entry (supports batch via `ids`).
- `action: "capture_event"`: Ingest background work events.
- `action: "capture_outcome"`: Record task completion and key decisions.
- `action: "teach"`: Store durable behavior rules or preferences.
- `action: "add_relation"`: Link two memories (e.g., `depends_on`, `supersedes`).
- `action: "remove_relation"`: Remove a link between memories.
- `action: "store_batch"`: Atomic transactional store of multiple memories.

### `synapse_memory_query`
Unified controller for memory read operations.
- `action: "list"`: List memories with kind/status/nest filters.
- `action: "get"`: Fetch memory entry with revision history.
- `action: "recall"`: Semantically recall relevant memories for a query.
- `action: "task_context"`: Bundle status, memory, and recall for a task.
- `action: "events"`: List recent capture events.
- `action: "suggest"`: Find semantically similar memories for linking.
- `action: "related"`: Traverse one-hop memory relations.
- `action: "status"`: Check memory store health and configuration.
- `action: "whats_new"`: Cross-session delta (new memories, triples, files).
- `action: "nest_list"`: List top-level taxonomy nests.
- `action: "nest_branches"`: List branches within a nest.
- `action: "taxonomy_tree"`: Full tree of nests and branches.

## 🕸️ Knowledge Graph

### `synapse_kg_manage`
Unified controller for KG mutations.
- `action: "add_entity"` / `"add_entities_batch"`: Create KG entities.
- `action: "add_triple"` / `"add_triples_batch"`: Add subject-predicate-object facts.
- `action: "invalidate"`: Mark a fact as no longer current (valid_to).
- `action: "delete_entity"` / `"delete_triple"`: Permanent hard deletion.
- `action: "manage_branches"`: Merge, rename, or prune KG branches.
- `action: "ingest_markdown"` / `"ingest_json"`: Convert conversations to KG facts.
- `action: "backfill_links"`: Retroactively link memories to entities.
- `action: "write_diary"`: Private agent-specific chronological notes.

### `synapse_kg_query`
Unified controller for KG state and traversal.
- `action: "list_entities"`: Filter entities by type/name.
- `action: "query_relationships"`: Get outgoing/incoming relations.
- `action: "as_of"`: Query the graph at a specific point in time.
- `action: "timeline"`: Full chronological history of an entity.
- `action: "stats"`: Graph density and predicate breakdown.
- `action: "traverse"`: Multi-hop graph traversal.
- `action: "bridges"`: Discover cross-nest/cross-branch connections.
- `action: "diary_read"`: Read chronological agent notes.
- `action: "check_duplicate"`: Semantic dedup for KG content.

## 📂 Workspace & Files

### `synapse_workspace_manage`
Unified controller for file and project operations.
- `action: "list_roots"`: List configured local roots.
- `action: "list_projects"`: Discover projects (e.g., package.json).
- `action: "tree"`: Return compact directory structure.
- `action: "read"`: Read file chunk with proactive memory hints.
- `action: "file_changed"`: Report edit to trigger hint refresh.
- `action: "summarize"`: High-level project metrics (languages, counts).
- `action: "backfill"`: Scan and create seed memories for projects.

## 🛠️ System & Lifecycle

### `synapse_system_manage`
Unified controller for system maintenance.
- `action: "index_status"` / `"embed_status"`: Check indexing health.
- `action: "index_project"`: Build/refresh semantic vector index.
- `action: "audit"`: Comprehensive self-audit dashboard.
- `action: "backup"` / `"restore"`: Point-in-time database management.
- `action: "update_status"` / `"update_self"`: Lifecycle management.

### Diagnostics
- `synapse_server_status`: Full runtime configuration summary.
- `synapse_health`: Compact smoke check.
- `synapse_help`: Task-scoped tool guidance.
- `synapse_usage_guide`: Best-practice agent instructions.
- `synapse_discovery`: Activate specialized tool categories.
