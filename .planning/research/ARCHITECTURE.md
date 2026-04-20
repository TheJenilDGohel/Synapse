# Architecture Patterns

**Domain:** AI memory system with knowledge graph (MCP server, SQLite-backed)
**Researched:** 2026-04-08
**Confidence:** HIGH (existing codebase fully analyzed, MemPalace reference architecture verified)

## Recommended Architecture

### Design Principle: Additive Layers on Existing Core

The existing `memory_entries` + `memory_relations` tables remain the authoritative store for durable memories. New capabilities (knowledge graph triples, taxonomy, agent scopes, conversation ingestion, semantic dedup) are **additive tables and modules** that reference `memory_entries` via foreign keys where meaningful but operate independently where needed.

This matches the PROJECT.md constraint: "Existing tables/tools must not break -- additive migrations only."

```
                  MCP Tool Layer (src/mcp/tools/)
                  +-----------+-----------+-----------+
                  | memory-   | memory-   | graph-    |
                  | store.js  | workflow  | tools.js  |  <-- NEW
                  +-----------+-----------+-----------+
                       |            |            |
                  Service Layer (src/services/memory/)
                  +--------+--------+--------+--------+
                  |service | store  |relation| graph  |
                  |   .js  |  .js   |  s.js  |  .js   |  <-- NEW
                  +--------+--------+--------+--------+
                  |entries | recall | event- | kg.js  |  <-- NEW
                  |  .js   |  .js   |capture |        |
                  +--------+--------+--------+--------+
                  | ingest.js (conversation pipeline)  |  <-- NEW
                  | dedup.js  (semantic dedup gate)     |  <-- NEW
                  | taxonomy.js (wing/room hierarchy)   |  <-- NEW
                  +------------------------------------+
                  |        schema.js (v5 -> v8+)       |
                  |        adapter.js (unchanged)      |
                  +------------------------------------+
                  |        SQLite (node:sqlite)        |
                  +------------------------------------+
```

## Component Boundaries

### Existing Components (unchanged)

| Component | File(s) | Responsibility | Stays As-Is |
|-----------|---------|---------------|-------------|
| MemoryService | service.js | Facade routing to MemoryStore | Yes -- gains new method forwards |
| MemoryStore | store.js | Init, backend selection, schema orchestration | Yes -- imports new modules |
| Entries | entries.js | CRUD for memory_entries + revisions | Yes |
| Relations | relations.js | Flat source->target relation CRUD | Yes -- NOT replaced by triples |
| Recall | recall.js | Token-overlap + scope-aware ranked retrieval | Yes -- extended with taxonomy filters |
| EventCapture | event-capture.js | Signal scoring, auto-promotion | Yes -- wires into dedup gate |
| Schema | schema.js | DDL + migrations v0-v5 | Yes -- extended with v6, v7, v8 |
| Adapter | adapter.js | NodeSqliteAdapter (exec/run/get/all) | No changes |
| EmbeddingService | retrieval/embedding/service.js | HuggingFace MiniLM-L6-v2 embeddings | No changes -- reused by dedup |

### New Components

| Component | File | Responsibility | Depends On |
|-----------|------|---------------|------------|
| **KnowledgeGraph** | kg.js | Entity + triple CRUD, temporal validity, as_of queries | adapter, schema |
| **GraphTraversal** | graph.js | Multi-hop walks via recursive CTE, tunnel discovery | adapter, kg.js |
| **Taxonomy** | taxonomy.js | Wing/room metadata on memory_entries, hierarchy enforcement | adapter, schema |
| **ConversationIngest** | ingest.js | Parse Markdown/JSON/Slack -> chunks -> memory_entries + triples | entries.js, kg.js, dedup.js |
| **SemanticDedup** | dedup.js | Embedding similarity gate before storage | EmbeddingService, adapter |
| **AgentScopes** | scopes.js | Per-agent namespace isolation + diary entries | adapter, schema |
| **GraphTools** | mcp/tools/graph-tools.js | MCP tool registration for KG, traversal, ingest, taxonomy | all new services |

## New Tables and Their Relationships to Existing Tables

### Schema v6: Knowledge Graph Core

```sql
-- Entities in the knowledge graph. Can reference a memory_entry but don't have to.
CREATE TABLE IF NOT EXISTS kg_entities (
  id TEXT PRIMARY KEY,                     -- slug: 'alice_obrien', 'project_synapse'
  name TEXT NOT NULL,                      -- human-readable: 'Alice O'Brien'
  entity_type TEXT NOT NULL DEFAULT 'concept', -- person, project, concept, technology, etc.
  properties_json TEXT NOT NULL DEFAULT '{}',  -- extensible JSON blob
  memory_id TEXT,                          -- optional FK to memory_entries.id
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Temporal triples: subject -[predicate]-> object with validity window
CREATE TABLE IF NOT EXISTS kg_triples (
  id TEXT PRIMARY KEY,                     -- triple_<uuid>
  subject_id TEXT NOT NULL,                -- FK to kg_entities.id
  predicate TEXT NOT NULL,                 -- 'works_on', 'depends_on', 'contradicts'
  object_id TEXT NOT NULL,                 -- FK to kg_entities.id
  valid_from TEXT,                         -- ISO date, NULL = always valid
  valid_to TEXT,                           -- ISO date, NULL = still valid
  confidence REAL NOT NULL DEFAULT 1.0,
  source_memory_id TEXT,                   -- FK to memory_entries.id (provenance)
  source_type TEXT NOT NULL DEFAULT 'manual', -- manual, ingestion, auto-extract
  created_at TEXT NOT NULL,
  FOREIGN KEY (subject_id) REFERENCES kg_entities(id),
  FOREIGN KEY (object_id) REFERENCES kg_entities(id)
);

CREATE INDEX IF NOT EXISTS idx_kg_entities_type ON kg_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_kg_entities_memory ON kg_entities(memory_id);
CREATE INDEX IF NOT EXISTS idx_kg_triples_subject ON kg_triples(subject_id);
CREATE INDEX IF NOT EXISTS idx_kg_triples_object ON kg_triples(object_id);
CREATE INDEX IF NOT EXISTS idx_kg_triples_predicate ON kg_triples(predicate);
CREATE INDEX IF NOT EXISTS idx_kg_triples_valid ON kg_triples(valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_kg_triples_source ON kg_triples(source_memory_id);
```

**Relationship to existing tables:** `kg_entities.memory_id` optionally links an entity to a `memory_entries` row. `kg_triples.source_memory_id` tracks provenance. The `memory_relations` table remains for simple pairwise links; `kg_triples` is the structured, temporal, predicate-rich alternative.

### Schema v7: Taxonomy + Agent Scopes

```sql
-- Wing/room columns on memory_entries (ALTER TABLE, not new table)
-- Wing = top-level container (project, person, domain)
-- Room = topic within a wing (auth, deployment, debugging)
ALTER TABLE memory_entries ADD COLUMN wing TEXT NOT NULL DEFAULT '';
ALTER TABLE memory_entries ADD COLUMN room TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_memory_entries_wing_room
  ON memory_entries(wing, room);

-- Agent-scoped namespaces
CREATE TABLE IF NOT EXISTS agent_scopes (
  agent_id TEXT NOT NULL,                  -- unique agent identifier
  agent_name TEXT NOT NULL DEFAULT '',
  wing TEXT NOT NULL DEFAULT '',           -- agent's assigned wing
  created_at TEXT NOT NULL,
  last_active_at TEXT NOT NULL,
  PRIMARY KEY (agent_id)
);

-- Agent diary entries (separate from memory_entries for isolation)
CREATE TABLE IF NOT EXISTS agent_diary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  content TEXT NOT NULL,
  tags_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agent_scopes(agent_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_diary_agent ON agent_diary(agent_id, created_at DESC);
```

**Relationship to existing tables:** `wing` and `room` are metadata columns added directly to `memory_entries`, following MemPalace's proven pattern. They participate in recall filtering but don't replace `scope_project_path` or `topic` -- they add a second organizational axis. `agent_scopes` is standalone. `agent_diary` references `agent_scopes` but not `memory_entries` -- diary entries are agent-private scratchpad, not shared knowledge.

### Schema v8: Conversation Sources

```sql
-- Track ingested conversation sources to prevent re-processing
CREATE TABLE IF NOT EXISTS conversation_sources (
  id TEXT PRIMARY KEY,                     -- source_<hash>
  source_path TEXT NOT NULL,               -- file path or URI
  source_type TEXT NOT NULL,               -- 'markdown', 'json', 'slack_export'
  file_hash TEXT NOT NULL,                 -- SHA-256 of file content
  total_turns INTEGER NOT NULL DEFAULT 0,
  total_memories_created INTEGER NOT NULL DEFAULT 0,
  total_triples_created INTEGER NOT NULL DEFAULT 0,
  ingested_at TEXT NOT NULL,
  UNIQUE(source_path, file_hash)
);

CREATE INDEX IF NOT EXISTS idx_conv_sources_path ON conversation_sources(source_path);
```

**Relationship to existing tables:** `conversation_sources` is a processing log. Ingested memories flow into `memory_entries` (with `source_type = 'ingestion'` and `source_ref` pointing to source path). Extracted triples flow into `kg_triples` (with `source_type = 'ingestion'`).

## Data Flow Diagrams

### Flow 1: Triple CRUD (Knowledge Graph Core)

```
Agent/MCP Client
    |
    v
graph-tools.js (MCP layer)
    |
    v
kg.js
    |-- addEntity(name, type, properties) --> INSERT kg_entities
    |-- addTriple(subject, predicate, object, {valid_from, valid_to}) --> INSERT kg_triples
    |-- invalidateTriple(id, valid_to) --> UPDATE kg_triples SET valid_to = ?
    |-- queryAsOf(entity, date) --> SELECT ... WHERE valid_from <= ? AND (valid_to IS NULL OR valid_to >= ?)
    |-- getEntity(id) --> SELECT + JOIN outgoing/incoming triples
    v
adapter.js --> SQLite
```

### Flow 2: Graph Traversal (Multi-Hop Walks)

```
Agent requests: "What does Alice work on, and what depends on those projects?"
    |
    v
graph-tools.js --> graph.js.traverse({
  startEntity: 'alice',
  predicates: ['works_on'],       -- first hop filter
  maxHops: 2,
  asOf: '2026-04-08',             -- temporal filter
  direction: 'outgoing'
})
    |
    v
graph.js builds recursive CTE:

  WITH RECURSIVE walk(entity_id, depth, path) AS (
    SELECT ?, 0, ?                                     -- seed
    UNION ALL
    SELECT t.object_id, w.depth + 1, w.path || '/' || t.object_id
      FROM walk w
      JOIN kg_triples t ON t.subject_id = w.entity_id
     WHERE w.depth < ?                                 -- max hops
       AND (t.valid_from IS NULL OR t.valid_from <= ?)
       AND (t.valid_to IS NULL OR t.valid_to >= ?)
       AND w.path NOT LIKE '%' || t.object_id || '%'   -- cycle prevention
  )
  SELECT DISTINCT e.*, w.depth, w.path
    FROM walk w
    JOIN kg_entities e ON e.id = w.entity_id
   ORDER BY w.depth, e.name;

    |
    v
Returns: [{entity, depth, path, triples_at_hop}]
```

**Performance note:** SQLite recursive CTEs handle 2-3 hop traversals efficiently. The cycle prevention via path string avoids infinite loops. For the expected graph size (hundreds to low thousands of entities), this is fast enough -- no need for a dedicated graph DB.

### Flow 3: Conversation Ingestion Pipeline

```
User provides: file path + source_type + optional wing/room assignment
    |
    v
graph-tools.js --> ingest.js.ingestConversation({
  filePath: '/path/to/chat.md',
  sourceType: 'markdown',
  wing: 'project-x',
  room: 'architecture'
})
    |
    v
ingest.js:
  1. READ file, compute SHA-256 hash
  2. CHECK conversation_sources for (path, hash) -- skip if already ingested
  3. PARSE based on sourceType:
     |
     |-- markdown: split on turn markers (## User, ## Assistant, ---, timestamps)
     |-- json: parse {role, content, timestamp} array (Claude, ChatGPT export format)
     |-- slack_export: parse Slack JSON with user mapping
     |
  4. For each turn/chunk (respecting 20KB content limit):
     |
     |-- a. Run through dedup.js gate (see Flow 5)
     |-- b. If not duplicate:
     |       storeEntry({
     |         kind: 'conversation',
     |         title: derived from first sentence,
     |         content: verbatim turn text,          -- NO summarization (AAAK lesson)
     |         source_type: 'ingestion',
     |         source_ref: filePath,
     |         wing: assigned_wing,
     |         room: assigned_room,
     |         tags: [sourceType, speaker_role]
     |       })
     |
     |-- c. Extract entities/triples (rule-based, not LLM):
     |       - Proper nouns as entities
     |       - "X uses/depends_on/built_with Y" patterns
     |       - Temporal markers -> valid_from/valid_to
     |       --> kg.addEntity(), kg.addTriple()
     |
  5. UPDATE conversation_sources with counts
    |
    v
Returns: { source_id, turns_processed, memories_created, triples_created, duplicates_skipped }
```

**Critical design decision: Rule-based entity extraction, not LLM-based.** The PROJECT.md says "No LLM-based summarization" and the system has no LLM access. Use regex/heuristic patterns for entity/triple extraction. This limits extraction quality but avoids new dependencies and keeps the system offline-first.

### Flow 4: Recall with Taxonomy Filtering

```
Existing recall flow (recall.js) gains two new filter dimensions:
    |
    v
recall.js (modified):
  - Existing filters: status, scope_project_path, topic, kind
  - NEW filters: wing, room
  - If wing provided: filters.push('(wing = ? OR wing = "")'); params.push(wing);
  - If room provided: filters.push('(room = ? OR room = "")'); params.push(room);
  - scoreScopeMatch() gains +3 for wing match, +2 for room match

This is the "34% retrieval improvement" from MemPalace's approach --
wing/room metadata filtering narrows the candidate set before scoring.
```

### Flow 5: Semantic Dedup Gate

```
Before any storeEntry() call:
    |
    v
dedup.js.checkDuplicate({
  title, summary, content,
  projectPath,                        -- scope the check
  wing, room,                         -- narrow further if available
  threshold: 0.92                     -- cosine similarity threshold
})
    |
    v
  1. Compute embedding via EmbeddingService.embed(title + summary + content[:500])
  2. Query recent entries in same scope:
     SELECT id, title, embedding_json
       FROM memory_entries
      WHERE scope_project_path = ?
        AND wing = ? AND room = ?        -- if provided
        AND embedding_json IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 50
  3. For each candidate:
     cosine = cosineSimilarity(newEmbedding, candidateEmbedding)
     if cosine >= threshold:
       return { isDuplicate: true, matchId: candidate.id, similarity: cosine }
  4. Also check fingerprint (existing mechanism):
     return { isDuplicate: false }

Integration point: entries.js.storeEntry() already has fingerprint-based dedup.
Semantic dedup runs BEFORE fingerprint check, catches near-duplicates that
differ in wording but convey the same information.
```

### Flow 6: Agent-Scoped Memory

```
Agent registers or is auto-registered on first use:
    |
    v
scopes.js.ensureAgent(agentId, agentName)
    --> INSERT OR IGNORE INTO agent_scopes
    --> UPDATE agent_scopes SET last_active_at = NOW()

Agent writes diary:
    |
    v
scopes.js.addDiaryEntry(agentId, content, tags)
    --> INSERT INTO agent_diary

Agent recalls own memories:
    |
    v
The agent passes its agentId as a wing filter:
  recall({ query, wing: `agent:${agentId}` })
  --> Only returns memories tagged with that agent's wing

Agent reads diary:
    |
    v
scopes.js.getDiary(agentId, { limit, offset })
    --> SELECT FROM agent_diary WHERE agent_id = ? ORDER BY created_at DESC
```

## Query Patterns

### Temporal Filtering (as_of queries)

```sql
-- "What was true about entity X on date D?"
SELECT t.*, s.name AS subject_name, o.name AS object_name
  FROM kg_triples t
  JOIN kg_entities s ON s.id = t.subject_id
  JOIN kg_entities o ON o.id = t.object_id
 WHERE t.subject_id = ?
   AND (t.valid_from IS NULL OR t.valid_from <= ?)
   AND (t.valid_to IS NULL OR t.valid_to >= ?)
 ORDER BY t.created_at DESC;
```

### Invalidation (fact expires)

```sql
-- "X no longer works_on Y as of today"
UPDATE kg_triples
   SET valid_to = ?
 WHERE subject_id = ? AND predicate = ? AND object_id = ?
   AND valid_to IS NULL;
```

### Timeline Query

```sql
-- "Show me all facts about X in chronological order"
SELECT t.*, s.name AS subject_name, o.name AS object_name
  FROM kg_triples t
  JOIN kg_entities s ON s.id = t.subject_id
  JOIN kg_entities o ON o.id = t.object_id
 WHERE t.subject_id = ? OR t.object_id = ?
 ORDER BY COALESCE(t.valid_from, t.created_at) ASC
 LIMIT 100;
```

### Wing/Room Scoped Recall

```sql
-- Recall with taxonomy (added to existing recall.js query)
SELECT *
  FROM memory_entries
 WHERE status = 'active'
   AND (wing = ? OR wing = '')
   AND (room = ? OR room = '')
   AND scope_project_path = ?
 ORDER BY importance DESC, updated_at DESC
 LIMIT 500;
```

## Patterns to Follow

### Pattern 1: Module-per-Concern with Adapter Passthrough

**What:** Each new capability is a single .js file exporting pure functions that accept `(adapter, ...)` as first argument, matching the existing `relations.js`, `recall.js`, `event-capture.js` pattern.

**Why:** Consistent with codebase. Easy to test. No class hierarchies. MemoryStore wires them together.

```javascript
// kg.js
export async function addEntity(adapter, { name, type, properties }) { ... }
export async function addTriple(adapter, { subjectId, predicate, objectId, validFrom, validTo, confidence, sourceMemoryId }) { ... }
export async function invalidateTriple(adapter, tripleId, validTo) { ... }
export async function queryAsOf(adapter, entityId, asOfDate) { ... }
export async function getEntityWithTriples(adapter, entityId) { ... }
```

### Pattern 2: Schema Migration Chaining

**What:** New migrations append to `runMigrations()` in schema.js with `if (currentVersion < N)` guards, same as existing v2-v5 pattern.

```javascript
if (currentVersion < 6) {
  await adapter.exec(`CREATE TABLE IF NOT EXISTS kg_entities (...)`);
  await adapter.exec(`CREATE TABLE IF NOT EXISTS kg_triples (...)`);
  // indexes...
}
if (currentVersion < 7) {
  try { await adapter.exec(`ALTER TABLE memory_entries ADD COLUMN wing TEXT NOT NULL DEFAULT ''`); } catch {}
  try { await adapter.exec(`ALTER TABLE memory_entries ADD COLUMN room TEXT NOT NULL DEFAULT ''`); } catch {}
  await adapter.exec(`CREATE TABLE IF NOT EXISTS agent_scopes (...)`);
  await adapter.exec(`CREATE TABLE IF NOT EXISTS agent_diary (...)`);
  // indexes...
}
if (currentVersion < 8) {
  await adapter.exec(`CREATE TABLE IF NOT EXISTS conversation_sources (...)`);
  // indexes...
}
```

### Pattern 3: MCP Tool Registration via Grouped Registrar

**What:** New tools go in `src/mcp/tools/graph-tools.js` following the exact pattern of `memory-store.js` -- a single exported `registerGraphTools({ registerJsonTool, schemas, memory })` function.

**Why:** Index.js just adds one export line. Tool naming follows existing `synapse_` prefix convention.

### Pattern 4: Temporal NULL Semantics

**What:** `valid_from IS NULL` means "always been true." `valid_to IS NULL` means "still true." This matches MemPalace's proven approach and avoids sentinel dates.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Replacing memory_relations with kg_triples

**What:** Temptation to migrate existing `memory_relations` into `kg_triples` and drop the old table.

**Why bad:** Breaks backwards compatibility. Existing MCP tools (`synapse_memory_add_relation`, `synapse_memory_related`) are in use. The two tables serve different purposes: `memory_relations` is simple pairwise linking between memories; `kg_triples` is structured knowledge with temporal validity between entities.

**Instead:** Keep both. `memory_relations` for quick memory-to-memory links. `kg_triples` for knowledge graph facts. They coexist.

### Anti-Pattern 2: LLM-Dependent Entity Extraction

**What:** Using an LLM to extract entities and triples from ingested conversations.

**Why bad:** Synapse is offline-first, has no LLM runtime, and the PROJECT.md explicitly excludes "LLM-based summarization." Adding LLM dependency would break the zero-cloud constraint.

**Instead:** Rule-based extraction (regex patterns for proper nouns, dependency verb patterns, temporal markers). Accept lower extraction quality in exchange for zero dependencies.

### Anti-Pattern 3: Separate Database for Knowledge Graph

**What:** Creating a second SQLite file for KG tables.

**Why bad:** Complicates transactions, backup, and the single-file simplicity that makes Synapse easy to deploy.

**Instead:** All new tables in the same database file alongside `memory_entries`. One backup = everything.

### Anti-Pattern 4: Deep Traversal as Default

**What:** Allowing unbounded recursive CTE depth in graph traversal.

**Why bad:** SQLite recursive CTEs become slow past 4-5 hops on larger graphs. Cycle detection via path strings becomes expensive.

**Instead:** Hard cap of `maxHops = 3` (configurable to 5 max). Default to 2 hops. This covers 95% of useful traversals in an agent memory context.

### Anti-Pattern 5: Aggressive Dedup Threshold

**What:** Setting semantic dedup threshold too low (e.g., 0.7 cosine similarity).

**Why bad:** Similar but distinct memories get silently dropped. MemPalace's regression from 96.6% to 84.2% recall was caused by lossy compression (AAAK). Aggressive dedup is the same mistake.

**Instead:** Conservative threshold of 0.92+ cosine similarity. Only flag near-exact semantic duplicates. Better to store one too many than lose information.

## Suggested Build Order (Dependencies Between Components)

The build order is driven by data dependencies and testability.

```
Phase 1: Schema + Knowledge Graph Core
  schema.js v6 (kg_entities, kg_triples tables + indexes)
    --> kg.js (entity CRUD, triple CRUD, temporal queries)
      --> No dependency on other new components
      --> Can be tested in isolation with direct adapter calls

Phase 2: Taxonomy (Wing/Room)
  schema.js v7 (ALTER TABLE memory_entries ADD wing/room + agent tables)
    --> taxonomy.js (wing/room assignment, validation helpers)
      --> recall.js modifications (add wing/room filters to existing recall)
      --> Depends on: schema v7 only
      --> Testing: modify existing recall tests to include wing/room

Phase 3: Semantic Dedup
  dedup.js (embedding comparison gate)
    --> entries.js modification (wire dedup check before fingerprint check)
    --> Depends on: EmbeddingService (existing), schema v7 (wing/room for scoping)
    --> Testing: unit test with mock embeddings

Phase 4: Graph Traversal
  graph.js (recursive CTE multi-hop walks)
    --> Depends on: kg.js (Phase 1) -- needs populated triples to traverse
    --> Testing: seed graph, verify BFS/DFS results

Phase 5: Agent Scopes
  scopes.js (agent namespace isolation, diary)
    --> Depends on: schema v7 (agent_scopes, agent_diary tables)
    --> Depends on: taxonomy.js (wing assignment for agent isolation)

Phase 6: Conversation Ingestion
  schema.js v8 (conversation_sources table)
    --> ingest.js (parse, chunk, extract, store)
      --> Depends on: ALL previous phases
        - entries.js for storeEntry
        - kg.js for addEntity/addTriple
        - dedup.js for duplicate gate
        - taxonomy.js for wing/room assignment
      --> This is the integration phase -- must come last

Phase 7: MCP Tools
  graph-tools.js (register all new MCP tools)
    --> Depends on: all service modules being complete
    --> Add to mcp/tools/index.js
```

**Rationale for this ordering:**
1. KG core is foundational -- everything else references entities/triples
2. Taxonomy modifies `memory_entries` which many modules depend on -- do it early but after KG
3. Dedup needs embeddings (existing) + wing/room (Phase 2) for scoping
4. Traversal needs a populated graph (Phase 1) to be useful
5. Agent scopes need taxonomy (Phase 2) for wing-based isolation
6. Ingestion is the integration point that pulls in KG + dedup + taxonomy
7. MCP tools are the surface layer -- built last when all internals are stable

## Scalability Considerations

| Concern | At 100 entries | At 10K entries | At 100K entries |
|---------|---------------|---------------|----------------|
| Triple queries | Instant (<1ms) | Fast (5-10ms with indexes) | Acceptable (20-50ms, compound indexes critical) |
| Graph traversal (2 hops) | Instant | Fast (10ms) | May need LIMIT on intermediary results |
| Graph traversal (3 hops) | Instant | 20-50ms | Consider materialized path table |
| Semantic dedup (50 candidates) | 5ms | 5ms (LIMIT 50 caps it) | 5ms (LIMIT caps it) |
| Recall with wing/room filter | Instant | Fast (idx_memory_entries_wing_room) | Fast (index does the work) |
| Conversation ingestion | N/A | 2-5s per file (I/O bound) | 2-5s per file (per-file processing) |

**SQLite is sufficient** for all expected scale. Synapse is a single-user local tool. Even at 100K entries, indexed queries stay under 100ms. The main bottleneck is embedding computation during dedup and ingestion, which is already bounded by the existing HuggingFace pipeline (~50ms per embedding).

## Sources

- [MemPalace knowledge_graph.py](https://github.com/milla-jovovich/mempalace/blob/main/mempalace/knowledge_graph.py) -- SQLite triple schema, temporal validity pattern (HIGH confidence)
- [MemPalace analysis](https://github.com/lhl/agentic-memory/blob/main/ANALYSIS-mempalace.md) -- Wing/room as metadata columns (not separate tables), 34% retrieval boost, AAAK regression analysis (HIGH confidence)
- [SQLite recursive CTE documentation](https://sqlite.org/lang_with.html) -- Breadth-first graph traversal in SQLite (HIGH confidence)
- [SemDeDup / SemHash](https://github.com/MinishLab/semhash) -- Semantic dedup via cosine similarity threshold (MEDIUM confidence -- adapted from ML pipeline to memory system context)
- [Temporal agents with knowledge graphs](https://developers.openai.com/cookbook/examples/partners/temporal_agents_with_knowledge_graphs/temporal_agents) -- Temporal triple patterns (MEDIUM confidence)
