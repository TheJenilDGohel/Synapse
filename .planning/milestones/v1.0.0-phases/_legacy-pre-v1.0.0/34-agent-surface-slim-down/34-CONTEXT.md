# Phase 34: Agent Surface Slim-Down - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning
**Mode:** Auto-generated (research-driven)

<domain>
## Phase Boundary

Shrink the agent-facing API surface so that agents can use Synapse memory with minimal ceremony. SKILL.md drops from ~360 lines to ~50. `memory_store` becomes a two-field call (`{title, content}`). All other fields auto-inferred from environment and content analysis. A new `synapse_help(task)` tool provides just-in-time guidance instead of front-loaded documentation.

</domain>

<decisions>
## Implementation Decisions

### SKILL.md Rewrite (SLIM-01)
- Current SKILL.md is ~360 lines across `skills/synapse/SKILL.md` and `.claude/skills/synapse/SKILL.md` (both are nearly identical copies).
- Target: ~50 lines. One paragraph of philosophy ("local-first, evidence-first, capture decisions"), a pointer to `synapse_help(task)`, and a minimal "first three tools to try" list.
- Both copies must be updated in sync.

### synapse_help Tool (SLIM-02)
- New MCP tool: `synapse_help({ task: string })`.
- Returns task-scoped guidance: relevant tools, example calls, and tips -- tailored to the task description.
- Implemented as a rule-based classifier over the task string (regex patterns matching keywords like "store", "recall", "search", "graph", "debug", etc.).
- Returns a subset of the current SKILL.md content relevant to the detected task type.
- Registered in `src/mcp/tools/core.ts` alongside `synapse_usage_guide`.
- Does NOT replace `synapse_usage_guide` -- it supplements it with task-scoped precision.

### memory_store Schema Simplification (SLIM-06)
- Current MCP schema has 16 fields with 3 required: `kind`, `status`, `scope` (each has a `.default()` but Zod `.default()` only fires if the field is absent, not if the agent omits it in the JSON call -- MCP clients vary).
- New schema: only `title` (string, min 1) and `content` (string, min 1) are required. All others become `.optional()` with server-side defaults.
- `kind` defaults to `'knowledge'`, `status` to `'active'`, `scope` to `{}` -- all already handled by `storeEntry` logic in entries.ts.

### Auto-Inference of project_path (SLIM-03)
- When `scope.project_path` is empty, infer from `process.cwd()` at call time.
- Implemented in `storeEntry` (entries.ts) after `normalizeScope()`.
- Only infers if the scope result has an empty `project_path`.

### Auto-Inference of branch_name (SLIM-04)
- When `scope.branch_name` is empty, try `git rev-parse --abbrev-ref HEAD` via `child_process.execSync`.
- Implemented as a utility function `inferGitBranch()` in `src/services/memory/utils.ts`.
- Wrapped in try/catch -- returns empty string on failure (not a git repo, git not installed, etc.).
- Called from `storeEntry` after `normalizeScope()` when `branch_name` is empty.

### Auto-Inference of nest, branch, topic, tags (SLIM-05)
- When `nest` is empty: derive from `scope.project_path` via `path.basename()` (already done in entries.ts).
- When `branch` is empty: derive from `scope.branch_name` or `scope.topic` (already done in entries.ts).
- When `topic` is empty: classify from content via simple keyword rules.
- When `tags` is empty: extract from content via keyword extraction (top N nouns/identifiers from title + first 200 chars of content).
- Implemented as `inferTopic(content: string): string` and `inferTags(title: string, content: string): string[]` in utils.ts.
- Both are pure functions, no external deps, regex-based.

### Populating nest/branch for downstream tools (SLIM-07)
- The auto-inferred values flow into the existing `nest` and `branch` columns in `memory_entries`.
- `nest_tree` and `graph_bridges` already read from these columns.
- The key change: ensure inference always produces a non-empty nest/branch so these downstream tools have real data.

</decisions>

<code_context>
## Existing Code Insights

### Current memory_store MCP schema (src/mcp/tools/memory-store.ts lines 128-145)
```typescript
inputSchema: {
  kind: MEMORY_KIND_SCHEMA,              // required (has .default('knowledge'))
  title: z.string().min(1).max(400),     // required
  summary: z.string().max(4000).default(''),
  content: z.string().min(1).max(20000), // required
  status: MEMORY_STATUS_SCHEMA,          // required (has .default('active'))
  importance: z.number().int().min(0).max(100).default(50),
  confidence: z.number().min(0).max(1).default(0.7),
  tags: z.array(z.string()).max(50).default([]),
  links: z.array(MEMORY_LINK_SCHEMA).max(50).default([]),
  scope: MEMORY_SCOPE_SCHEMA,            // required (has .default({}))
  nest: z.string().max(200).optional(),
  branch: z.string().max(200).optional(),
  source_type: z.string().max(60).default('manual'),
  source_ref: z.string().max(1000).default(''),
  change_note: z.string().max(400).default('Initial memory creation'),
  terse: z.enum(['minimal', 'verbose']).default('verbose')
}
```

### storeEntry inference already present (entries.ts lines 153-181)
- `nest` already falls back to `path.basename(scope.project_path)` when empty
- `branch` already falls back to `scope.branch_name || scope.topic` when empty
- `kind` defaults to 'knowledge'
- `status` defaults to 'active'
- `title` is derived from content/summary if not provided (via deriveTitle)
- `summary` is derived from content if not provided (via deriveSummary)

### Utils already has helpers (utils.ts)
- `normalizeScope()`, `cleanString()`, `ensureArray()`, `deriveTitle()`, `deriveSummary()`
- Good place to add `inferGitBranch()`, `inferTopic()`, `inferTags()`

### Core tools registration (core.ts)
- Already registers `synapse_usage_guide` and `synapse_server_status`
- Good place to add `synapse_help`

### SKILL.md locations
- `skills/synapse/SKILL.md` (359 lines) -- published skill
- `.claude/skills/synapse/SKILL.md` (361 lines) -- Claude-local skill
- Both must be rewritten to ~50 lines

</code_context>

<specifics>
## Specific Ideas

- The `synapse_help` classifier should cover at least these task types:
  - "store/save/remember/capture" -> memory_store + capture_outcome guidance
  - "recall/find/search memory" -> memory_recall + task_context guidance
  - "search code/find file" -> search_files + search_code guidance
  - "graph/entity/triple/fact" -> KG workflow guidance
  - "relate/link/connect" -> memory graph workflow guidance
  - "debug/fix/investigate" -> full debug workflow guidance
  - "setup/install/configure" -> setup guidance
  - Default fallback -> usage_guide pointer + top 3 tools

- Tags auto-inference: extract identifiers that look like technical terms (camelCase, snake_case, ALL_CAPS) from title + content[:200]. Cap at 5 auto-tags. Prefix with `auto:` to distinguish from manual tags.

- Topic auto-inference keyword map:
  - "bug|fix|error|crash|exception" -> "bugfix"
  - "decide|decision|chose|pick|prefer" -> "decision"
  - "review|audit|check|inspect" -> "review"
  - "learn|pattern|convention|always|never" -> "knowledge"
  - "config|setup|install|deploy" -> "configuration"
  - Default -> "general"

</specifics>

<deferred>
## Deferred / Out of Scope

- LLM-based classification of task type (would require inference call -- offline-first constraint)
- Automatic SKILL.md regeneration from tool metadata (possible future phase)
- Per-client SKILL.md variants (already tracked as separate concern in memory)
- Removing `synapse_usage_guide` (kept for backward compat; help supplements it)

</deferred>
