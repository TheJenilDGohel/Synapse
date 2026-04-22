# Domain Pitfalls

**Domain:** AI memory system with knowledge graph (local-first MCP server)
**Researched:** 2026-04-08

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Lossy Compression of Stored Memories

**What goes wrong:** Summarizing, abbreviating, or compressing stored text to save space causes retrieval quality to collapse.
**Why it happens:** Natural instinct to reduce storage by summarizing. MemPalace's AAAK mode does exactly this (regex entity codes + keyword frequency + 55-char sentence truncation).
**Consequences:** MemPalace benchmark dropped from 96.6% to 84.2% recall -- a 12.4 percentage-point regression. The compressed text cannot be reconstructed, making the loss permanent.
**Prevention:** Store ALL text verbatim. Apply the 20KB content limit already in the codebase. Never add a summarization step to the ingestion pipeline.
**Detection:** If you find yourself adding a "compress" or "summarize" function anywhere in the memory pipeline, stop.

### Pitfall 2: Breaking Backwards Compatibility with Schema Migrations

**What goes wrong:** A migration that alters or drops existing columns/tables causes data loss for existing users upgrading from v5.
**Why it happens:** Refactoring temptation -- "let's rename topic to room" or "let's merge memory_relations into kg_triples."
**Consequences:** Users lose stored memories on upgrade. Trust in the tool evaporates.
**Prevention:** ALL migrations must be additive: `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ADD COLUMN` wrapped in try/catch. Never `DROP TABLE`, `DROP COLUMN`, or `ALTER TABLE RENAME COLUMN`. The existing v2-v5 migration pattern demonstrates this correctly.
**Detection:** Code review: any migration without `IF NOT EXISTS` or without a try/catch on ALTER TABLE is a red flag.

### Pitfall 3: Unbounded Recursive CTE in Graph Traversal

**What goes wrong:** A graph traversal query without depth limits or cycle prevention runs indefinitely or returns massive result sets.
**Why it happens:** Graphs naturally contain cycles (A works_on B, B depends_on C, C influences A). SQLite recursive CTEs will loop forever without explicit guards.
**Consequences:** SQLite locks up, the MCP server hangs, the user's IDE freezes.
**Prevention:** Hard cap on `maxHops` (default 2, max 5). Cycle prevention via path tracking in the CTE (`w.path NOT LIKE '%' || t.object_id || '%'`). LIMIT on the final SELECT.
**Detection:** Any recursive CTE without a `WHERE w.depth < ?` guard is a critical bug.

### Pitfall 4: Semantic Dedup Threshold Too Aggressive

**What goes wrong:** Setting the cosine similarity threshold below 0.9 causes distinct-but-similar memories to be silently dropped.
**Why it happens:** Optimizing for storage efficiency over recall completeness.
**Consequences:** Agent cannot recall information it previously stored because dedup ate it. This is the same class of error as AAAK compression -- information loss masquerading as optimization.
**Prevention:** Default threshold of 0.92. Only exact or near-exact semantic duplicates get caught. Dedup returns the matching entry ID so the caller knows what happened.
**Detection:** If users report "I stored X but recall can't find it," check the dedup gate first.

## Moderate Pitfalls

### Pitfall 1: Entity ID Collision in Knowledge Graph

**What goes wrong:** Two different entities with similar names get the same slug ID (e.g., "John Smith" from two different projects both become `john_smith`).
**Prevention:** Include scope (wing or project_path) in entity ID generation: `slug_{wing}_{name}`. Or use UUID-based IDs and treat name as a display field. The MemPalace approach (pure slug from name) is fragile in multi-project setups.

### Pitfall 2: Wing/Room Assignment Drift

**What goes wrong:** Memories accumulate in the default wing/room ("" / "") because agents don't consistently provide taxonomy metadata.
**Prevention:** When scope.project_path is set but wing is empty, auto-derive wing from project_path. When topic is set but room is empty, auto-derive room from topic. Provide `taxonomy.deriveDefaults(scope)` helper.

### Pitfall 3: Conversation Ingestion Re-Processing

**What goes wrong:** The same conversation file gets ingested multiple times, creating duplicate memories despite the dedup gate (because content is split into different chunks on re-parse).
**Prevention:** The `conversation_sources` table tracks (source_path, file_hash). Check BEFORE parsing. If the hash matches, skip entirely. Only re-ingest if file content actually changed (new hash).

### Pitfall 4: Triple Temporal Overlap

**What goes wrong:** Two triples with the same subject-predicate-object have overlapping validity windows, making as_of queries return contradictory results.
**Prevention:** On triple insert, check for existing active triples with the same SPO. If one exists and is still valid (valid_to IS NULL), invalidate it before inserting the new one. Or return an error asking the caller to invalidate the old one first.

### Pitfall 5: Large Embedding JSON in memory_entries

**What goes wrong:** With wing/room + semantic dedup, recall queries fetch more rows and parse more JSON, slowing down.
**Prevention:** The dedup query only needs `id, title, embedding_json` -- use a SELECT that excludes content. The existing recall query already doesn't select embedding_json. Keep these patterns.

## Minor Pitfalls

### Pitfall 1: MCP Tool Naming Conflicts

**What goes wrong:** New tool names collide with existing tools or violate naming conventions.
**Prevention:** All tools use `synapse_` prefix. Knowledge graph tools use `synapse_kg_` prefix. Check existing 19 tools before adding names.

### Pitfall 2: NULL vs Empty String in Wing/Room

**What goes wrong:** SQLite treats NULL and '' differently in queries. Mixed usage causes filter misses.
**Prevention:** Always use `NOT NULL DEFAULT ''` for wing/room columns (matches existing pattern for scope_project_path, topic, feature). Never store NULL.

### Pitfall 3: Agent Scope Leakage

**What goes wrong:** An agent accidentally queries another agent's memories by omitting its wing filter.
**Prevention:** Agent diary entries are in a separate table (agent_diary), so shared memory_entries queries never return them. For wing-based isolation of regular memories, the agent must include its wing in recall -- this is a convention, not an enforcement. Document clearly that wing isolation is advisory, not mandatory.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Schema v6 (KG tables) | Entity ID collision across projects | Include wing/project in entity slug |
| Schema v7 (wing/room) | Empty defaults reduce effectiveness | Auto-derive from scope |
| Semantic dedup | Threshold too aggressive | Default 0.92, configurable, log skipped entries |
| Graph traversal | Unbounded recursion | maxHops=2 default, hard cap at 5 |
| Conversation ingestion | Re-processing duplicates | file_hash check before parsing |
| Agent scopes | Scope leakage | Separate diary table, advisory wing filter |
| MCP tools | Too many tools overwhelm agents | Group logically, consider composite tools |

## Sources

- [MemPalace AAAK regression analysis](https://github.com/lhl/agentic-memory/blob/main/ANALYSIS-mempalace.md) -- 96.6% to 84.2% recall drop from compression (HIGH confidence)
- [SQLite recursive CTE cycle handling](https://sqlite.org/lang_with.html) -- depth limits and path tracking (HIGH confidence)
- [SemDeDup threshold analysis](https://openreview.net/forum?id=IRSesTQUtb) -- dedup threshold trade-offs (MEDIUM confidence)
- Existing codebase -- migration pattern, NULL handling conventions (HIGH confidence)
