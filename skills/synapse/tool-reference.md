# Tool Reference

## Server and runtime

### `synapse_server_status`
Returns runtime config: active roots, ripgrep status, index backend (`sqlite-vec` or `json`), chunk settings, and update status metadata. Always call first in a new session.

### `synapse_health`
Returns a compact runtime health summary for fast smoke checks. Prefer this when you only need a quick runtime answer rather than the full server status payload.

### `synapse_usage_guide`
Returns structured best-practice guidance for users and AI agents. No params. Call this when unsure about the correct workflow.

### `synapse_update_status`
Checks npm for latest package version with local caching (default interval 120 minutes). Params: `force_check` (bool, default false). Use this to decide whether to ask user to update.

### `synapse_update_self`
Performs global self-update and skill sync. Params:
- `approved_by_user` (required safety gate; must be true)
- `dry_run` (bool, default false)
- `version` (default `latest`)
- `reinstall_skill` (bool, default true)

This tool should only be called after explicit user approval and is intended for npm-installed Synapse packages.

## Workspace and file discovery

### `synapse_list_roots`
Lists configured roots. Supports `limit` / `offset` pagination.

### `synapse_list_projects`
Lists first-level projects under a root. Params: `root_path` (optional), `limit`, `offset`.

### `synapse_project_tree`
Returns compact file/folder tree. Params: `project_path` (required), `max_depth` (1–8, default 3), `max_entries` (default 1500). Start with low `max_depth`, expand if needed.

### `synapse_read_file`
Reads a bounded line window from a file with line numbers. Params: `path`, `start_line` (default 1), `end_line` (default cap). Window is capped at 800 lines. Read narrow ranges first, then expand.

### `synapse_summarize_project`
High-level summary: language breakdown, extension stats, file counts. Params: `project_path` (required), `max_files` (default 3000).

## Index and embedding state

### `synapse_index_status`
Returns semantic index metadata (exists, stale, backend, file count). Use before indexing.

If `backend=json` and `upgrade_recommended=true`, move to `sqlite-vec` for better scale/performance.

### `synapse_embed_status`
Returns active embedding backend/model status and vector-search readiness. Use this when hybrid search quality is weak, embeddings appear unavailable, or you need to confirm the current provider/model before indexing.
Interpretation note:
- `enabled=true` means the feature is configured.
- `available=true` means the model has loaded successfully in the current runtime.

### `synapse_index_project`
Builds or refreshes semantic index. Params:
- `project_path` (optional) — scope to one project
- `all_roots` (bool, default false) — index all roots
- `force` (bool, default false) — rebuild even if fresh
- `max_files` (default 20000) — cap on files indexed

Prefer project-scoped over all-roots for speed. Returns `failed_files: [{path, error}]` for files that could not be indexed while still committing the rest.

## Search and code navigation

### `synapse_search_files`
Searches file paths and names for a query string. Use this first when looking for a module or feature by name. Params: `query` (required), `project_path` (optional), `all_roots`, `max_results`, `case_sensitive`.

### `synapse_search_code`
Lexical search (ripgrep or JS fallback). Best for exact symbol names, identifiers, error strings, or regex patterns. Params:
- `query`
- `project_path`
- `all_roots`
- `glob`
- `max_results`
- `case_sensitive`
- `use_regex`
- `context_lines`

### `synapse_search_hybrid`
Lexical + semantic search with RRF ranking. Best for concept-level or natural-language queries. Requires `synapse_index_project` to have been run first. Params:
- `query`
- `project_path`
- `all_roots`
- `glob`
- `max_results`
- `case_sensitive`
- `min_semantic_score`
- `auto_index`
- `use_reranker`

### `synapse_get_symbol`
Symbol definition/export lookup. Use this first for “where is X defined/exported?” questions.

### `synapse_find_usages`
Symbol usage lookup for imports and call sites. Use this for “where is X used/called/imported?” questions.

## Memory workflow

### `synapse_memory_status`
Returns memory consent state, backend compatibility, active database path, and store status. Call before using memory tools.

### `synapse_task_context`
Returns runtime status, memory state, and relevant recall in one call. Prefer this over manually chaining memory tools for non-trivial tasks.

### `synapse_memory_recall`
Recalls the most relevant local memories for a task/query. Use at the start of substantive tasks when memory is enabled.

### `synapse_capture_outcome`
Captures a meaningful task outcome with a simpler payload and forwards it into the memory event pipeline. Prefer this over `synapse_memory_capture_event` when you do not need low-level control.

### `synapse_memory_capture_event`
Background event ingest tool for automatic memory flow.

### `synapse_memory_events`
Lists recent memory capture events and whether they were promoted into durable memory.

### `synapse_memory_list`
Lists stored memories with filters.

### `synapse_memory_get`
Fetches a memory entry with revision history.

### `synapse_memory_store`
Manual durable memory write. Use for explicit corrections or when automatic capture is not appropriate.

### `synapse_memory_update`
Updates a memory and appends a revision.

### `synapse_memory_delete`
Deletes a memory entry and all its revisions. Also removes all graph relations connected to that entry.

## Memory graph tools

### `synapse_memory_suggest_relations`
Finds semantically similar memories that could be linked to a given memory.

### `synapse_memory_add_relation`
Links two memory entries with a named relation. Recommended values: `related`, `depends_on`, `contradicts`, `supersedes`, `extends`.

### `synapse_memory_remove_relation`
Removes a specific directed relation between two memory entries.

### `synapse_memory_related`
Traverses the knowledge graph one hop in both directions from a given memory.

### `synapse_memory_check_duplicate`
Checks whether content is a semantic duplicate of an existing memory entry. Params: `content` (required), `threshold` (float 0-1, default 0.92), `nest`, `branch`, `project_path`. Returns matching entry details if duplicate found.

## Knowledge graph tools

### `synapse_kg_add_entity`
Creates or updates an entity. Entity IDs are auto-generated as normalized slugs (lowercase, underscored). Params: `name` (required), `entity_type` (default "concept"), `properties` (JSON object), `memory_id` (optional FK to memory entry).

### `synapse_kg_add_triple`
Adds a subject-predicate-object triple. Entities are auto-created on first reference. Detects contradictions (same subject+predicate with different valid object) and warns without blocking. Params: `subject` (required), `predicate` (required), `object` (required), `valid_from` (ISO date or null), `confidence` (0-1, default 1.0), `source_memory_id` (nullable). All of `valid_from`, `valid_to`, and `source_memory_id` accept `null` and may be omitted.

### `synapse_kg_query`
Queries all relationships for an entity. Params: `entity` (required), `direction` (outgoing/incoming/both, default both).

### `synapse_kg_invalidate`
Sets valid_to on a triple to mark it as no longer current. Params: `subject` (required), `predicate` (required), `object` (required), `ended` (ISO date or null, default today).

### `synapse_kg_as_of`
Queries triples for an entity at a specific point in time. Params: `entity` (required), `as_of` (required, ISO date), `direction` (default both).

### `synapse_kg_timeline`
Returns chronological timeline of all triples for an entity, including invalidated facts. Params: `entity` (required).

### `synapse_kg_stats`
Returns knowledge graph statistics: total entity count, total triple count, active triple count, and breakdown by predicate type.

## Nest/branch organization tools

### `synapse_nest_list`
Lists all nests (top-level memory domains) with their memory entry counts.

### `synapse_nest_branches`
Lists all branches (topics) within a specific nest. Params: `nest` (required).

### `synapse_nest_tree`
Returns the full taxonomy tree: all nests, their branches, and memory counts at each level.

## Graph traversal tools

### `synapse_graph_traverse`
Multi-hop traversal from a starting entity using SQLite recursive CTEs. Params: `entity` (required), `max_hops` (1-5, default 2), `direction` (outgoing/incoming/both). Returns discovered entities with path information (hop sequence).

### `synapse_graph_bridges`
Discovers cross-nest bridges: entities connected by triples that span different nests. Useful for finding connections across domains.

## Agent diary tools

### `synapse_diary_write`
Writes a private diary entry for an agent. Diary entries are isolated and only visible to the owning agent. Params: `agent_id` (required), `content` (required), `topic` (optional).

### `synapse_diary_read`
Reads recent diary entries for a specific agent. Only returns entries belonging to the requesting agent. Params: `agent_id` (required), `limit` (default 10), `topic` (optional filter).

## Conversation ingestion tools

### `synapse_ingest_markdown`
Ingests a Markdown conversation export into memory entries and knowledge graph triples. Params: `content` (required, raw markdown), `nest` (optional), `branch` (optional), `agent_id` (optional). Splits by turns, extracts entities, runs dedup, skips re-ingestion of same content.

### `synapse_ingest_json`
Ingests a JSON conversation export (array of `{role, content, timestamp?}` objects). Same params and behavior as `synapse_ingest_markdown`.

## Hook introspection tools

### `synapse_hooks_stats`
Returns hook system statistics: whether hooks are enabled, total registered listener count, and a breakdown of listener counts per event type. No params. Use this to audit active hooks or verify that a hook registration succeeded.

### `synapse_hooks_list_events`
Returns all valid hook event names that listeners can subscribe to. No params. Covers memory lifecycle, knowledge graph, graph traversal, diary, ingestion, dedup, taxonomy, wildcards, and the error event.

## Batch operations (v0.2.0)

### `synapse_kg_add_entities_batch`
Create up to 500 KG entities in a single transactional call. Returns `{created, duplicates, errors}` summary. Use instead of looping `kg_add_entity`. Params: `entities[]` (name, type, properties), `response_format`.

### `synapse_kg_add_triples_batch`
Add up to 500 KG triples in a single transactional call with write-time dedup on `(subject_id, predicate, object_id)` where `valid_to IS NULL`. Auto-stamps `valid_from`. Params: `triples[]`, `response_format`.

### `synapse_memory_store_batch`
Store up to 100 memory entries in a single transactional call. Fingerprint + semantic dedup. Returns `{created, duplicates, errors}`. Params: `memories[]` (title, content + optional fields), `response_format`.

## Agentic workflow (v0.2.0)

### `synapse_agent_prime`
One-call context: returns recalled memories, matched KG entities, relevant files, recent git changes, and suggested next actions for a task. Replaces the 4+ tool cold-start pattern. Params: `task`, `project_path?`, `nest?`, `branch?`.

### `synapse_find`
Fused search across memory, code, and KG with Reciprocal Rank Fusion cross-source re-ranking. Params: `query`, `limit?`, `sources?` (array of `memory`/`code`/`triple`).

### `synapse_whats_new`
Cross-session delta: new memories, new triples, files changed, and recent commits since a timestamp or `"last_session"`. Params: `since`, `project_path?`, `agent_id?`, `limit?`.

### `synapse_teach`
Store a durable behavior modifier as a high-importance feedback memory. Surfaces automatically in future `agent_prime` calls. Params: `instruction`, `importance?` (70-100), `tags?`, `nest?`, `branch?`.

### `synapse_help`
Task-scoped tool guidance. Describe what you want to do and get recommended tools, workflow steps, and tips. Params: `task`.

### `synapse_audit`
Self-audit dashboard: project coverage, KG density, nest health, stale memories, health score (0-100), and actionable suggestions. No params.

### `synapse_file_changed`
Report a file edit to get proactive memory hints. Returns linked high-importance memories with `suggest_update: true`. Params: `file_path`.

### `synapse_kg_backfill_links`
Retroactively link existing memories to matching KG entities. Scans memories and creates `mentioned_in` triples for content matching entity names. Params: `limit?`, `offset?`, `nest?`, `branch?`.

### `synapse_project_backfill`
Scan a directory for projects (package.json, Cargo.toml, go.mod, etc.) and create seed memories for untracked ones. Params: `root_path`, `dry_run?`.

## Code intelligence (v0.2.0)

### `synapse_find_callers`
Find all call sites of a symbol across the codebase. Uses symbol index with regex extraction. Params: `symbol`, `project_path?`, `language?`.

### `synapse_find_definition`
Find the definition location of a symbol. Params: `symbol`, `project_path?`, `language?`.

### `synapse_find_implementations`
Find implementations of an interface, trait, or abstract class. Params: `symbol`, `project_path?`, `language?`.

### `synapse_rename_preview`
Preview all references that would change when renaming a symbol. Params: `symbol`, `new_name`, `project_path?`.

## Batch delete (v0.2.0)

### `synapse_memory_delete_batch`
Delete up to 100 memory entries in a single transactional call. Cascades to revisions and relations. Params: `ids` (array of memory IDs, max 100). Returns `{ deleted, errors }`.

### `synapse_kg_delete_entity`
Delete a KG entity and cascade-remove all triples where it appears as subject or object. Params: `entity_id`. Returns `{ deleted, entity_id, triples_removed }`.

### `synapse_kg_delete_entities_batch`
Delete up to 100 KG entities with cascade in a single transaction. Params: `entity_ids` (array, max 100). Returns `{ deleted, triples_removed, errors }`.

### `synapse_kg_delete_triples_batch`
Hard-delete up to 100 KG triples by ID (not invalidate — permanent removal). Params: `triple_ids` (array, max 100). Returns `{ deleted, errors }`.
