# Phase 30 Context: Unified Context Primitive `agent_prime`

## What This Phase Does
Adds a single `synapse_agent_prime(task)` MCP tool that returns everything an agent needs to start work in one call: recalled memories, matched KG entities, relevant files, recent changes, and suggested next actions. Replaces 4+ separate tool calls with a single <2KB response.

## Requirements
- PRIME-01: `synapse_agent_prime(task_description)` returns `{memories, entities, files, recent_changes, suggested_actions}` under 2KB total
- PRIME-02: `memories` contains top 5 semantically relevant entries
- PRIME-03: `entities` contains top 10 KG entities related to query terms or top memories
- PRIME-04: `files` contains top 5 files based on recent edits + semantic similarity to task
- PRIME-05: `recent_changes` contains a git diff summary since last memory capture in this project
- PRIME-06: `suggested_actions` contains 2-4 "start with X" / "check Y" hints derived from memory + file signals

## Depends On
- Phase 29 (memory-kg-auto-linking)

## Key Files
- `src/services/memory/store/recall.ts` -- existing recall logic, reused for PRIME-02
- `src/services/memory/knowledge-graph/kg.ts` -- KG queries for PRIME-03
- `src/services/memory/workflow.ts` -- existing MemoryWorkflowService, extended for agent_prime
- `src/services/memory/service.ts` -- MemoryService facade
- `src/services/memory/store.ts` -- MemoryStore, may need new method
- `src/mcp/tools/memory-workflow.ts` -- MCP tool registration site
- `src/app/register-tools.ts` -- app-level tool wiring
- `src/mcp/common/response-normalizers.ts` -- response normalization functions

## Architectural Decisions
- agent_prime lives in `src/services/memory/workflow/agent-prime.ts` (new file)
- Wired through MemoryWorkflowService (workflow.ts), NOT through store.ts -- this is a composite workflow, not a storage operation
- Response capped at 2KB via aggressive summarization: memory titles+summaries only, entity names+types only, file paths only
- Files component uses existing search service for hybrid search (semantic + recency)
- recent_changes uses `child_process.execSync` for git diff (no new deps)
- suggested_actions derived from heuristics on memory content + file signals (no LLM needed)

## Interfaces

### AgentPrimeInput
```typescript
interface AgentPrimeInput {
  task: string;                // Required task description
  project_path?: string;       // Scope to a project
  nest?: string;               // Memory nest scope
  branch?: string;             // Memory branch scope
  max_memories?: number;       // Cap (default 5)
  max_entities?: number;       // Cap (default 10)
  max_files?: number;          // Cap (default 5)
}
```

### AgentPrimeResult
```typescript
interface AgentPrimeResult {
  task: string;
  memories: Array<{
    id: string;
    title: string;
    summary: string;
    kind: string;
    score: number;
  }>;
  entities: Array<{
    id: string;
    name: string;
    type: string;
    predicates: string[];      // compact: just predicate names
  }>;
  files: Array<{
    path: string;
    score: number;
  }>;
  recent_changes: string;       // compact git diff summary
  suggested_actions: string[];  // 2-4 actionable hints
}
```

## Existing Patterns to Follow
- MemoryWorkflowService.getTaskContext() -- same delegation pattern
- registerMemoryWorkflowTools() -- same registration pattern
- normalizeTaskContextResult() -- same normalizer pattern
- recall() in store/recall.ts -- reused directly for memory retrieval
- queryEntityRelationships() in kg.ts -- reused for entity neighborhood
