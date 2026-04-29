# Technology Stack

**Project:** Synapse
**Researched:** April 2026

## Recommended Stack

### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node.js | 22.13+ | Runtime | Built-in `node:sqlite` with `DatabaseSync` support. |
| MCP SDK | Current | Interface | Standard Model Context Protocol for AI tool interop. |
| Tree-sitter | Latest | AST Parsing | Accurate symbol extraction and code chunking. |

### Database
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| SQLite | 3.45+ | Storage | Local-first, zero-config, ACID compliant. |
| `sqlite-vec` | Latest | Vectors | Embedded vector search extension for SQLite. |

### Infrastructure
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Ripgrep (rg) | Latest | Lexical Search | Industry-standard speed for text search. |
| Transformers.js | Latest | Embeddings | Local embedding generation (e.g., Xenova/all-MiniLM-L6-v2). |

### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@huggingface/transformers` | Latest | Embeddings | When local semantic search is enabled. |
| `onnxruntime-node` | Latest | Inference | Acceleration for local embedding models. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Vector DB | `sqlite-vec` | Qdrant | Qdrant requires a running service; `sqlite-vec` is in-process. |
| Vector DB | `sqlite-vec` | LanceDB | LanceDB is strong but implies a larger architectural shift than SQLite-native. |
| Memory Storage | SQLite | Neo4j | Neo4j is overkill for local-first; SQLite recursive CTEs handle graph queries well. |

## Installation

```bash
# Core installation
npm install -g synapse

# Local embedding support (optional)
npm install --no-save @huggingface/transformers
```

## Sources

- `C:\Jenil\synapse\README.md`
- `C:\Jenil\synapse\docs\docs\guides\future-retrieval-roadmap.md`
- `C:\Jenil\synapse\src\core\engine\memory\service.ts`
