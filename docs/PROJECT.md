# Project Vision & Status

## 🌌 Vision

**Synapse is the self-contained AI context layer.**

Modern AI coding agents (Claude Desktop, Cursor, Windsurf) are incredibly capable, but they suffer from **session amnesia** and **shallow context**. They rely on literal `grep` searches or blind workspace scans that waste tokens and miss architectural intent.

Synapse solves this by providing a unified, local-first MCP server that gives your AI agent:
1. **Persistent Memory**: To remember decisions, preferences, and mistakes across sessions.
2. **Knowledge Graph**: To understand the structural relationships and evolution of your codebase.
3. **Hybrid Code Intelligence**: To find code based on semantic meaning, not just exact string matches.
4. **Proactive Intelligence**: To predict what context the agent needs before it even asks, and warn it of historical failure patterns before it writes bad code.

Synapse is strictly **zero-cloud** and **100% private**, powered entirely by a local SQLite database on your machine.

---

## 📅 Versioning (CalVer)

Synapse uses Calendar Versioning (**CalVer**) in the format `YYYY.MM.PATCH[-beta.N]`.
This reflects our commitment to predictable, time-boxed delivery cycles.

- Current Stable: **v2026.05.4**
- Active Development Branch: `beta`

---

## 📍 Current Status

We have just completed the stabilization of the **v2026.05.x** baseline and are actively executing **Milestone M2: Adaptive Indexing & Multi-Root Intelligence**.

### Recently Shipped (v2026.05.4)
- **The Intelligence & Prevention Suite**: Introduced Dead Reckoning, the Immune System, and the Pre-Mortem engine to shift Synapse from reactive retrieval to proactive reasoning.
- **N+1 Optimization**: Eliminated critical bottlenecks in the `sqlite-vec` indexer, enabling blazing-fast workspace scans.
- **Clean Architecture Migration**: Fully decoupled the core cognitive engine (`src/core/engine`) from the delivery mechanisms (`src/interfaces`), enforcing strict SOLID principles.

### Active Priorities (M2)
- **S02: Incremental Delta-Indexing**: Moving away from full-workspace scans to precise, event-driven delta updates.
- **S03: Multi-Root Intelligence**: Enabling Synapse to seamlessly bridge context across monorepos and loosely coupled multi-project workspaces.
