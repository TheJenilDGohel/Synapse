# Phase 35: Cross-Project Bridges & Backfill - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning
**Mode:** Auto-generated (research-driven)

<domain>
## Phase Boundary

Enable cross-project pattern discovery via `graph_bridges` returning real data when memories span multiple nests, provide an opt-in backfill scan that creates memories for projects with zero entries, and surface explicit cross-project insights (e.g. "projects A and B share library X").

Depends on Phase 34 (SLIM-07) which ensures `nest` and `branch` columns are auto-populated on `memory_store` calls, so `graph_bridges` has real nest data to join against.

</domain>

<decisions>
## Implementation Decisions

### BRIDGE-01: graph_bridges Returns Real Data
- The `discoverBridges` function in `src/services/memory/knowledge-graph/graph.ts` already implements the SQL query that finds triples spanning different nests.
- The query joins `kg_triples` -> `kg_entities` -> `memory_entries` via `memory_id`, filtering where `ms.nest != mo.nest`.
- **Current gap**: many `kg_entities` have NULL `memory_id`, so the `JOIN memory_entries ms ON ms.id = s.memory_id` drops those entities entirely. This produces zero bridges even when cross-nest entities exist.
- **Fix approach**: Enrich the bridge query to also consider entity-level nest inference. When `memory_id` is NULL, fall back to checking `source_memory_id` on the triple itself, or use a subquery to find any memory that references the entity.
- Alternative (simpler): Add a `nest` column directly to `kg_entities` so bridges can be discovered without the memory_entries join. This is a schema v7+ migration (additive, non-breaking). Populate via a backfill step that reads the nest from the linked `memory_entries` row or from the entity's `source_memory_id` triple.
- **Chosen approach**: LEFT JOIN with COALESCE. Change the INNER JOINs to LEFT JOINs and derive nest from multiple sources: (1) direct `memory_id` link, (2) `source_memory_id` on the triple, (3) any memory that auto-linked the entity. Only require at least one nest to be non-empty. This avoids schema changes and works with existing data.

### BRIDGE-02: Opt-In Project Backfill Scan
- New MCP tool: `synapse_project_backfill({ root_path: string, dry_run?: boolean })`.
- Scans the filesystem under `root_path` looking for project directories (directories containing `package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, `pom.xml`, `.git`, etc.).
- For each discovered project that has zero memories in `memory_entries` (checked via `SELECT COUNT(*) FROM memory_entries WHERE nest = ?`), creates a seed memory entry with basic project info (name, path, detected language).
- `dry_run: true` returns the list of projects that would be backfilled without writing.
- Safety: scans at most 2 directory levels deep. Ignores `node_modules`, `.git`, `dist`, `build`, `target`, `__pycache__`, `.venv`.
- Implementation in a new file `src/services/memory/backfill/project-scan.ts` (under 200 lines).

### BRIDGE-03: Cross-Project Insight Surfaces
- Enrich the `graph_bridges` response with an `insights` array that groups bridges by shared entities.
- For each entity that appears in bridges across 2+ nests, produce an insight string: `"projects {nestA} and {nestB} share {entity_type} '{entity_name}' via {predicate}"`.
- Insights are derived post-query from the bridges array -- no additional SQL needed.
- The `DiscoverBridgesResult` type gains an `insights: string[]` field (additive, backward-compatible).
- Optionally add a `summary` field: `"Found {N} bridges across {M} nest pairs involving {K} shared entities"`.

</decisions>

<code_context>
## Existing Code Insights

### discoverBridges implementation (src/services/memory/knowledge-graph/graph.ts lines 121-169)
```typescript
export async function discoverBridges(adapter: Adapter, { nest }: DiscoverBridgesOpts = {}): Promise<DiscoverBridgesResult> {
  // JOINs kg_triples -> kg_entities (subject/object) -> memory_entries (via memory_id)
  // Filters: valid_to IS NULL, both nests non-empty, nests differ
  // Optional filter: either nest matches a provided value
}
```
Key limitation: `JOIN memory_entries ms ON ms.id = s.memory_id` is an INNER JOIN -- entities without `memory_id` are silently dropped.

### kg_entities schema (schema.ts line 219)
```sql
CREATE TABLE IF NOT EXISTS kg_entities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'concept',
  properties_json TEXT NOT NULL DEFAULT '{}',
  memory_id TEXT,         -- nullable, often NULL for auto-created entities
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)
```
`memory_id` is nullable. Entities created via `addEntity` with no explicit `memory_id` (most of them) have NULL here.

### kg_triples schema (schema.ts line 231)
```sql
CREATE TABLE IF NOT EXISTS kg_triples (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object_id TEXT NOT NULL,
  valid_from TEXT,
  valid_to TEXT,
  confidence REAL NOT NULL DEFAULT 1.0,
  source_memory_id TEXT,  -- links triple back to originating memory
  source_type TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL
)
```
`source_memory_id` provides an alternative path to find the nest for a triple.

### memory_entries schema (schema.ts line 13)
Columns relevant to bridges: `id`, `nest` (TEXT NOT NULL DEFAULT ''), `branch`, `scope_project_path`.

### Existing backfill mechanism (src/services/memory/knowledge-graph/auto-link.ts)
- `backfillMemoryKgLinks()` scans existing memories and links them to matching KG entities.
- Already exposed as MCP tool `synapse_kg_backfill_links`.
- The project backfill (BRIDGE-02) is a different concept: it scans the filesystem for projects, not existing memories.

### Taxonomy functions (src/services/memory/taxonomy/taxonomy.ts)
- `listNests()`, `listBranches()`, `getTaxonomyTree()` -- all read from `memory_entries` grouped by nest/branch.

### Types (src/services/memory/types.ts lines 471-490)
```typescript
export interface DiscoverBridgesOpts { nest?: string; }
export interface BridgeEntry {
  triple_id: string; subject_id: string; subject_name: string;
  predicate: string; object_id: string; object_name: string;
  subject_nest: string; object_nest: string;
}
export interface DiscoverBridgesResult {
  filter_nest: string | null; bridge_count: number; bridges: BridgeEntry[];
}
```

### MCP tool registration (src/mcp/tools/graph-tools.ts lines 334-350)
- `synapse_graph_bridges` already registered with `nest` optional parameter.
- Calls `memory.discoverBridges({ nest })`.

### MemoryStore.discoverBridges (src/services/memory/store.ts)
- Delegates to `discoverBridgesFn(adapter, args)`.
- Emits `before:graph:bridges` and `after:graph:bridges` hooks.

</code_context>

<specifics>
## Specific Ideas

- **Bridge query fix**: Replace `JOIN memory_entries ms ON ms.id = s.memory_id` with a LEFT JOIN + subquery that also checks `source_memory_id` on the triple:
  ```sql
  LEFT JOIN memory_entries ms ON ms.id = COALESCE(s.memory_id, t.source_memory_id)
  LEFT JOIN memory_entries mo ON mo.id = COALESCE(o.memory_id, t.source_memory_id)
  ```
  Then use `COALESCE(ms.nest, ms2.nest, '')` where `ms2` is a fallback join via `source_memory_id`.

- **Project detection heuristics**: Check for presence of manifest files:
  - `package.json` -> Node.js/TypeScript
  - `Cargo.toml` -> Rust
  - `go.mod` -> Go
  - `pyproject.toml` / `setup.py` / `requirements.txt` -> Python
  - `pom.xml` / `build.gradle` -> Java/Kotlin
  - `*.sln` / `*.csproj` -> .NET
  - `.git` (standalone) -> generic project

- **Insight generation**: After collecting bridges, group by entity and produce human-readable insights. Use a Set to track unique nest pairs per entity. Format: `"'{entity_name}' ({entity_type}) is shared between {nest_list} via {predicate_list}"`.

- **Backfill memory content**: For each discovered project, create a memory with:
  - `title`: project directory name
  - `content`: `"Project at {abs_path}. Detected via {manifest_file}. Language: {detected_lang}."`
  - `nest`: directory basename
  - `source_type`: `'project_scan'`
  - `tags`: `['auto:project', 'auto:{language}']`

</specifics>

<deferred>
## Deferred / Out of Scope

- Adding a `nest` column to `kg_entities` (schema migration -- too invasive for this phase, revisit in Phase 38 audit)
- Recursive project scanning deeper than 2 levels (performance risk on large filesystems)
- Automatic periodic re-scanning (would need a scheduler -- out of scope for MCP tool)
- Cross-project dependency graph analysis (would need package lock parsing -- future phase)
- LLM-based insight generation (offline-first constraint)

</deferred>
