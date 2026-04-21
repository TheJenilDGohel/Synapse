# Context: Phase 2 — MCP Server Decoupling

## Objective
Sever all direct logic and database dependencies from the `src/mcp/` layer. MCP tools should act only as thin protocol handlers that validate input (via Zod) and delegate execution to the `src/engine/` module.

## Current State Analysis
- **Engine**: `src/engine/` exists and re-exports all cognitive logic (database, memory, retrieval).
- **MCP Layer**: `src/mcp/tools/*.ts` still imports services directly and in many cases implements logic that should move to the engine or be consumed via the engine barrel.
- **Ambiguity**: Some tools (e.g., `graph-tools.ts`) use `MemoryStore` directly, which is protocol-agnostic, but others might still be doing ad-hoc things.

## Implementation Strategy
1.  **Tool Audit**: Identify all `src/mcp/tools` that contain business logic or direct database interactions.
2.  **Redirect Imports**: Change imports from `../services/memory/*` and `../services/retrieval/*` to `../../engine/index.js` (or specific engine sub-modules).
3.  **Thin Handlers**: Refactor `handler` functions to be minimal:
    - Extract params from Zod.
    - Call engine function.
    - Format response.
4.  **Zod Schema Isolation**: Ensure `src/mcp/common/schemas.ts` remains as the source for protocol validation, but the logic it points to is entirely engine-based.

## Success Criteria
- [ ] No `node:sqlite` or `DatabaseSync` imports in `src/mcp/`.
- [ ] No direct logic in `src/mcp/tools/*.ts` (all logic moved to `src/engine/` or delegated).
- [ ] All MCP tools consume cognitive capabilities via the `src/engine/` barrel.
