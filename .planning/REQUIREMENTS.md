# Requirements: Synapse

**Defined:** 2026-04-08 (v2.0), updated 2026-04-09 (v0.2.0)
**Core Value:** A single local MCP server that handles both code retrieval AND rich structured memory — no cloud dependencies, no external databases, pure SQLite.

---

## v0.2.0 Requirements — Memory-KG Fusion & Agent-First Surface

### Batch Writes

- [ ] **BATCH-01**: `synapse_kg_add_entities_batch(entities: [])` accepts up to 500 entities in one call and returns `{created, duplicates, errors}` summary only
- [ ] **BATCH-02**: `synapse_kg_add_triples_batch(triples: [])` accepts up to 500 triples in one call and returns `{created, duplicates, errors}` summary only
- [ ] **BATCH-03**: `synapse_memory_store_batch(memories: [])` accepts up to 100 memory entries in one call and returns `{created, duplicates, errors}` summary only
- [ ] **BATCH-04**: Batch operations are transactional — either all succeed or all roll back; partial failures are reported per-item with row index
- [ ] **BATCH-05**: Write-time dedup on `(subject_id, predicate, object_id)` where `valid_to IS NULL` — duplicate triples return existing `id` instead of inserting a new row
- [ ] **BATCH-06**: Every triple auto-stamps `valid_from = NOW()` at write time if not provided, so `kg_as_of` queries return meaningful results

### Terse Responses

- [ ] **TERSE-01**: Every write tool accepts a `response_format: "minimal" | "verbose"` parameter (default `verbose` for single writes, `minimal` for batch writes)
- [ ] **TERSE-02**: `minimal` format returns `{id, ok}` for single writes and `{created, duplicates, errors}` for batch writes
- [ ] **TERSE-03**: Read tools drop empty `nest`, `branch`, `topic`, `feature` fields and duplicate `scope_*` fields from response when they are blank
- [ ] **TERSE-04**: Read tools drop `raw_score` when `score` is also present (single source of truth)
- [ ] **TERSE-05**: Target ≥ 70% token reduction on common write operations measured against a fixed benchmark conversation

### Predicate Cardinality

- [ ] **CARD-01**: Hardcoded `FUNCTIONAL_PREDICATES` set covers known single-valued predicates (`status_is`, `version_is`, `owned_by`, `located_at`, `assigned_to`, `current_state`, `has_type`, `primary_language`, `license_is`, `created_by`, `parent_of`, `rooted_at`)
- [ ] **CARD-02**: `kg_predicate_cardinality` table (additive schema migration) allows users to override default cardinality per predicate
- [ ] **CARD-03**: Contradiction detection in `addTriple` only fires for predicates with `cardinality = 'functional'`; multi-valued predicates skip the check entirely
- [ ] **CARD-04**: Unknown predicates default to multi-valued (permissive) — no false positives for custom relations
- [ ] **CARD-05**: Conversation ingestion predicates (`mentioned_by`, `co_occurs_with`) are NOT in the functional list — verified during planning
- [ ] **CARD-06**: Response shape of `addTriple` remains unchanged — same 12 fields, same names, same order

### Memory ↔ KG Fusion

- [ ] **FUSE-01**: `capture_outcome` and `memory_store` extract entities from content (existing regex/heuristic, extended if needed) and auto-create KG entities
- [ ] **FUSE-02**: Auto-generated triples populate `source_memory_id` linking back to the memory that produced them
- [ ] **FUSE-03**: Memory write response is enriched: `{memory_id, auto_linked_entities: [...], auto_triples: [...]}`
- [ ] **FUSE-04**: `memory_recall` and `search_hybrid` optionally include 1-hop KG neighbors for top-N results as a `related_facts: [...]` field on each item
- [ ] **FUSE-05**: `nest_tree` returns correct counts against real data — currently returns 0 despite populated memories (bug fix)
- [ ] **FUSE-06**: A retroactive backfill command links existing disconnected memories to existing KG entities where entity names match content

### Unified Context Primitive

- [ ] **PRIME-01**: `synapse_agent_prime(task_description)` returns `{memories, entities, files, recent_changes, suggested_actions}` under 2KB total
- [ ] **PRIME-02**: `memories` contains top 5 semantically relevant entries
- [ ] **PRIME-03**: `entities` contains top 10 KG entities related to query terms or top memories
- [ ] **PRIME-04**: `files` contains top 5 files based on recent edits + semantic similarity to task
- [ ] **PRIME-05**: `recent_changes` contains a git diff summary since last memory capture in this project
- [ ] **PRIME-06**: `suggested_actions` contains 2-4 "start with X" / "check Y" hints derived from memory + file signals

### Unified Search

- [ ] **FIND-01**: `synapse_find(query)` searches memory entries, code chunks, and KG triples in a single call
- [ ] **FIND-02**: Results are re-ranked across all three sources using normalized scores
- [ ] **FIND-03**: Each result includes a `source: "memory" | "code" | "triple"` field
- [ ] **FIND-04**: Returns top 10 across all sources by default, configurable via `limit`

### Symbol-Aware Code Intelligence

- [ ] **SYM-01**: `synapse_find_callers(symbol)` returns every call site of a function or method across indexed files
- [ ] **SYM-02**: `synapse_find_definition(symbol)` returns the declaration location(s) of a symbol
- [ ] **SYM-03**: `synapse_find_implementations(interface)` returns every implementor of an interface or protocol
- [ ] **SYM-04**: `synapse_rename_preview(old, new)` returns every location that would change if the symbol were renamed
- [ ] **SYM-05**: Tree-sitter AST parsing supports at minimum TypeScript, JavaScript, Python, Go, and Rust
- [ ] **SYM-06**: Symbol queries complete in under 500ms on a 1000-file repo

### Temporal Awareness

- [ ] **TEMPO-01**: `synapse_whats_new(since)` accepts an ISO timestamp or "last_session" and returns files changed, new memories, new triples, and recent commits since that time
- [ ] **TEMPO-02**: Response includes a natural-language delta summary (≤ 200 chars) describing what changed
- [ ] **TEMPO-03**: "last_session" resolves to the most recent `memory_entries.created_at` for the current agent + project scope
- [ ] **TEMPO-04**: `kg_as_of(date)` returns meaningful results because every triple has auto-stamped `valid_from` (see BATCH-06)

### Agent Surface Slim-Down

- [ ] **SLIM-01**: SKILL.md shrinks from ~400 lines to ~50 lines: one paragraph of philosophy + pointer to `synapse_help(task)`
- [ ] **SLIM-02**: `synapse_help(task)` returns just-in-time tool guidance scoped to the current task type
- [ ] **SLIM-03**: `memory_store` auto-infers `project_path` from cwd when not provided
- [ ] **SLIM-04**: `memory_store` auto-infers `branch_name` from git state when not provided
- [ ] **SLIM-05**: `memory_store` auto-infers `nest`, `branch`, `topic`, `tags` from content via simple rule-based classifier when not provided
- [ ] **SLIM-06**: Agent-facing `memory_store` surface is `{title, content}` — every other field is optional with sensible defaults
- [ ] **SLIM-07**: Auto-inferred values populate existing `nest`/`branch` columns so `nest_tree` and `graph_bridges` start working against real data

### Cross-Project Bridges

- [ ] **BRIDGE-01**: `graph_bridges` returns non-zero results when memories span multiple nests (depends on SLIM-07)
- [ ] **BRIDGE-02**: An opt-in scan command backfills memory entries for projects under the root that currently have zero memories
- [ ] **BRIDGE-03**: Cross-project insight surfaces (e.g., "projects A and B share library X") are accessible via a new tool or via enriched `graph_bridges` output

### Proactive Hooks

- [ ] **HOOK-07**: A Read-file hook returns related memory IDs when the file is referenced by high-importance memories (importance ≥ 70)
- [ ] **HOOK-08**: An Edit-file hook flags high-importance memories linked to the edited file and suggests updating them
- [ ] **HOOK-09**: Hook responses are non-blocking — agents can ignore them without breaking the edit flow

### Behavior Modification

- [ ] **TEACH-01**: `synapse_teach(instruction)` writes a high-importance feedback memory tagged for automatic retrieval on future related tasks
- [ ] **TEACH-02**: Teach-type memories surface in `synapse_agent_prime` top-5 recall when the current task semantically matches the instruction domain
- [ ] **TEACH-03**: Teach memories can be listed, updated, and deleted via existing memory CRUD — no new verbs needed beyond the initial `teach`

### Self-Audit

- [ ] **AUDIT-01**: `synapse_audit()` reports memory coverage by project (with/without memories, count per project)
- [ ] **AUDIT-02**: `synapse_audit()` reports KG density metrics: total entities, total triples, connected component count, orphaned entities, duplicate triples
- [ ] **AUDIT-03**: `synapse_audit()` reports unpopulated nests (memories with empty nest/branch) and broken bridges
- [ ] **AUDIT-04**: `synapse_audit()` reports stale memories (never recalled, low importance, older than 30 days)

## v0.2.0 Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-user / team sync | Synapse stays single-user local-first for v0.2.0 |
| Cloud backup or export to external graph DBs | Violates local-first principle |
| GUI / web dashboard | CLI + MCP are sufficient for agents |
| Custom embedding models beyond MiniLM | Scope creep; MiniLM is proven and cached |
| LLM-based entity extraction | Stays regex/heuristic; no LLM runtime dependency |
| Real-time conversation streaming | Batch ingestion remains sufficient |

---

## v2.0 Requirements (Shipped)

### CLI Framework

- [x] **CLI-01**: Single `synapse` binary with noun-verb subcommands (hand-rolled, zero new deps)
- [x] **CLI-02**: Global flags work on all commands: --json, --verbose, --quiet, --config
- [x] **CLI-03**: Colored help text with command categories (Core, Memory, KG, Skills, Diagnostics)
- [x] **CLI-04**: Version display via `synapse --version` and `synapse version`

### Memory CLI

- [x] **MCLI-01**: `synapse memory add` stores a memory with --type, --importance, --nest, --branch flags
- [x] **MCLI-02**: `synapse memory search` recalls memories by query with --limit, --nest, --branch filters
- [x] **MCLI-03**: `synapse memory list` shows stored memories with --json, --limit, --kind filters
- [x] **MCLI-04**: `synapse memory show <id>` displays one memory with revision history
- [x] **MCLI-05**: `synapse memory delete <id>` removes a memory with -f/--force for non-interactive

### Knowledge Graph CLI

- [x] **KGCLI-01**: `synapse kg add <subject> <predicate> <object>` creates a triple
- [x] **KGCLI-02**: `synapse kg query <entity>` shows all relationships for an entity
- [x] **KGCLI-03**: `synapse kg timeline <entity>` shows chronological fact evolution
- [x] **KGCLI-04**: `synapse kg stats` shows entity count, triple count, predicate breakdown

### Skill CLI

- [x] **SKILL-01**: `synapse skill install` installs bundled skill to all detected AI clients
- [x] **SKILL-02**: `synapse skill list` shows installed skills and their locations
- [x] **SKILL-03**: `synapse skill remove <name>` uninstalls a skill

### MCP Lifecycle CLI

- [x] **MCP-01**: `synapse mcp start` starts the MCP server (stdio mode)
- [x] **MCP-02**: `synapse mcp status` shows server health and config
- [x] **MCP-03**: `synapse mcp config` outputs ready-to-paste MCP config JSON for AI clients

### Ingest CLI

- [x] **ING-01**: `synapse ingest <file>` ingests a conversation file with auto-format detection
- [x] **ING-02**: `synapse ingest <file> --format markdown|json` explicit format override
- [x] **ING-03**: `synapse ingest <file> --nest <name> --branch <name>` assigns taxonomy

### Hook MCP Tools

- [x] **HOOK-01**: `synapse_hooks_stats` MCP tool returns registered hook counts and event types
- [x] **HOOK-02**: `synapse_hooks_list_events` MCP tool returns all valid hook event names
- [x] **HOOK-03**: Hook system is documented in skill with usage examples

### Shell Completions

- [x] **COMP-01**: `synapse completion bash` outputs bash completion script
- [x] **COMP-02**: `synapse completion zsh` outputs zsh completion script
- [x] **COMP-03**: `synapse completion fish` outputs fish completion script

### Binary Deprecation

- [x] **DEP-01**: Old `synapse-mcp-setup` redirects to `synapse setup` with deprecation warning
- [x] **DEP-02**: Old `synapse-mcp-doctor` redirects to `synapse doctor` with deprecation warning
- [x] **DEP-03**: Old `synapse-mcp-upgrade` redirects to `synapse upgrade` with deprecation warning
- [x] **DEP-04**: Old `synapse-mcp-install-skill` redirects to `synapse skill install` with deprecation warning

## Traceability

### v2.0 (shipped)

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLI-01, CLI-02, CLI-03, CLI-04 | Phase 10 | Complete |
| MCLI-01, MCLI-02, MCLI-03, MCLI-04, MCLI-05 | Phase 11 | Complete |
| KGCLI-01, KGCLI-02, KGCLI-03, KGCLI-04 | Phase 12 | Complete |
| SKILL-01, SKILL-02, SKILL-03 | Phase 13 | Complete |
| MCP-01, MCP-02, MCP-03 | Phase 14 | Complete |
| ING-01, ING-02, ING-03 | Phase 15 | Complete |
| HOOK-01, HOOK-02, HOOK-03 | Phase 16 | Complete |
| COMP-01, COMP-02, COMP-03 | Phase 17 | Complete |
| DEP-01, DEP-02, DEP-03, DEP-04 | Phase 18 | Complete |

### v0.2.0 (active)

| Requirement | Phase | Status |
|-------------|-------|--------|
| BATCH-01, BATCH-02, BATCH-03, BATCH-04, BATCH-05, BATCH-06 | Phase 26 | Pending |
| TERSE-01, TERSE-02, TERSE-03, TERSE-04, TERSE-05 | Phase 27 | Pending |
| CARD-01, CARD-02, CARD-03, CARD-04, CARD-05, CARD-06 | Phase 28 | Pending |
| FUSE-01, FUSE-02, FUSE-03, FUSE-04, FUSE-05, FUSE-06 | Phase 29 | Pending |
| PRIME-01, PRIME-02, PRIME-03, PRIME-04, PRIME-05, PRIME-06 | Phase 30 | Pending |
| FIND-01, FIND-02, FIND-03, FIND-04 | Phase 31 | Pending |
| SYM-01, SYM-02, SYM-03, SYM-04, SYM-05, SYM-06 | Phase 32 | Pending |
| TEMPO-01, TEMPO-02, TEMPO-03, TEMPO-04 | Phase 33 | Pending |
| SLIM-01, SLIM-02, SLIM-03, SLIM-04, SLIM-05, SLIM-06, SLIM-07 | Phase 34 | Pending |
| BRIDGE-01, BRIDGE-02, BRIDGE-03 | Phase 35 | Pending |
| HOOK-07, HOOK-08, HOOK-09 | Phase 36 | Pending |
| TEACH-01, TEACH-02, TEACH-03 | Phase 37 | Pending |
| AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04 | Phase 38 | Pending |

**Coverage:**
- v2.0: 32/32 mapped, shipped
- v0.2.0: 63/63 mapped across 13 phases (26-38), complete

---

## v0.3.0 Requirements — MCP Spec Compliance & Production Hardening

### Tool Annotations (MCP Spec)
- [x] **ANNOT-01**: All 72 MCP tools have `readOnlyHint`, `destructiveHint`, `idempotentHint` annotations matching their actual behavior
- [x] **ANNOT-02**: Write tools marked `destructiveHint: false` (additive), delete tools marked `destructiveHint: true`
- [x] **ANNOT-03**: Annotations are validated in the MCP tools test (tool name -> expected annotations mapping)

### Structured Output (MCP Spec)
- [x] **STRUCT-01**: All tool responses include `structuredContent` alongside text `content`
- [x] **STRUCT-02**: Tools declare `outputSchema` in their registration for typed response parsing
- [x] **STRUCT-03**: Existing `response_format: "json"` behavior preserved as backwards-compatible default

### Resource Links (MCP Spec)
- [x] **RLINK-01**: `read_file`, `search_code`, `search_files` return `resource_link` objects instead of inlining full file content
- [x] **RLINK-02**: Clients can dereference resource links via MCP resource protocol
- [x] **RLINK-03**: Fallback: when client doesn't support resource links, inline content as before

### Bi-Temporal KG Model
- [x] **BITEMP-01**: `kg_triples` table gains a `recorded_at` column (additive migration) tracking when the triple was stored
- [x] **BITEMP-02**: `kg_as_of` can query on either `valid_from`/`valid_to` (event time) or `recorded_at` (transaction time)
- [x] **BITEMP-03**: `kg_timeline` includes `recorded_at` in its output for each triple

### WAL Mode & Performance
- [ ] **WAL-01**: SQLite databases open in WAL mode by default (`PRAGMA journal_mode=WAL`)
- [ ] **WAL-02**: Tuned PRAGMAs applied at DB init: `cache_size=-64000`, `synchronous=NORMAL`, `mmap_size=268435456`
- [ ] **WAL-03**: Performance regression guard: batch insert of 500 triples completes in <2s

### Backup & Restore
- [ ] **BACKUP-01**: `synapse_backup` MCP tool creates a point-in-time SQLite backup to a specified path
- [ ] **BACKUP-02**: `synapse_restore` MCP tool restores from a backup file with integrity verification
- [ ] **BACKUP-03**: CLI `synapse backup` and `synapse restore` commands wrap the MCP tools

### Actor-Aware Memories
- [x] **ACTOR-01**: `memory_entries` gains `actor_id` column (additive migration) — who created this memory
- [x] **ACTOR-02**: `memory_store` and `memory_store_batch` accept `actor_id` parameter, auto-inferred from agent_id if omitted
- [x] **ACTOR-03**: `memory_recall` and `memory_list` accept `actor_id` filter
- [x] **ACTOR-04**: `agent_prime` surfaces actor attribution in recalled memory items

### v0.3.0 Tracking

| Requirement | Phase | Status |
|-------------|-------|--------|
| ANNOT-01, ANNOT-02, ANNOT-03 | Phase 39 | Pending |
| STRUCT-01, STRUCT-02, STRUCT-03 | Phase 40 | Pending |
| RLINK-01, RLINK-02, RLINK-03 | Phase 41 | Pending |
| BITEMP-01, BITEMP-02, BITEMP-03 | Phase 42 | Pending |
| WAL-01, WAL-02, WAL-03 | Phase 43 | Pending |
| BACKUP-01, BACKUP-02, BACKUP-03 | Phase 44 | Pending |
| ACTOR-01, ACTOR-02, ACTOR-03, ACTOR-04 | Phase 45 | Pending |

**Coverage:**
- v0.3.0: 22 requirements mapped across 7 phases (39-45)

---
*Requirements defined: 2026-04-08 (v2.0), updated 2026-04-09 (v0.2.0), updated 2026-04-10 (v0.3.0)*
