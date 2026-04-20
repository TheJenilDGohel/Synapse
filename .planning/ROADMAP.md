# Roadmap: Synapse

## Milestones

- Shipped: **v1.0 Memory Enhancement** - Phases 1-9 (2026-04-08)
- Shipped: **v2.0 CLI-First Architecture** - Phases 10-18 (2026-04-08)
- Deferred to release/0.1.0 branch: **v0.1.0 The Big Upgrade** - Phases 19-25
- Shipped on release/0.2.0 branch: **v0.2.0 Memory-KG Fusion & Agent-First Surface** - Phases 26-38
- Shipped on release/0.3.0 branch: **v0.3.0 MCP Spec Compliance & Production Hardening** — Phases 39-45 (2026-04-13)

## Phases

<details>
<summary>Shipped: v1.0 Memory Enhancement (Phases 1-9) - 2026-04-08</summary>

- [x] **Phase 1: Migration Infrastructure Hardening** - Safe, transactional schema migrations with version validation
- [x] **Phase 2: Knowledge Graph Core** - Entity and triple storage with schema v6, temporal columns, provenance tracking
- [x] **Phase 3: Temporal Validity** - Point-in-time queries, fact timelines, and KG statistics
- [x] **Phase 4: Nest/Branch Hierarchy** - Two-level memory taxonomy with filtered recall
- [x] **Phase 5: Graph Traversal and Contradiction Detection** - Multi-hop walks, cross-nest bridges, and write-time contradiction warnings
- [x] **Phase 6: Agent-Scoped Memory** - Per-agent namespaces with isolated diary entries
- [x] **Phase 7: Semantic Duplicate Detection** - Embedding similarity gate before storage
- [x] **Phase 8: Conversation Ingestion** - Parse Markdown/JSON conversations into memories and triples
- [x] **Phase 9: MCP Tool Registration** - Expose all new capabilities as synapse_* MCP tools

</details>

<details>
<summary>Shipped: v2.0 CLI-First Architecture (Phases 10-18) - 2026-04-08</summary>

- [x] **Phase 10: CLI Framework Setup** - Commander.js skeleton with global flags, colored help, and version display
- [x] **Phase 11: Memory CLI Commands** - Full memory CRUD via synapse memory subcommands
- [x] **Phase 12: Knowledge Graph CLI** - KG triple and entity operations from the command line
- [x] **Phase 13: Skill CLI Commands** - Install, list, and remove bundled skills across AI clients
- [x] **Phase 14: MCP Lifecycle CLI** - Start, status, and config generation for MCP server
- [x] **Phase 15: Ingest CLI** - Conversation file ingestion with format detection and taxonomy
- [x] **Phase 16: Hook MCP Tools** - Hook introspection tools and documentation for AI discoverability
- [x] **Phase 17: Shell Completions and Polish** - Tab completions for bash, zsh, and fish
- [x] **Phase 18: Binary Deprecation** - Redirect old fragmented binaries to unified CLI with warnings

</details>

<details>
<summary>Archived: v0.1.0 (deferred) + v0.2.0 (shipped) — Phase summaries and Phase Details for phases 10-38</summary>

### Deferred: v0.1.0 The Big Upgrade (release/0.1.0 branch)

**Milestone Goal:** TypeScript migration, CLI visual refresh, search/memory performance, latest libraries.

**Parallel Lanes:** A (CLI: 19-20), B (Perf: 21-22), C (TS: 23-24-25)

- [ ] **Phase 19: CLI Foundation** - Extract shared ANSI/output module, deduplicate 5 CLI files (~150 lines)
- [ ] **Phase 20: CLI Visual Refresh** - Add ora spinners, modernize help/dashboard, consistent error formatting
- [ ] **Phase 21: Performance Quick Wins** - Composite indexes, embedding LRU cache, prepared statement reuse
- [ ] **Phase 22: Performance Deep** - Async vector index, sqlite-vec integration, batch embedding queries
- [ ] **Phase 23: TypeScript Infrastructure** - tsconfig.json, build pipeline, CI changes, @types/node
- [ ] **Phase 24: TypeScript Migration** - Convert 94 source files + 3 test files from JS to TS
- [ ] **Phase 25: Library Updates + Ship** - Update all deps to latest, final verification, release v0.1.0

### Active: v0.2.0 Memory-KG Fusion & Agent-First Surface (release/0.2.0 branch)

**Milestone Goal:** Make Synapse the single primitive an agent calls at the start of every task and at the end of every outcome — batch writes, terse responses, auto-linked memory-KG, unified retrieval, symbol-aware code intelligence.

**Phase Numbering:** v0.2.0 starts at phase 26 (phases 19-25 are reserved on release/0.1.0 branch). Integer phases (26, 27, ...) are planned milestone work; decimal phases (e.g. 26.1) are urgent insertions added via `/gsd:insert-phase`.

**Parallel Lanes:**
- Lane A (Foundation, strict sequence): 26 -> 27 -> 28 -> 29
- Lane B (Retrieval surfaces, after 29): 30 and 31 in parallel
- Lane C (Code intel, after 26): 32 independent
- Lane D (Temporal + Slim, after 29): 33 and 34 in parallel
- Lane E (Advanced): 35 (after 34), 36 (after 26), 37 (after 30), 38 (last)

- [ ] **Phase 26: Batch Writes, Dedup, Auto valid_from** - Batch variants of every write tool with transactional semantics, write-time triple dedup, and auto-stamped valid_from
- [ ] **Phase 27: Terse Response Format** - `response_format: "minimal"` on every write tool, pruned read responses, 70%+ token reduction
- [ ] **Phase 28: Predicate Cardinality & Contradiction Fix** - Functional vs multi-valued predicates, DB override table, gated contradiction detection (absorbs quick task 260409-ohq)
- [ ] **Phase 29: Memory <-> KG Auto-Linking** - Entity extraction on capture, auto-triples with source_memory_id, KG 1-hop neighbors wired into recall
- [ ] **Phase 30: Unified Context Primitive `agent_prime`** - Single call returning memories + entities + files + recent changes + suggested actions under 2KB
- [ ] **Phase 31: Unified Search `find`** - Fused memory + code + KG search with cross-source re-ranking and source tagging
- [ ] **Phase 32: Symbol-Aware Code Intelligence** - Tree-sitter AST parsing for find_callers, find_definition, find_implementations, rename_preview across TS/JS/Python/Go/Rust (introduces tree-sitter runtime dep)
- [ ] **Phase 33: Temporal Awareness `whats_new`** - Cross-session delta summary using auto-stamped valid_from + git diff + new memories/triples since a timestamp
- [ ] **Phase 34: Agent Surface Slim-Down** - SKILL.md shrinks to ~50 lines, `synapse_help(task)`, auto-inferred project_path/branch/nest/branch/topic/tags on memory_store
- [ ] **Phase 35: Cross-Project Bridges & Backfill** - `graph_bridges` returns real data (depends on SLIM-07), opt-in backfill scan for empty projects, cross-project insight surfaces
- [ ] **Phase 36: Proactive Hooks** - Read-file and Edit-file hooks surface high-importance memories linked to touched files, non-blocking
- [ ] **Phase 37: Behavior Modification `teach`** - `synapse_teach(instruction)` writes high-importance feedback memory auto-surfaced via agent_prime on matching tasks
- [ ] **Phase 38: Self-Audit Dashboard** - `synapse_audit()` reports coverage, KG density, orphans, broken bridges, stale memories

## Phase Details

### Phase 10: CLI Framework Setup
**Goal**: Users have a single `synapse` command that responds to --help, --version, --json, --verbose, and --quiet with colored, categorized output
**Depends on**: Nothing (first phase of v2.0 milestone; builds on v1.0 internals)
**Requirements**: CLI-01, CLI-02, CLI-03, CLI-04
**Success Criteria** (what must be TRUE):
  1. Running `synapse` with no arguments prints colored help text organized by command categories (Core, Memory, KG, Skills, Diagnostics)
  2. Running `synapse --version` or `synapse version` prints the current package version
  3. Passing --json to any command switches output from human-readable to JSON
  4. Passing --verbose increases output detail; passing --quiet suppresses non-essential output
**Plans**: 1 (complete)

### Phase 11: Memory CLI Commands
**Goal**: Users can manage memories entirely from the command line without touching MCP tools
**Depends on**: Phase 10
**Requirements**: MCLI-01, MCLI-02, MCLI-03, MCLI-04, MCLI-05
**Success Criteria** (what must be TRUE):
  1. User can run `synapse memory add` with --type, --importance, --nest, --branch flags and see the created memory ID echoed back
  2. User can run `synapse memory search <query>` and receive ranked results with --limit, --nest, --branch filters applied
  3. User can run `synapse memory list` to see all stored memories with --json, --limit, --kind filters working
  4. User can run `synapse memory show <id>` and see the full memory entry including its revision history
  5. User can run `synapse memory delete <id>` with a confirmation prompt, or skip it with -f/--force
**Plans**: 1 (complete)

### Phase 12: Knowledge Graph CLI
**Goal**: Users can create, query, and inspect knowledge graph triples and timelines from the terminal
**Depends on**: Phase 10
**Requirements**: KGCLI-01, KGCLI-02, KGCLI-03, KGCLI-04
**Success Criteria** (what must be TRUE):
  1. User can run `synapse kg add <subject> <predicate> <object>` and see the created triple confirmed
  2. User can run `synapse kg query <entity>` and see all incoming/outgoing relationships for that entity
  3. User can run `synapse kg timeline <entity>` and see chronological fact evolution with valid_from/valid_to dates
  4. User can run `synapse kg stats` and see total entity count, triple count, and predicate breakdown
**Plans**: 1 (complete)

### Phase 13: Skill CLI Commands
**Goal**: Users can install, inspect, and remove bundled Synapse skills across all detected AI clients
**Depends on**: Phase 10
**Requirements**: SKILL-01, SKILL-02, SKILL-03
**Success Criteria** (what must be TRUE):
  1. User can run `synapse skill install` and have the bundled skill installed to all detected AI client config locations (Claude, Cursor, etc.)
  2. User can run `synapse skill list` and see which skills are installed and where they live on disk
  3. User can run `synapse skill remove <name>` and have the skill uninstalled from all client configs
**Plans**: 1 (complete)

### Phase 14: MCP Lifecycle CLI
**Goal**: Users can start, inspect, and configure the MCP server from a single command surface
**Depends on**: Phase 10
**Requirements**: MCP-01, MCP-02, MCP-03
**Success Criteria** (what must be TRUE):
  1. User can run `synapse mcp start` and the MCP server launches in stdio mode, ready for client connections
  2. User can run `synapse mcp status` and see server health (running/stopped), registered tool count, and active config path
  3. User can run `synapse mcp config` and get ready-to-paste JSON for adding Synapse to Claude/Cursor/other MCP clients
**Plans**: 1 (complete)

### Phase 15: Ingest CLI
**Goal**: Users can ingest conversation exports into Synapse memory and KG directly from the command line
**Depends on**: Phase 10
**Requirements**: ING-01, ING-02, ING-03
**Success Criteria** (what must be TRUE):
  1. User can run `synapse ingest <file>` and have the file parsed with auto-detected format (markdown or JSON), with a summary of ingested entries printed
  2. User can override auto-detection with `--format markdown|json` and the specified parser is used
  3. User can assign taxonomy with `--nest <name> --branch <name>` and all ingested entries inherit those values
**Plans**: 1 (complete)

### Phase 16: Hook MCP Tools
**Goal**: AI clients can discover and introspect the hook system through MCP tools, with usage examples in the bundled skill
**Depends on**: Phase 10
**Requirements**: HOOK-01, HOOK-02, HOOK-03
**Success Criteria** (what must be TRUE):
  1. Calling `synapse_hooks_stats` via MCP returns registered hook counts grouped by event type
  2. Calling `synapse_hooks_list_events` via MCP returns all valid hook event names an agent can subscribe to
  3. The bundled skill file documents hook usage with concrete before/after examples that an AI agent can follow
**Plans**: 1 (complete)

### Phase 17: Shell Completions and Polish
**Goal**: Users get tab-completion for all synapse commands in their preferred shell
**Depends on**: Phase 10, Phase 11, Phase 12, Phase 13, Phase 14, Phase 15
**Requirements**: COMP-01, COMP-02, COMP-03
**Success Criteria** (what must be TRUE):
  1. Running `synapse completion bash` outputs a valid bash completion script that, when sourced, provides tab-completion for all subcommands and flags
  2. Running `synapse completion zsh` outputs a valid zsh completion script with the same coverage
  3. Running `synapse completion fish` outputs a valid fish completion script with the same coverage
**Plans**: 1 (complete)

### Phase 18: Binary Deprecation
**Goal**: Old fragmented binaries gracefully redirect users to the unified CLI without breaking existing workflows
**Depends on**: Phase 10, Phase 13
**Requirements**: DEP-01, DEP-02, DEP-03, DEP-04
**Success Criteria** (what must be TRUE):
  1. Running the old `synapse-mcp-setup` binary prints a deprecation warning and redirects to `synapse setup`
  2. Running the old `synapse-mcp-doctor` binary prints a deprecation warning and redirects to `synapse doctor`
  3. Running the old `synapse-mcp-upgrade` binary prints a deprecation warning and redirects to `synapse upgrade`
  4. Running the old `synapse-mcp-install-skill` binary prints a deprecation warning and redirects to `synapse skill install`
**Plans**: 1 (complete)

### Phase 26: Batch Writes, Dedup, Auto valid_from
**Goal**: Users and agents can submit hundreds of KG entities, triples, or memories in a single call and get back a one-line summary instead of per-row noise, with write-time dedup and auto-stamped temporal validity
**Depends on**: Nothing (first phase of v0.2.0; builds on existing KG/memory internals)
**Requirements**: BATCH-01, BATCH-02, BATCH-03, BATCH-04, BATCH-05, BATCH-06
**Success Criteria** (what must be TRUE):
  1. User can call `synapse_kg_add_entities_batch` with up to 500 entities and receive `{created, duplicates, errors}` — no per-row payloads in the response
  2. User can call `synapse_kg_add_triples_batch` with up to 500 triples and receive `{created, duplicates, errors}`; duplicates on `(subject_id, predicate, object_id)` where `valid_to IS NULL` return the existing id instead of inserting a new row
  3. User can call `synapse_memory_store_batch` with up to 100 memories and receive `{created, duplicates, errors}`; any item failure reports `{row_index, error}` while the rest still succeed inside a single transaction (or all roll back if configured strict)
  4. User can query `kg_as_of(timestamp)` on a triple written via batch and get a result back because `valid_from` is auto-stamped to NOW when the caller omits it
**Plans**: 2 plans
- [ ] 26-01-PLAN.md — KG entity/triple batch tools + valid_from auto-stamp + dedup (BATCH-01, 02, 04, 05, 06)
- [ ] 26-02-PLAN.md — Memory store batch tool with fingerprint + semantic dedup + nest/branch pass-through (BATCH-03, 04)

### Phase 27: Terse Response Format
**Goal**: Every write tool can return a minimal response shape, read tools drop empty/duplicate fields, and a measured benchmark shows at least 70% fewer tokens on common write workflows
**Depends on**: Phase 26
**Requirements**: TERSE-01, TERSE-02, TERSE-03, TERSE-04, TERSE-05
**Success Criteria** (what must be TRUE):
  1. User can pass `response_format: "minimal"` to any write tool and receive exactly `{id, ok}` (single) or `{created, duplicates, errors}` (batch) — no other fields
  2. Default format is `verbose` for single writes and `minimal` for batches without the caller specifying anything
  3. Calling `memory_recall` or `search_hybrid` on an entry with empty `nest`/`branch`/`topic`/`feature` returns a response that omits those keys entirely, and drops `raw_score` when `score` is present
  4. A reproducible benchmark conversation run shows at least 70% token reduction on the write portion compared to the pre-Phase-27 baseline
**Plans**: 1 plan
Plans:
- [x] 45-01-PLAN.md — Schema migration v13 + type definitions + write/read/filter paths + MCP tool schemas (ACTOR-01, ACTOR-02, ACTOR-03, ACTOR-04)

### Phase 28: Predicate Cardinality & Contradiction Fix
**Goal**: Contradiction detection only fires for functional predicates; multi-valued and unknown predicates no longer produce false positives, and users can override cardinality via a DB table (absorbs quick task 260409-ohq plan as starting point)
**Depends on**: Phase 27
**Requirements**: CARD-01, CARD-02, CARD-03, CARD-04, CARD-05, CARD-06
**Success Criteria** (what must be TRUE):
  1. User can call `addTriple` twice with the same subject and a multi-valued predicate (e.g. `explores`) with different objects and receive `has_contradiction: false` on both calls
  2. User can call `addTriple` twice with the same subject and a functional predicate (e.g. `status_is`) with different objects and receive `has_contradiction: true` on the second call with the prior triple referenced
  3. User can insert a row `(predicate: 'version_is', cardinality: 'multi')` into `kg_predicate_cardinality` and see subsequent `version_is` writes with different objects return `has_contradiction: false`
  4. Running conversation ingestion against a 50-turn fixture produces zero false-positive contradictions on `mentioned_by` and `co_occurs_with` triples
  5. Inspecting the response of `addTriple` shows the same 12 fields in the same order as pre-Phase-28 — `id, subject_id, predicate, object_id, valid_from, valid_to, confidence, source_memory_id, source_type, created_at, contradictions, has_contradiction`
**Plans**: TBD (260409-ohq PLAN.md serves as starting point)

### Phase 29: Memory <-> KG Auto-Linking
**Goal**: Every memory capture automatically extracts entities, creates KG triples with source_memory_id provenance, and surfaces 1-hop KG neighbors in recall — existing disconnected memories can be backfilled retroactively
**Depends on**: Phase 28
**Requirements**: FUSE-01, FUSE-02, FUSE-03, FUSE-04, FUSE-05, FUSE-06
**Success Criteria** (what must be TRUE):
  1. User can call `memory_store` with `{title, content}` mentioning known entity names and receive back `{memory_id, auto_linked_entities: [...], auto_triples: [...]}` populated
  2. User can query the KG for any auto-created triple and see `source_memory_id` pointing back to the originating memory
  3. User can call `memory_recall` on a topic and see a `related_facts: [...]` field on top-N results containing 1-hop KG neighbors
  4. User can call `nest_tree` after Phase 29 and see non-zero counts against real data (regression fix for current bug where it returns 0)
  5. User can run the one-shot backfill command against an existing DB with disconnected memories and see historical entries linked to matching KG entities
**Plans**: TBD

### Phase 30: Unified Context Primitive `agent_prime`
**Goal**: Agents can call `synapse_agent_prime(task)` once at the start of any task and receive everything needed to start work — relevant memories, KG entities, hot files, recent git changes, and suggested actions — all under 2KB
**Depends on**: Phase 29
**Requirements**: PRIME-01, PRIME-02, PRIME-03, PRIME-04, PRIME-05, PRIME-06
**Success Criteria** (what must be TRUE):
  1. User can call `synapse_agent_prime("add dedup to kg triples")` and receive a response under 2KB containing all five keys: `memories`, `entities`, `files`, `recent_changes`, `suggested_actions`
  2. The `memories` array contains at most 5 semantically relevant entries ranked by embedding similarity to the task
  3. The `entities` array contains at most 10 KG entities related to query terms or to the top memories via 1-hop neighborhood
  4. The `files` array contains at most 5 files ranked by a blend of recent edit time and semantic similarity to the task
  5. The `recent_changes` field contains a summary of git diffs since the most recent memory capture in this project and `suggested_actions` contains 2-4 concrete "start with X" hints
**Plans**: TBD
**UI hint**: no

### Phase 31: Unified Search `find`
**Goal**: Agents can call `synapse_find(query)` once and receive fused results from memory, code, and KG sources with cross-source re-ranking and clear source tagging
**Depends on**: Phase 29 (can run in parallel with Phase 30)
**Requirements**: FIND-01, FIND-02, FIND-03, FIND-04
**Success Criteria** (what must be TRUE):
  1. User can call `synapse_find("dedup strategy")` and receive a single result list drawing from memory entries, code chunks, and KG triples
  2. Each returned item has a `source: "memory" | "code" | "triple"` field indicating its origin
  3. Results are re-ranked across sources using normalized scores, not concatenated by source
  4. Default limit is 10 total and user can pass `limit: N` to adjust it
**Plans**: TBD

### Phase 32: Symbol-Aware Code Intelligence
**Goal**: Agents can perform precise symbol queries (find callers, definitions, implementations, rename preview) across indexed repos using tree-sitter AST parsing, fast enough for interactive use on 1000-file projects
**Depends on**: Phase 26 (runs independently of the retrieval-surface lane)
**Requirements**: SYM-01, SYM-02, SYM-03, SYM-04, SYM-05, SYM-06
**Success Criteria** (what must be TRUE):
  1. User can call `synapse_find_callers("parseConfig")` on an indexed repo and receive every call site with file path, line, and surrounding context
  2. User can call `synapse_find_definition("MemoryStore")` and receive the declaration location(s) across TypeScript, JavaScript, Python, Go, and Rust files
  3. User can call `synapse_find_implementations("Adapter")` on an interface and receive every class/struct/object that implements it
  4. User can call `synapse_rename_preview("old_name", "new_name")` and receive every location that would change without any file being modified
  5. All four symbol queries complete in under 500ms on a 1000-file TypeScript repo
**Plans**: TBD (introduces tree-sitter runtime dep — explicitly allowed for this phase only)

### Phase 33: Temporal Awareness `whats_new`
**Goal**: Agents can ask "what changed since X?" in a single call and receive a structured delta across files, memories, triples, and commits, plus a human-readable summary
**Depends on**: Phase 29
**Requirements**: TEMPO-01, TEMPO-02, TEMPO-03, TEMPO-04
**Success Criteria** (what must be TRUE):
  1. User can call `synapse_whats_new("2026-04-01T00:00:00Z")` and receive `{files_changed, new_memories, new_triples, recent_commits, summary}` with counts and top items
  2. User can call `synapse_whats_new("last_session")` and have it resolve to the most recent `memory_entries.created_at` for the current agent + project scope
  3. Response includes a natural-language summary under 200 characters describing the delta in plain English
  4. User can call `kg_as_of(older_date)` and receive meaningful results because every triple has auto-stamped `valid_from` from Phase 26
**Plans**: TBD

### Phase 34: Agent Surface Slim-Down
**Goal**: Shrink the agent-facing surface — SKILL.md from ~400 to ~50 lines, `memory_store` surface from dozens of fields to just `{title, content}` — via just-in-time help and aggressive auto-inference of project_path, branch_name, nest, branch, topic, and tags
**Depends on**: Phase 29 (runs in parallel with Phase 33)
**Requirements**: SLIM-01, SLIM-02, SLIM-03, SLIM-04, SLIM-05, SLIM-06, SLIM-07
**Success Criteria** (what must be TRUE):
  1. User can run `wc -l SKILL.md` and see it at ~50 lines containing philosophy + a pointer to `synapse_help(task)`
  2. User can call `synapse_help("capture a decision")` and receive a tool list and example tailored to that task type
  3. User can call `memory_store({title, content})` with only those two fields and the stored entry has `project_path`, `branch_name`, `nest`, `branch`, `topic`, and `tags` populated via auto-inference
  4. User can inspect the resulting row in `memory_entries` and see the auto-inferred `nest` and `branch` columns populated — not empty strings — so `nest_tree` and `graph_bridges` have real data to work with
**Plans**: TBD

### Phase 35: Cross-Project Bridges & Backfill
**Goal**: Users can discover cross-project patterns (e.g. "projects A and B share library X") via `graph_bridges` returning real data, and can backfill memories for existing projects under the root that currently have zero entries
**Depends on**: Phase 34 (needs auto-populated nest/branch from SLIM-07)
**Requirements**: BRIDGE-01, BRIDGE-02, BRIDGE-03
**Success Criteria** (what must be TRUE):
  1. User can call `graph_bridges` after Phase 34 has populated nest/branch columns and receive non-zero results when memories span multiple nests
  2. User can run the opt-in backfill scan command against their projects root and see memories auto-created for projects that previously had zero entries
  3. User can query a new tool or enriched `graph_bridges` output and see a cross-project insight like "projects A and B share library X" surfaced explicitly
**Plans**: TBD

### Phase 36: Proactive Hooks
**Goal**: Agents receive high-importance memory hints automatically when they Read or Edit files linked to tracked memories — push, not pull — without blocking the underlying action
**Depends on**: Phase 26 (runs independently after foundation is stable)
**Requirements**: HOOK-07, HOOK-08, HOOK-09
**Success Criteria** (what must be TRUE):
  1. User can read a file that is referenced by a memory with importance >= 70 and see related memory IDs surfaced via the hook response
  2. User can edit a file linked to a high-importance memory and see a flag suggesting the memory may need updating
  3. User can ignore any hook response and still have the Read or Edit complete normally — hooks are non-blocking
**Plans**: TBD

### Phase 37: Behavior Modification `teach`
**Goal**: Users can call `synapse_teach(instruction)` to durably modify future agent behavior by storing a high-importance feedback memory that auto-surfaces in `agent_prime` on semantically matching tasks
**Depends on**: Phase 30 (agent_prime must surface teach memories)
**Requirements**: TEACH-01, TEACH-02, TEACH-03
**Success Criteria** (what must be TRUE):
  1. User can call `synapse_teach("always use rxdart instead of setState")` and see a high-importance memory created with a `teach` tag for auto-retrieval
  2. User can call `synapse_agent_prime("add counter widget")` in a Flutter project and see the teach memory surface in the top-5 recall because the task matches the instruction domain
  3. User can list, update, and delete teach memories via the existing memory CRUD tools — no new verbs are required beyond the initial `teach` call
**Plans**: TBD

### Phase 38: Self-Audit Dashboard
**Goal**: Users can call `synapse_audit()` once and receive a health report covering memory coverage, KG density, orphaned entities, broken bridges, and stale memories — the final integrity check for v0.2.0
**Depends on**: Phase 37 (last phase of v0.2.0; audits everything built before it)
**Requirements**: AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04
**Success Criteria** (what must be TRUE):
  1. User can call `synapse_audit()` and see per-project memory counts (projects with vs without memories)
  2. User can inspect the audit output and see KG density metrics: total entities, total triples, connected component count, orphaned entities, duplicate triples
  3. User can see unpopulated nests (memories with empty nest/branch) and broken bridges surfaced in a dedicated section
  4. User can see stale memories listed — never recalled, low importance, older than 30 days — with IDs for triage
**Plans**: TBD

## Progress

**Execution Order (v0.2.0):**
Lane A (strict sequence): 26 -> 27 -> 28 -> 29
Lane B (after 29, parallel): 30 and 31
Lane C (after 26, independent): 32
Lane D (after 29, parallel): 33 and 34
Lane E (advanced): 35 (after 34), 36 (after 26), 37 (after 30), 38 (last, after all others)

Shortest critical path: 26 -> 27 -> 28 -> 29 -> 30 -> 37 -> 38 (7 phases sequential); phases 31, 32, 33, 34, 35, 36 ride the parallel lanes.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Migration Infrastructure | v1.0 | 1/1 | Complete | 2026-04-08 |
| 2. Knowledge Graph Core | v1.0 | 2/2 | Complete | 2026-04-08 |
| 3. Temporal Validity | v1.0 | 1/1 | Complete | 2026-04-08 |
| 4. Nest/Branch Hierarchy | v1.0 | 2/2 | Complete | 2026-04-08 |
| 5. Graph Traversal | v1.0 | 2/2 | Complete | 2026-04-08 |
| 6. Agent-Scoped Memory | v1.0 | 1/1 | Complete | 2026-04-08 |
| 7. Semantic Dedup | v1.0 | 1/1 | Complete | 2026-04-08 |
| 8. Conversation Ingestion | v1.0 | 1/1 | Complete | 2026-04-08 |
| 9. MCP Tool Registration | v1.0 | 1/1 | Complete | 2026-04-08 |
| 10. CLI Framework Setup | v2.0 | 1/1 | Complete | 2026-04-08 |
| 11. Memory CLI Commands | v2.0 | 1/1 | Complete | 2026-04-08 |
| 12. Knowledge Graph CLI | v2.0 | 1/1 | Complete | 2026-04-08 |
| 13. Skill CLI Commands | v2.0 | 1/1 | Complete | 2026-04-08 |
| 14. MCP Lifecycle CLI | v2.0 | 1/1 | Complete | 2026-04-08 |
| 15. Ingest CLI | v2.0 | 1/1 | Complete | 2026-04-08 |
| 16. Hook MCP Tools | v2.0 | 1/1 | Complete | 2026-04-08 |
| 17. Shell Completions | v2.0 | 1/1 | Complete | 2026-04-08 |
| 18. Binary Deprecation | v2.0 | 1/1 | Complete | 2026-04-08 |
| 19. CLI Foundation | v0.1.0 | 0/0 | Deferred (release/0.1.0) | - |
| 20. CLI Visual Refresh | v0.1.0 | 0/0 | Deferred (release/0.1.0) | - |
| 21. Performance Quick Wins | v0.1.0 | 0/0 | Deferred (release/0.1.0) | - |
| 22. Performance Deep | v0.1.0 | 0/0 | Deferred (release/0.1.0) | - |
| 23. TypeScript Infrastructure | v0.1.0 | 0/0 | Deferred (release/0.1.0) | - |
| 24. TypeScript Migration | v0.1.0 | 0/0 | Deferred (release/0.1.0) | - |
| 25. Library Updates + Ship | v0.1.0 | 0/0 | Deferred (release/0.1.0) | - |
| 26. Batch Writes + Dedup + valid_from | v0.2.0 | 0/2 | Planned | - |
| 27. Terse Response Format | v0.2.0 | 0/0 | Not started | - |
| 28. Predicate Cardinality & Contradiction Fix | v0.2.0 | 0/0 | Not started | - |
| 29. Memory <-> KG Auto-Linking | v0.2.0 | 0/0 | Not started | - |
| 30. Unified Context Primitive agent_prime | v0.2.0 | 0/0 | Not started | - |
| 31. Unified Search find | v0.2.0 | 0/0 | Not started | - |
| 32. Symbol-Aware Code Intelligence | v0.2.0 | 0/0 | Not started | - |
| 33. Temporal Awareness whats_new | v0.2.0 | 0/0 | Not started | - |
| 34. Agent Surface Slim-Down | v0.2.0 | 0/0 | Not started | - |
| 35. Cross-Project Bridges & Backfill | v0.2.0 | 0/0 | Not started | - |
| 36. Proactive Hooks | v0.2.0 | 0/0 | Not started | - |
| 37. Behavior Modification teach | v0.2.0 | 0/0 | Not started | - |
| 38. Self-Audit Dashboard | v0.2.0 | 0/0 | Not started | - |

</details>

## Active: v0.3.0 MCP Spec Compliance & Production Hardening

**Milestone Goal:** Bring Synapse's 72 MCP tools into compliance with the MCP 2025-06-18 spec (annotations, structured output, resource links) and harden production basics (WAL mode, backup/restore, bi-temporal KG, actor-aware memories).

**Parallel Lanes:**
- Lane A (MCP Spec, strict sequence): 39 → 40 → 41
- Lane B (Production, parallel after Lane A): 43 → 44
- Lane C (KG Model): 42 → 45

- [x] **Phase 39: Tool Annotations (MCP Spec)** - Accurate readOnlyHint/destructiveHint/idempotentHint on every tool (completed 2026-04-13)
- [x] **Phase 40: Structured Output (MCP Spec)** - structuredContent + outputSchema alongside text content (completed 2026-04-13)
- [x] **Phase 41: Resource Links (MCP Spec)** - File-returning tools emit resource_link objects (completed 2026-04-13)
- [x] **Phase 42: Bi-Temporal KG Model** - recorded_at transaction time alongside valid_from/valid_to (completed 2026-04-13)
- [x] **Phase 43: WAL Mode & Performance Tuning** - WAL journal_mode + tuned PRAGMAs + regression guard (completed 2026-04-13)
- [x] **Phase 44: Backup & Restore** - synapse_backup / synapse_restore MCP + CLI surface (completed 2026-04-13)
- [x] **Phase 45: Actor-Aware Memories** - actor_id column, filter, and attribution in agent_prime (completed 2026-04-13)

### Phase 39: Tool Annotations (MCP Spec)
**Goal**: All 72 MCP tools have accurate readOnlyHint, destructiveHint, idempotentHint annotations per MCP 2025-06-18 spec AND a test validates the mapping
**Depends on**: Nothing (first phase of v0.3.0)
**Requirements**: ANNOT-01, ANNOT-02, ANNOT-03
**Success Criteria** (what must be TRUE):
  1. Every tool registration includes an annotations object with readOnlyHint, destructiveHint, and idempotentHint
  2. Read-only tools (search, get, list, status) have readOnlyHint: true
  3. Delete tools have destructiveHint: true; write tools have destructiveHint: false
  4. Test validates annotations mapping for all 72 tools
**Plans**: 2 plans
- [x] 39-01-PLAN.md — Fix 9 confirmed annotation mismatches + lift shared annotation constants to tool-utils.ts (ANNOT-01, ANNOT-02)
- [x] 39-02-PLAN.md — New test/mcp-annotations.test.js validates all 72 tools against hardcoded expected map (ANNOT-03)

### Phase 40: Structured Output (MCP Spec)
**Goal**: All tool responses include structuredContent alongside text content, with outputSchema declared for typed parsing
**Depends on**: Phase 39
**Requirements**: STRUCT-01, STRUCT-02, STRUCT-03
**Success Criteria** (what must be TRUE):
  1. Every tool result includes a structuredContent field with the JSON response object
  2. Every tool declares an outputSchema in its registration
  3. Existing response_format: "json" behavior is preserved (backwards compat)
**Plans**: 2 plans
- [x] 40-01-PLAN.md — Shared output archetype library + registrar extension (STRUCT-02, STRUCT-03)
- [x] 40-02-PLAN.md — Per-tool archetype assignment + EXPECTED_OUTPUT_SCHEMAS test (STRUCT-01, STRUCT-02, STRUCT-03)

### Phase 41: Resource Links (MCP Spec)
**Goal**: Three file-returning tools (read_file, search_code, search_files) emit MCP resource_link content blocks alongside their existing inline text responses, with file:// URIs and a test locking the behavior; clients without resource_link support continue working unchanged.
**Depends on**: Phase 40
**Requirements**: RLINK-01, RLINK-02, RLINK-03
**Success Criteria** (what must be TRUE):
  1. read_file, search_code, search_files return resource_link objects pointing to file URIs
  2. Clients can dereference links via MCP resource protocol
  3. Fallback: clients without resource link support still receive inline content
**Plans**: 2 plans
- [x] 41-01-PLAN.md — Mime helper + ToolResult/createToolResponse/toolResult resource_link channel (RLINK-03 framework)
- [x] 41-02-PLAN.md — Wire 3 retrieval handlers (read_file, search_files, search_code) + new mcp-resource-links.test.js (RLINK-01, RLINK-02, RLINK-03)

### Phase 42: Bi-Temporal KG Model
**Goal**: KG triples track both event time (valid_from/valid_to) and transaction time (recorded_at) for full temporal provenance
**Depends on**: Nothing (independent of MCP phases)
**Requirements**: BITEMP-01, BITEMP-02, BITEMP-03
**Success Criteria** (what must be TRUE):
  1. Schema migration adds recorded_at column to kg_triples with default NOW()
  2. kg_as_of supports querying on recorded_at via a new mode parameter
  3. kg_timeline output includes recorded_at for each triple
**Plans**: 2 plans
- [x] 42-01-PLAN.md — Schema v12 migration + KgTriple type + addTriple/addTripleBatch INSERT sites stamp recorded_at (BITEMP-01)
- [x] 42-02-PLAN.md — queryTriplesAsOf mode parameter + getEntityTimeline recorded_at sort + synapse_kg_as_of MCP mode wiring + addTriple 13th-field return + new test/kg-bi-temporal.test.js (BITEMP-01, BITEMP-02, BITEMP-03)

### Phase 43: WAL Mode & Performance Tuning
**Goal**: SQLite databases open in WAL mode with tuned PRAGMAs for production-grade performance
**Depends on**: Nothing (independent)
**Requirements**: WAL-01, WAL-02, WAL-03
**Success Criteria** (what must be TRUE):
  1. All SQLite databases open with PRAGMA journal_mode=WAL
  2. Tuned PRAGMAs applied: cache_size=-64000, synchronous=NORMAL, mmap_size=268435456
  3. Batch insert of 500 triples completes in <2s (regression guard)
**Plans**: 1 plan
- [ ] 43-01-PLAN.md — Shared sqlite-tuning helper + 3 DB open sites + WAL-03 benchmark test (WAL-01, WAL-02, WAL-03)

### Phase 44: Backup & Restore
**Goal**: Users can create and restore SQLite backups via MCP tools and CLI commands
**Depends on**: Phase 43
**Requirements**: BACKUP-01, BACKUP-02, BACKUP-03
**Success Criteria** (what must be TRUE):
  1. synapse_backup creates a point-in-time SQLite backup to a specified path
  2. synapse_restore restores from a backup with integrity check
  3. CLI synapse backup and synapse restore wrap the MCP tools
**Plans**: 1 plan
- [ ] 44-01-PLAN.md — Shared backup service + 2 MCP tools + CLI noun (BACKUP-01, BACKUP-02, BACKUP-03)

### Phase 45: Actor-Aware Memories
**Goal**: Memories track who created them (user, agent, tool) for multi-agent attribution and filtering
**Depends on**: Phase 42
**Requirements**: ACTOR-01, ACTOR-02, ACTOR-03, ACTOR-04
**Success Criteria** (what must be TRUE):
  1. memory_entries has actor_id column (additive migration)
  2. memory_store and memory_store_batch accept actor_id, auto-inferred from agent_id if omitted
  3. memory_recall and memory_list accept actor_id filter
  4. agent_prime surfaces actor attribution in recalled memories
**Plans**: 1 plan
Plans:
- [ ] 45-01-PLAN.md — Schema migration v13 + type definitions + write/read/filter paths + MCP tool schemas (ACTOR-01, ACTOR-02, ACTOR-03, ACTOR-04)

### Phase 46: Modern Interactive CLI

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 45
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 46 to break down)

### Phase 47: Rewrite CI/CD pipelines with auto-publish for beta and stable releases

**Goal:** Replace 5 GitHub Actions workflows with clean CI/CD pipeline: quality checks on all branches (including release/*), OIDC trusted publishing replacing deprecated NPM_TOKEN, and branch-based release tracks (beta from release/*, stable from main)
**Requirements**: CICD-01, CICD-02, CICD-03, CICD-04, CICD-05, CICD-06, CICD-07
**Depends on:** Phase 46
**Success Criteria** (what must be TRUE):
  1. Pushing code to a release/* branch triggers the quality pipeline (lint, typecheck, test)
  2. Pushing a version bump to a release/* branch publishes to npm with @beta tag via OIDC
  3. Pushing a version bump to main publishes to npm with @latest tag via OIDC
  4. CodeQL scans run on release/* branches, not just main
  5. No workflow references the stale beta branch
  6. Quality pipeline runs ~60-120s faster by skipping postinstall for lint/typecheck
**Plans:** 2/2 plans complete

Plans:
- [x] 47-01-PLAN.md — Rewrite quality.yml + update codeql.yml branch triggers (CICD-01, CICD-02, CICD-03)
- [x] 47-02-PLAN.md — Rewrite release.yml with OIDC trusted publishing + release/** triggers (CICD-04, CICD-05, CICD-06, CICD-07)
