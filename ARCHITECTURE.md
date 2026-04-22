# Synapse Architectural Overview

This document outlines the high-level architecture mapped across the `src/` directory. Synapse follows a Domain-Driven, multi-layered architectural approach to strictly separate basic core utilities from business logic and application boundaries.

## Top-Level Domains

The codebase is split into three immutable pillars:

1. **`src/core/`** (System Fundamentals)
2. **`src/services/`** (Business Logic)
3. **`src/interfaces/`** (Entrypoints & I/O)

---

### 1. Core (`src/core/`)
The foundation of Synapse. The Core context manages configurations, database access, early lifecycle events, and overarching data types. **It should never depend on `services` or `interfaces`.**

- **`/engine`**: Co-ordinates high-level database primitives.
- **`/migrations`**: Database schema evolution and configuration migrations.
- **`/runtime`**: Environment constraints, feature toggles, SQLite core layout/extensions.
- **`/setup`**: Orchestrator utilities for initializing Synapse on first run.
- **`/types`**: Universal TypeScript interfaces used globally out of necessity.

### 2. Services (`src/services/`)
The bounded business logic contexts. Each service is as isolated as possible and handles a specific domain of the AI brain's logic. **These depend on `core`, but never on `interfaces`.**

- **`/memory`**: The intelligent persistent knowledge graph logic, split internally between `store`, `temporal`, `backfill`, `audit`, etc.
- **`/retrieval`**: Handles code search, text embeddings, BM25 indexing, and vector similarity querying.
- **`/workspace`**: Directory lifecycle management and project boundaries.
- **`/update`**: Over-the-air update mechanisms to pull new CLI versions via npm.
- **`/unified-find`**: Highly advanced search synthesis across memory, retrieval, and temporal layers.

### 3. Interfaces (`src/interfaces/`)
The external boundaries where the outside world interacts with Synapse. **These orchestrate the `services` and consume `core`, acting entirely as wrappers/adapters.**

- **`/cli`**: Local human-in-the-loop interaction layers. Responsible for arg parsing, ANSI outputs, spinners, etc.
- **`/mcp` & `/app`**: Exposes Synapse as a Model Context Protocol (MCP) server for Claude/VSCode to consume autonomously. Holds tool registrations and STDIO/SSE lifecycle routing.

---

### Development Principles

- **Downwards Isolation**: `interfaces/` depends on `services/` and `core/`. `services/` depends on `core/`. `core/` depends on nothing inside the project.
- **No Side-by-Side Sprawl**: Features are kept structurally flat inside their specific domains. Single-file exports or barrel files are preferred over heavily nested monolithic files.
- **Barrel Files in Services**: High-complexity directories like `src/services/memory` expose external APIs solely via an `index.ts`.
