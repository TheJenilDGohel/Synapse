# Synapse

## What This Is

Synapse is the foundational, local-first AI Brain. It functions as a rapid, sleek CLI tool for human operators while simultaneously granting AI agents rich, context-aware memory, architectural graph knowledge, and code retrieval through a seamless Model Context Protocol (MCP) interface. It is a standalone, premier cognitive engine for local computing.

## Core Value

An uncompromisingly fast, purely local cognitive layer that flawlessly bridges human terminal workflows with autonomous AI tool calling.

## Requirements

### Validated

- ✓ SQLite-backed storage for vector memory and relationships — existing paradigm
- ✓ Dual interface: Human CLI access and AI MCP tool exposure — existing paradigm

### Active

- [ ] Complete structural redesign tearing down the old monolith to create an elegant, modular architecture
- [ ] Core CLI UX refinement providing premium terminal interactions
- [ ] First-class AI awareness (SKILL.md, .claude.md integration) so LLMs automatically know how to query the Brain

### Out of Scope

- A full graphic UI framework (Web dashboard etc.) — The focus remains on CLI and MCP-driven backend power.
- Cloud orchestration / Hosted variants — Synapse remains strictly local-first and self-hosted.

## Context

- The project was previously known as "LocalNest" but has undergone a complete re-brand and philosophical pivot to "Synapse". 
- We are shedding legacy technical debt to completely rebuild the component structures from the bottom up. 
- While it overlaps in purpose with memory tools like Mem0, Synapse stakes its own identity as a superior, self-reliant "AI Brain" focusing aggressively on speed, temporal code understanding, and local-first data ownership.

## Constraints

- **Architecture**: Modular and Decoupled — We are rewriting the structure to ensure the CLI handler, the MCP server, and the SQLite Brain operate cleanly.
- **Tech Stack**: Node.js ecosystem with zero generic cloud dependencies.
- **Performance**: Must remain ultra-fast on Windows to support instantaneous memory retrieval.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Pivot to autonomous CLI/MCP dual-identity | Allows both human and AI agents to transparently manage memory. | — Pending |
| Total Structural Rewrite | Tearing down the "LocalNest" monolith is necessary to achieve the speed and architecture required for a proper AI Brain. | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-20 after initialization*
