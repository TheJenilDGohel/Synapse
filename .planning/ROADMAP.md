# Roadmap: Synapse Engine

## Milestones

- Active: **v1.0.0 Architecture Teardown & Engine Decoupling** - Phases 1-3

## Phases

### Active: v1.0.0 Architecture Teardown & Engine Decoupling

**Milestone Goal:** Sever the tight coupling between the CLI, MCP protocols, and Database by centralizing logic into a pure `src/engine/` module. Establish the foundation for the AI-Aware CLI tool.

- [x] **Phase 1: Engine Isolation** - Create the `src/engine/` module and move all SQLite database queries, graph traversals, and semantic indexing into this pure layer (satisfies CORE-01, CORE-02).
- [ ] **Phase 2: MCP Server Decoupling** - Refactor `src/mcp/` so that tools only parse input payloads and format the output according to the MCP spec, while delegating logic entirely to the new `src/engine/` layer (satisfies MCP-01, MCP-02).
- [ ] **Phase 3: CLI Modernization** - Replace the 8 fragmented executable `bin/synapse-*` scripts with a unified routing command, separating human interaction from backend logic (satisfies CLI-01, CLI-02).

## Phase Details

### Phase 1: Engine Isolation
**Goal**: Create a clean, decoupled database and processing engine that has no dependencies on the CLI output or MCP payloads.
**Depends on**: None
**Requirements**: CORE-01, CORE-02
**Success Criteria** (what must be TRUE):
  1. `src/engine/` exists and encapsulates all direct `node:sqlite` database functions.
  2. The internal semantic / vector search logic is importable without invoking server protocols.
**Plans**: 1 plans
- [x] Create src/engine/ barrel module (01-01-PLAN.md)

### Phase 2: MCP Server Decoupling
**Goal**: The MCP handlers act only as translators between the AI and the `src/engine/`.
**Depends on**: Phase 1
**Requirements**: MCP-01, MCP-02, AWARE-02
**Success Criteria** (what must be TRUE):
  1. Zod schemas are used strictly to validate input from AI agents.
  2. No SQL queries exist in the `src/mcp/` handlers.
**Plans**: 0 plans
- [ ] TBD (run /gsd-plan-phase 2 to break down)

### Phase 3: CLI Modernization
**Goal**: Compress the bloated `bin/` directory scripts into a unified CLI tool interface using modern routing.
**Depends on**: Phase 1
**Requirements**: CLI-01, CLI-02
**Success Criteria** (what must be TRUE):
  1. `bin/synapse.cjs` handles a tree of commands (e.g., `synapse mcp start`, `synapse memory add`).
  2. Legacy fragmented scripts map back to this router safely.
**Plans**: 0 plans
- [ ] TBD (run /gsd-plan-phase 3 to break down)

## Progress

**Execution Order (v1.0.0):**
1 -> 2 -> 3 (Sequential block)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Engine Isolation | v1.0.0 | 1/1 | Completed | 2026-04-21 |
| 2. MCP Server Decoupling | v1.0.0 | 0/0 | Not started | - |
| 3. CLI Modernization | v1.0.0 | 0/0 | Not started | - |
