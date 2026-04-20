# Requirements: Synapse

**Defined:** 2026-04-20
**Core Value:** An uncompromisingly fast, purely local cognitive layer that flawlessly bridges human terminal workflows with autonomous AI tool calling.

---

## Restructuring & Decoupling (The Great Tear-Down)

### Phase 1 Context
The existing architecture (inherited from LocalNest) suffers from monolithic entanglement. The CLI commands, MCP server protocol, database layer, and AI integrations (like SKILL.md generation) are tightly coupled, making the core hard to modify and slow to initialize. This restructure will enforce elegant module boundaries.

### REQ-CORE: The Engine 
- [ ] **CORE-01**: The SQLite database connection and interaction logic MUST be isolated strictly into a `src/engine/` module.
- [ ] **CORE-02**: Semantic embedding retrieval, hybrid search, and KG traversal must exist as stateless utility functions independent of the server endpoints.

### REQ-MCP: The AI Server Protocol
- [ ] **MCP-01**: `src/mcp/` should ONLY contain parsing and formatting logic for the Model Context Protocol (validating inputs, sending structured outputs). It must delegate all hard work to `src/engine/`.
- [ ] **MCP-02**: Tool definitions must be strongly typed using Zod and auto-documented. 

### REQ-CLI: The Human Interface
- [ ] **CLI-01**: `src/cli/` must be entirely independent of the MCP server code, using the same `src/engine/` primitives.
- [ ] **CLI-02**: The 8 separate `bin/*` scripts must be refactored into a single elegant router (e.g., `bin/synapse.cjs`) using Commander.js or similar, deprecating the fragmented scripts without losing backward-compatible commands.

### REQ-AWARE: Native AI Awareness
- [ ] **AWARE-01**: The system must have a unified `SKILL.md` or `.claude.md` generation pipeline that drops directly into the host OS so agents know how to boot the brain.
- [ ] **AWARE-02**: Eliminate all hardcoded "localnest" legacy terminology and strings buried in variables or database defaults. 
