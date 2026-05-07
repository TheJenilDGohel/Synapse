---
title: Code Intelligence
description: Hybrid BM25 + vector search, AST-aware chunking, and precise symbol resolution for AI agents.
---

# Code Intelligence

Synapse gives your AI agent **elite code understanding** — not just keyword matching, but structural comprehension of your codebase. It combines two retrieval strategies, AST-aware parsing, and symbol-level indexing to surface the most relevant context with surgical precision.

## The Hybrid Search Engine

Most code search tools make you choose: exact text match *or* semantic similarity. Synapse runs both simultaneously and fuses the scores.

### BM25 (Lexical Retrieval)
Precise keyword matching — ideal for finding:
- Exact function names (`getUserById`)
- Specific variable identifiers
- Error message strings
- Import paths

### Vector (Semantic Retrieval)
Embedding-based similarity — ideal for finding:
- Code that *does* something, even with different naming
- Conceptually related functions across the codebase
- Implementations of a pattern you describe in plain English

### Hybrid Fusion
`search_hybrid` runs both in parallel and merges results using a weighted rank fusion algorithm. You get the precision of BM25 *and* the recall of vector search in a single query.

```
search_hybrid({ query: "validate user permissions before updating a resource" })
→ Returns: middleware functions, guard decorators, and permission checks
   across the entire codebase — even if none of them use those exact words
```

## AST-Aware Chunking

Traditional chunking splits code at arbitrary line limits, often cutting functions in half. Synapse uses **Abstract Syntax Tree (AST)** parsing via `tree-sitter` to index code at its natural boundaries.

Every chunk is:
- **Atomic** — a complete function, class, or method. Never a fragment.
- **Enriched** — bundled with its parent class, imports, and type signatures.
- **Context-preserved** — when a function is retrieved, its surrounding context is included automatically.

## Symbol Resolution

Synapse builds a full symbol index for your workspace. No more guessing where something is defined.

| Tool | What it does |
|:---|:---|
| `find_definition` | Jump to where a symbol is defined |
| `find_usages` | Find everywhere a symbol is used |
| `find_callers` | Find all functions that call a specific function |
| `find_implementations` | Find all implementations of an interface or abstract class |
| `get_symbol` | Get full metadata for a symbol (type, location, exports) |
| `rename_preview` | Preview all the places affected by renaming a symbol |

## Multi-Language Support

Synapse's intelligence layer is polyglot by design. Deep structural support for:

- **TypeScript / JavaScript**
- **Python**
- **Rust**
- **Go**
- **Dart**
- **And more...**

## All Code Intelligence Tools

| Tool | Purpose |
|:---|:---|
| `search_hybrid` | Primary entry point — fused BM25 + vector retrieval |
| `search_code` | Code-specific semantic search with syntax filtering |
| `search_files` | Find files by name, path pattern, or content |
| `find` | Low-level text/regex search across the workspace |
| `find_definition` | Symbol definition lookup |
| `find_usages` | All references to a symbol |
| `find_callers` | All callers of a function |
| `find_implementations` | Implementations of interfaces/abstract classes |
| `get_symbol` | Symbol metadata and export info |
| `rename_preview` | Impact preview for symbol renames |
| `summarize_project` | High-level architectural map of the project |
| `project_tree` | Directory structure with context awareness |
| `read_file` | Optimized file reading for large codebases |

## Real-World Example

> *"Find all places where we're directly accessing the database without going through a repository."*

Synapse calls `search_hybrid` with a semantic query, finds all direct ORM/DB calls, cross-references with `find_usages` on repository interfaces, and surfaces the specific files and lines where the pattern is violated — without you writing a single regex.

---

**Next:** Learn how code-level facts are connected to architectural history in the **[Knowledge Graph](/pillars/temporal)**.
