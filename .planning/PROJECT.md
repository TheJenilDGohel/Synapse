# Synapse

## What This Is

Synapse is a local-first MCP server that gives AI agents safe, scoped access to code — with hybrid search, semantic indexing, temporal knowledge graph, and persistent memory that never leaves your machine. 72 MCP tools, zero cloud dependencies, pure SQLite.

## Current Milestone: v0.3.0 — MCP Spec Compliance & Production Hardening

**Goal:** Bring Synapse up to the 2025-06-18 MCP spec (structured output, tool annotations, resource links), add production essentials (WAL mode, backup/restore, bi-temporal KG, actor-aware memories), and close competitive gaps identified in the v0.2.0 stress test.

**Target features:**
- Batch write variants for every write tool (`kg_add_triples_batch`, `memory_store_batch`) — turn 300 calls into 3
- Terse response format (`response_format: "minimal"`) — 80% token reduction
- Auto-link memories ↔ KG via entity extraction — populate `source_memory_id`, wire KG into recall
- Predicate cardinality (functional vs multi-valued) — fix contradiction false-positives
- `synapse_agent_prime(task)` unified context primitive — replaces 4 tool calls
- `synapse_find(query)` fused memory + code + KG search
- Symbol-aware code intelligence via tree-sitter — `find_callers`, `find_definition`, `find_implementations`, `rename_preview`
- `synapse_whats_new(since)` — cross-session delta summary
- Slim SKILL.md + auto-infer capture fields — drop 350 lines of agent overhead
- Auto-populate nest/branch on capture — unlock `graph_bridges` and `nest_tree`
- Proactive memory hints via hooks — push, don't pull
- `synapse_teach(instruction)` — durable behavior modifier
- `synapse_audit()` self-audit dashboard

**Deferred to release/0.1.0 branch:**
- v0.1.0 TypeScript migration + perf + CLI polish (phases 19-25) — ships separately on its own branch

**Provenance:**
- Driven by 2026-04-09 dogfooding retrospective exposing memory-KG disconnect, duplicate triples, empty nest/branch, 400-line SKILL.md token cost
- Absorbs pending quick task `260409-ohq` (contradiction detection) into Phase 28

## Core Value

A single local MCP server that handles both code retrieval AND rich structured memory — no cloud dependencies, no external databases, pure SQLite.

## Requirements

### Validated

- Memory entries with CRUD, revision history, importance/confidence scoring — existing
- Embedding-based semantic recall via HuggingFace MiniLM-L6-v2 — existing
- Flat memory relations (source→target, type) — existing
- Event capture with signal scoring and auto-promotion — existing
- Multi-project scoping (project_path, branch_name, root_path) — existing
- SQLite-backed storage via node:sqlite — existing
- Code retrieval with AST chunking, BM25+vector hybrid search — existing
- MCP tool exposure for all memory and retrieval operations — existing

### Active

- [ ] Batch write variants for every write tool (`kg_add_entities_batch`, `kg_add_triples_batch`, `memory_store_batch`) with summary-only responses
- [ ] Write-time dedup on `(subject_id, predicate, object_id)` where `valid_to IS NULL` — return existing ID on conflict
- [ ] Auto-stamp `valid_from = now` on every KG triple to enable `kg_as_of` queries
- [ ] `response_format: "minimal"` on every write tool, default for batches
- [ ] Predicate cardinality (functional vs multi-valued) with hardcoded default + DB override table
- [ ] Auto-link memories to KG entities via entity extraction during `capture_outcome` / `memory_store`
- [ ] Wire KG 1-hop neighbors into recall as `related_facts`
- [ ] `synapse_agent_prime(task)` — unified context primitive returning memories + entities + files + recent changes + suggested actions
- [ ] `synapse_find(query)` — fused memory + code + KG search with cross-source re-ranking
- [ ] Tree-sitter AST parsing for symbol-aware code intelligence (`find_callers`, `find_definition`, `find_implementations`, `rename_preview`)
- [ ] `synapse_whats_new(since)` — cross-session delta summary
- [ ] Slim SKILL.md (~50 lines) + `synapse_help(task)` for just-in-time tool guidance
- [ ] Auto-infer `project_path`, `branch_name`, `nest`, `branch`, `topic`, `tags` on capture — reduce agent-facing surface to `{title, content}`
- [ ] Auto-populate nest/branch from project path and content classification
- [ ] Proactive memory suggestions via Read-file hooks
- [ ] `synapse_teach(instruction)` — durable behavior modifier via high-importance feedback memory
- [ ] `synapse_audit()` — self-audit dashboard for coverage, density, orphans, stale memories

### Deferred (release/0.1.0 branch)

- [ ] CLI foundation + visual refresh (shared ANSI module, ora spinners)
- [ ] Performance quick wins + deep (composite indexes, async vector index, sqlite-vec)
- [ ] TypeScript infrastructure + migration (tsconfig, 94-file conversion)
- [ ] Library updates and v0.1.0 release

### Out of Scope

- Cloud/hosted deployment — Synapse is local-first by design
- LLM-based summarization — store verbatim, avoid lossy compression (lesson from MemPalace AAAK regression)
- ChromaDB integration — SQLite+sqlite-vec is lighter and more stable
- Python runtime — Node.js/JavaScript only
- Real-time streaming — batch operations sufficient for MCP

## Context

- Synapse is a published npm package (v0.0.6-beta.1) with existing users
- All changes must be backwards-compatible with existing memory_entries and memory_relations tables
- Schema is currently at version 5 — new tables/migrations must increment cleanly
- Existing MCP tools (19 registered) must continue working — new tools are additive
- MemPalace achieves 96.6% recall on LongMemEval with raw verbatim mode; their 34% retrieval boost comes from wing+room metadata filtering
- MemPalace's temporal knowledge graph uses SQLite triples — similar to our stack, easy to adapt
- Current embedding service (MiniLM-L6-v2) is sufficient for semantic dedup — no new dependencies needed

## Constraints

- **Tech stack**: Node.js 22+, TypeScript, SQLite via node:sqlite
- **Backwards compat**: Existing tables/tools must not break — additive migrations only
- **File size**: Keep files under 500 lines per CLAUDE.md rules
- **Dependencies**: Minimal new deps — ora (spinner), typescript, @types/node as devDeps
- **Schema**: Must migrate cleanly with rollback safety
- **Build**: Must compile TS → JS for npm publish (ship compiled JS)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SQLite triples over Neo4j/graph DB | Matches existing stack, zero new deps, MemPalace proves it works | -- Pending |
| Additive schema migrations only | Protect existing users' data | -- Pending |
| Verbatim storage over LLM summaries | MemPalace showed AAAK compression regresses recall 96.6→84.2% | -- Pending |
| Nest/branch as metadata columns, not separate tables | Simpler queries, easier to filter, proven retrieval boost with metadata filtering | -- Pending |
| Nest/branch naming over wing/room | Original Synapse identity — nests are organic, layered, interconnected — not a copy of MemPalace's palace metaphor | -- Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-09 after milestone v0.2.0 initialization*
