# Roadmap: Synapse Engine

## Milestones

- Active: **v1.0.0 Architecture Teardown & Engine Decoupling** - Phases 1-3

## Phases

### Active: v1.0.0 Architecture Teardown & Engine Decoupling

**Milestone Goal:** Sever the tight coupling between the CLI, MCP protocols, and Database by centralizing logic into a pure `src/engine/` module. Establish the foundation for the AI-Aware CLI tool.

- [x] **Phase 1: Engine Isolation** - Create the `src/engine/` module and move all SQLite database queries, graph traversals, and semantic indexing into this pure layer (satisfies CORE-01, CORE-02).
- [x] **Phase 2: MCP Server Decoupling** - Refactor `src/mcp/` so that tools only parse input payloads and format the output according to the MCP spec, while delegating logic entirely to the new `src/engine/` layer (satisfies MCP-01, MCP-02).
- [x] **Phase 3: CLI Modernization** - Replace the 8 fragmented executable `bin/synapse-*` scripts with a unified routing command, separating human interaction from backend logic (satisfies CLI-01, CLI-02).
- [x] **Phase 4: AI Awareness & Hardening** - Establish AI context files (SKILL.md) and verify CLI integrity with dedicated tests.
- [x] **Phase 5: Windows Support Improvement** - Audit and fix cross-platform path handling, Ripgrep parsing, and case-sensitivity issues on Windows systems.

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
**Plans**: 1 plans
- [x] Refactor MCP tools to use Engine barrel (02-01-PLAN.md)

### Phase 3: CLI Modernization
**Goal**: Compress the bloated `bin/` directory scripts into a unified CLI tool interface using modern routing.
**Depends on**: Phase 1
**Requirements**: CLI-01, CLI-02
**Success Criteria** (what must be TRUE):
  1. `bin/synapse.cjs` handles a tree of commands (e.g., `synapse mcp start`, `synapse memory add`).
  2. Legacy fragmented scripts map back to this router safely.
- [x] Unify CLI router and decouple handlers (03-PLAN.md)

### Phase 4: AI Awareness & Hardening
**Goal**: Solidify the Brain's identity for agents and ensure architectural durability through testing.
**Depends on**: Phase 3
**Requirements**: AWARE-01, AWARE-02, CLI-03
**Success Criteria**:
  1. Root AI context files (SKILL.md) are present and accurate.
  2. CLI router has integration test coverage.
- [x] AI Awareness and hardening (04-PLAN.md)

### Phase 5: Windows Support Improvement
**Goal**: Ensure Synapse is fully operational and bug-free on Windows.
**Depends on**: Phase 1
**Requirements**: CORE-03, CLI-04
**Success Criteria**:
  1. Ripgrep parsing handles Windows absolute paths correctly.
  2. Workspace path matching is case-insensitive on Windows.
  3. `synapse doctor` passes all checks on Windows.
**Plans**: 1 plans
- [x] Windows support hardening (05-PLAN.md)

## Progress

**Execution Order (v1.0.0):**
1 -> 2 -> 3 (Sequential block)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Engine Isolation | v1.0.0 | 1/1 | Completed | 2026-04-21 |
| 2. MCP Server Decoupling | v1.0.0 | 1/1 | Completed | 2026-04-21 |
| 3. CLI Modernization | v1.0.0 | 1/1 | Completed | 2026-04-21 |
| 4. AI Awareness & Hardening | v1.0.0 | 1/1 | Completed | 2026-04-21 |
| 5. Windows Support Improvement | v1.0.0 | 1/1 | Completed | 2026-04-21 |
