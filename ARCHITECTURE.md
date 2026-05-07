# Synapse Architectural Overview

This document outlines the high-level architecture mapped across the `src/` directory. Synapse follows a Domain-Driven, multi-layered architectural approach to strictly separate basic core utilities from business logic and application boundaries.

## Top-Level Domains

```mermaid
graph TD
    subgraph "Interface Layer (src/interfaces/)"
        CLI["CLI (/cli)"]
        MCP["MCP Server (/mcp)"]
        App["App Logic (/app)"]
    end

    subgraph "Engine Layer (src/core/engine/)"
        Memory["Memory (/memory)"]
        Retrieval["Retrieval (/retrieval)"]
        Workspace["Workspace (/workspace)"]
        UnifiedFind["Unified Find (/unified-find)"]
        Update["Update (/update)"]
    end

    subgraph "Core Layer (src/core/)"
        Runtime["Runtime (/runtime)"]
        Migrations["Migrations (/migrations)"]
        Setup["Setup (/setup)"]
    end

    CLI --> Memory
    CLI --> Workspace
    MCP --> Memory
    MCP --> Retrieval
    App --> UnifiedFind

    Memory --> Runtime
    Retrieval --> Runtime
    Workspace --> Runtime
    UnifiedFind --> Memory
    UnifiedFind --> Retrieval

    Update --> Runtime
```

Synapse follows two immutable pillars:

1. **`src/core/`** (Engine & Infrastructure)
2. **`src/interfaces/`** (Entrypoints & I/O)


---

### 1. Core Engine (`src/core/engine/`)
The bounded business logic contexts. Each engine domain is as isolated as possible and handles a specific part of the AI brain's logic.

- **`/memory`**: The intelligent persistent knowledge graph logic, split internally between `store`, `temporal`, `backfill`, `audit`, etc.
- **`/retrieval`**: Handles code search, text embeddings, BM25 indexing, and vector similarity querying.
- **`/workspace`**: Directory lifecycle management and project boundaries.
- **`/update`**: Over-the-air update mechanisms to pull new CLI versions via npm.
- **`/unified-find`**: Highly advanced search synthesis across memory, retrieval, and temporal layers.
- **`/database`**: Co-ordinates low-level SQLite primitives and node:sqlite integration.

### 2. Runtime & Setup (`src/core/runtime/` & `src/core/setup/`)
The foundation of Synapse. The Core context manages configurations, environment constraints, early lifecycle events, and overarching data types.

- **`/runtime`**: Environment constraints, feature toggles, SQLite core layout/extensions, and diagnostics.
- **`/setup`**: Orchestrator utilities for initializing Synapse on first run.
- **`/migrations`**: Database schema evolution and configuration migrations.

### 3. Interfaces (`src/interfaces/`)
The external boundaries where the outside world interacts with Synapse. These orchestrate the engine domains and consume runtime utilities, acting entirely as wrappers/adapters.

- **`/cli`**: Local human-in-the-loop interaction layers. Responsible for arg parsing, ANSI outputs, spinners, etc.
- **`/mcp` & `/app`**: Exposes Synapse as a Model Context Protocol (MCP) server for Claude/VSCode to consume autonomously. Holds tool registrations and STDIO/SSE lifecycle routing.

---

### Development Principles

- **Downwards Isolation**: `interfaces/` depends on `engine/` and `runtime/`. `engine/` depends on `runtime/`. `runtime/` depends on nothing inside the project.
- **No Side-by-Side Sprawl**: Features are kept structurally flat inside their specific domains. Single-file exports or barrel files are preferred over heavily nested monolithic files.
- **Barrel Files**: High-complexity directories like `src/core/engine/memory` expose external APIs solely via an `index.ts`.
