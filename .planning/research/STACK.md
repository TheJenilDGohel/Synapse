# Technology Stack: AI Memory & Knowledge Graphs

**Project:** Loci
**Researched:** 2025-05-22

## Recommended Stack (Ecosystem Standard)

### Core Storage & Indexing
| Technology | Purpose | Rationale |
|------------|---------|-----------|
| **SQLite (FTS5 + Vec)** | Local Vector/Relational | Local-first standard. `sqlite-vec` or `vss` provides fast vector search without a separate process. |
| **FalkorDB / Graphiti** | Knowledge Graph | FalkorDB (redis-based) or Graphiti's incremental approach is preferred for performance over heavy Neo4j. |
| **Tree-sitter** | AST Parsing | Industry standard for multi-language semantic code understanding. |

### Protocol & Interoperability
| Technology | Purpose | Rationale |
|------------|---------|-----------|
| **MCP (Model Context Protocol)** | Agent Communication | Allows Loci to work instantly with Claude Code, Cursor, and Windsurf. |
| **JSON-RPC** | Transport | Underlying protocol for MCP; lightweight and standard. |

### Supporting Libraries
| Library | Purpose | When to Use |
|---------|---------|-------------|
| **LangChain/LangGraph** | Orchestration | If building the agent logic alongside the memory server. |
| **Pydantic** | Schema Validation | Defining strict memory models for automated extraction. |
| **Voyage/nomic-embed** | Local Embeddings | High-performance embeddings that can run on a MacBook/Desktop. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Vector DB | SQLite-Vec | Pinecone/Milvus | Requires cloud/docker; breaks "local-first" ease of use. |
| Graph DB | FalkorDB | Neo4j | Neo4j is memory-intensive and harder to bundle in a CLI tool. |
| Code Parsing | Tree-sitter | Regex/LLM-only | Regex is imprecise; LLM-only is too slow/expensive for full-repo indexing. |

## Installation (Conceptual)

```bash
# Core MCP Server Setup
npm install @modelcontextprotocol/sdk sqlite-vec tree-sitter

# Optional Local Embedding
pip install fastembed  # High-speed local embeddings
```

## Sources
- [MCP Documentation](https://modelcontextprotocol.io)
- [sqlite-vec GitHub](https://github.com/asg017/sqlite-vec)
- [Zep/Graphiti Architecture](https://getzep.com)
