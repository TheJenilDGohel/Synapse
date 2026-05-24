# Synapse Architectural Overview

This document outlines the architectural principles and design patterns driving Synapse. The project strictly adheres to **Clean Architecture** and **SOLID** principles, ensuring that core business logic remains entirely decoupled from delivery mechanisms (like MCP or CLI) and infrastructure details (like specific SQLite drivers).

## 🏛️ Clean Architecture Layers

Synapse is structured into concentric layers. Dependencies point **inwards** only. Outer layers can depend on inner layers, but inner layers know nothing about the outside.

### 1. Core Domain (`src/core/engine/`)
The innermost layer contains the fundamental business rules and cognitive operations of Synapse.
- **Memory Domain**: Persistent fact storage, knowledge graph traversal, and taxonomy mapping.
- **Retrieval Domain**: Hybrid search (BM25 + Vector), AST chunking, and symbol resolution.
- **Intelligence Domain**: Dead Reckoning predictions, Immune System pattern matching, and Pre-Mortem risk analysis.

*Rule: This layer imports nothing from `src/interfaces/`. It operates purely on raw data adapters and domain types.*

### 2. Infrastructure & Contracts (`src/core/interfaces/` & `src/core/runtime/`)
This layer defines the contracts (Interfaces) that the Core Domain uses to interact with the outside world, and the concrete implementations of those contracts.
- **Service Registry**: `IServiceRegistry` acts as the central Dependency Injection (DI) container.
- **Adapters**: The `Adapter` interface abstracts away the underlying SQLite implementation (`node:sqlite` vs `better-sqlite3`), allowing the engine to run without knowing the exact database driver.

### 3. Delivery Mechanisms (`src/interfaces/`)
The outermost layer is responsible for translating user or agent intent into core domain operations.
- **MCP (`src/interfaces/mcp/`)**: Maps Model Context Protocol JSON-RPC calls to Core Engine operations. Normalizes responses (e.g., applying `terse` or `compact` filters to save tokens).
- **CLI (`src/interfaces/cli/`)**: Provides human-readable terminal commands mapping to the exact same Core Engine operations as MCP.

---

## 📐 SOLID Principles in Practice

Synapse enforces SOLID principles to maintain a highly maintainable, 100% local-first codebase:

### 1. Single Responsibility Principle (SRP)
Every module and class has exactly one reason to change. 
- `MemoryStore.ts` only orchestrates memory sub-services. It does not parse ASTs.
- `AstChunker.ts` only extracts code signatures. It does not write to the database.

### 2. Open/Closed Principle (OCP)
The system is open for extension but closed for modification.
- **MCP Tools**: Adding a new MCP tool does not require changing the Core Engine. You simply register a new tool definition in `src/interfaces/mcp/tools/` that calls existing engine methods.
- **Intelligence Engines**: The `IPredictionEngine` and `IImmuneSystem` contracts allow us to swap out prediction logic entirely without touching the CLI or MCP routers.

### 3. Liskov Substitution Principle (LSP)
Interfaces are strictly adhered to, allowing implementations to be swapped transparently.
- The `Adapter` interface guarantees that the engine can run against `NodeSqliteAdapter` or any future `WasmSqliteAdapter` without breaking changes, provided they fulfill the contract.

### 4. Interface Segregation Principle (ISP)
Clients are not forced to depend on interfaces they do not use.
- The `IServiceRegistry` exposes specific getters (`getMemory()`, `getSearch()`, `getPreMortem()`). Tools only request the specific services they need rather than relying on a monolithic god-object.

### 5. Dependency Inversion Principle (DIP)
High-level modules do not depend on low-level modules. Both depend on abstractions.
- The `MemoryWorkflowService` (a high-level orchestrator) does not instantiate the SQLite database. Instead, it receives an `IMemoryService` abstraction injected via its constructor.

---

## 📦 Directory Structure

```text
src/
├── core/
│   ├── engine/          # [DOMAIN] Core logic (Memory, Retrieval, Intelligence)
│   ├── interfaces/      # [CONTRACTS] DIP Interfaces (IServiceRegistry, Adapter)
│   ├── runtime/         # [INFRA] Configuration, Service instantiation, Health
│   └── storage/         # [INFRA] SQLite schemas and migrations
├── interfaces/
│   ├── cli/             # [DELIVERY] Command-line interface
│   ├── mcp/             # [DELIVERY] Model Context Protocol server
│   └── app/             # [DELIVERY] Entrypoints and service wiring
└── types/               # Global TypeScript definitions
```

## 🔒 Security & Privacy (Local-First)
Synapse's architecture guarantees zero data exfiltration. 
- **No Network Requests**: The core engine contains absolutely no outbound HTTP requests (unless explicitly configured to hit a local LLM for embeddings).
- **SQLite Isolation**: All context is stored in a local `.synapse/` folder within the user's home directory.
