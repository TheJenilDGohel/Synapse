# Phase 37: Behavior Modification `teach` - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning
**Mode:** Manual (plan requested)

<domain>
## Phase Boundary

Users can call `synapse_teach(instruction)` to durably modify future agent behavior by storing a high-importance feedback memory that auto-surfaces in `agent_prime` on semantically matching tasks. Teach memories are standard memory entries with kind=`feedback`, high importance, and a `teach` tag -- no new tables, no new runtime dependencies.

Requirements: TEACH-01, TEACH-02, TEACH-03
Depends on: Phase 30 (agent_prime must surface teach memories)

</domain>

<decisions>
## Implementation Decisions

### Architecture: Thin MCP tool + recall scoring boost, not a new subsystem

The `teach` feature reuses the existing memory store pipeline. A teach instruction is just a memory entry with:
- `kind = 'feedback'` (new enum value, extends existing `knowledge | preference`)
- `importance = 95` (high enough to always rank near the top)
- `tags = ['teach', ...derived]`
- `source_type = 'teach'`

This means TEACH-03 (list, update, delete via CRUD) is free -- existing `synapse_memory_list`, `synapse_memory_update`, `synapse_memory_delete` already handle any memory entry regardless of kind.

### Recall scoring: feedback/teach boost in recall.ts

Currently `recall.ts` line 103 gives `preference` kind a +0.25 score bonus. For `feedback` kind memories, a larger boost (+2.0) ensures teach instructions surface in the top-5 recall results when the task semantically overlaps the instruction domain. This scoring boost is what satisfies TEACH-02: teach memories surface in agent_prime's top-5 because agent_prime calls `recall()` internally (line 128 of agent-prime.ts).

### agent_prime integration

agent_prime already calls `deps.memory.recall({ query: task, ... })` and surfaces the top N results as `CompactMemory[]`. No changes to agent-prime.ts are needed -- the recall scoring boost in recall.ts is sufficient to push teach memories into the top-5 naturally. The `kind` field is already included in `CompactMemory`, so the agent can distinguish teach instructions from regular memories.

### Schema changes

1. `MEMORY_KIND_SCHEMA` in schemas.ts: add `'feedback'` to the enum.
2. No new tables or columns.
3. No migrations needed.

### Key constraints
- Zero new runtime dependencies.
- All files under 500 lines.
- No new tables or columns -- pure additive changes to existing patterns.
- TEACH-03 is satisfied by existing CRUD tools without modification.

</decisions>

<code_context>
## Existing Code Insights

### Memory kinds (schemas.ts)
```typescript
export const MEMORY_KIND_SCHEMA = z.enum(['knowledge', 'preference']).default('knowledge');
```
Must add `'feedback'` as a third enum value. The kind flows through the entire pipeline unchanged -- storeEntry accepts it as a string, recall.ts scores it.

### Recall scoring (store/recall.ts)
```typescript
if (row.kind === 'preference') score += 0.25;
```
Line 103. This is the extension point for teach memory scoring. Add a parallel check for `row.kind === 'feedback'` with a higher boost (+2.0) to ensure teach instructions surface prominently.

### agent_prime (workflow/agent-prime.ts)
```typescript
const recallResult = await deps.memory.recall({
  query: task,
  projectPath: projectPath || undefined,
  nest: input.nest,
  branch: input.branch,
  limit: maxMemories
});
```
Lines 128-134. agent_prime recalls top N memories for the task. No modification needed -- the recall scoring boost handles surfacing teach memories.

### CompactMemory (workflow/agent-prime.ts)
```typescript
export interface CompactMemory {
  id: string;
  title: string;
  summary: string;
  kind: string;
  score: number;
}
```
The `kind` field already propagates, so agents see `kind: 'feedback'` and know it is a teach instruction.

### Store entry (store/entries.ts)
```typescript
const kind = cleanString(input.kind || 'knowledge', 40) || 'knowledge';
```
Line 169. The kind is stored as-is (up to 40 chars). No validation against the enum happens at the store layer -- only at the MCP schema layer. Adding `'feedback'` to the schema enum is sufficient.

### MCP tool registration (memory-workflow.ts, memory-store.ts)
The `synapse_memory_store` tool uses `MEMORY_KIND_SCHEMA` for the kind field. Once `'feedback'` is added to the schema enum, agents can store teach memories manually. The dedicated `synapse_teach` tool provides a simpler interface.

### Hooks (hooks.ts)
VALID_EVENTS already includes `before:store` and `after:store`. The teach tool uses `storeEntry()` internally, so all existing hooks fire normally. Optionally add `after:teach` for extensibility.

</code_context>

<specifics>
## Specific Ideas

### synapse_teach tool interface
```
synapse_teach({
  instruction: "always use rxdart instead of setState",
  importance?: 95,  // default 95, clamped 70-100
  tags?: ["flutter", "state-management"],
  nest?: "my-project",
  branch?: "main"
})
```
Returns:
```json
{
  "taught": true,
  "memory_id": "mem_abc123",
  "instruction": "always use rxdart instead of setState",
  "importance": 95,
  "kind": "feedback",
  "tags": ["teach", "flutter", "state-management"]
}
```

### Teach memory stored as:
```typescript
{
  kind: 'feedback',
  title: `[teach] ${instruction.slice(0, 80)}`,
  summary: instruction,
  content: instruction,
  importance: 95,
  confidence: 1.0,
  tags: ['teach', ...userTags],
  source_type: 'teach',
  // nest, branch, scope inherited from input or auto-inferred
}
```

### Recall scoring for feedback memories
In recall.ts, after the `preference` bonus:
```typescript
if (row.kind === 'feedback') score += 2.0;
```
A +2.0 boost is significant enough to push a feedback memory into the top-5 when the task overlaps even partially with the instruction domain (e.g., "add counter widget" matches "always use rxdart" via Flutter/state terms), but not so large that it drowns out highly relevant knowledge memories.

### Tag-based domain matching
The teach instruction content is used for full-text recall matching (via search_terms_json). User-provided tags further narrow the domain. For example, tagging with "flutter" means the teach memory gets a term-match bonus when the task mentions Flutter concepts.

</specifics>

<deferred>
## Deferred Ideas

- Teach memory categories (e.g., "style", "architecture", "testing") for filtered recall. Can be added later as tags.
- Teach memory conflict detection (two teach instructions that contradict each other). Could use KG contradiction detection from Phase 5.
- Teach memory expiration / decay. Currently all teach memories are permanent unless manually deleted.
- Bulk teach import from CLAUDE.md or project configuration files. Useful but orthogonal.
- agent_prime showing a dedicated `teach_instructions` section separate from `memories`. Requires agent-prime.ts changes -- deferred.

</deferred>
