---
title: Code Intelligence
description: Hybrid BM25 + vector search, surgical AST-aware chunking, and precise symbol resolution.
---

# Code Intelligence

Synapse gives your AI agent **elite code understanding**—not just keyword matching, but structural comprehension of your entire codebase. By fusing two retrieval strategies with surgical AST parsing, Synapse surfaces the most relevant context with extreme precision.

:::tip Precision Retrieval
Most code search tools force a choice between exact text matching *or* semantic similarity. Synapse does both, fusing the results via **Reciprocal Rank Fusion (RRF)** to ensure your AI gets the right code every time.
:::

## The Hybrid Search Engine

Synapse runs a **Hybrid Rank Fusion** algorithm that combines the strengths of lexical and semantic retrieval in a single query via `search_hybrid`.

| Strategy | Engine | Best For... |
| :--- | :--- | :--- |
| **Lexical** | BM25 | Exact function names, identifiers, unique error messages. |
| **Semantic** | Vector | Conceptual search, "plain English" descriptions, finding similar logic. |

```bash
// Example: "Find logic that handles user permission validation"
search_hybrid({ query: "validate user permissions" })
// Returns exact symbols like `validatePermissions()` AND semantically 
// relevant code like `checkUserRole()` or `hasAccess()`.
```

## Surgical AST-Aware Chunking

Traditional tools split code at arbitrary line limits, often severing functions in half. Synapse uses **Abstract Syntax Tree (AST)** parsing (via `tree-sitter`) to index code at its natural boundaries.

Every chunk is:
- **Atomic**: A complete function, class, or method. Never a fragment.
- **Self-Contained**: Retains its parent class, imports, and type signatures.
- **Language-Aware**: Optimized for TypeScript, JavaScript, Python, Go, Rust, and Bash.

## Symbol Resolution Suite

Synapse builds a comprehensive, cross-linked symbol index for your workspace, allowing agents to navigate code like a senior developer.

| Tool | Capability | Use Case |
| :--- | :--- | :--- |
| `find_definition` | Declaration Jump | Jump directly to the source of a specific function. |
| `find_usages` | Reference Finding | See everywhere a symbol is used before refactoring. |
| `find_callers` | Impact Analysis | Identify every function that invokes a critical API. |
| `get_symbol` | Meta-Discovery | Get full metadata including exports and visibility. |
| `summarize_project` | Architectural Map | Get a high-level overview of the project structure. |

## Why it Matters for AI Agents

Standard RAG (Retrieval-Augmented Generation) often fails because it misses the structural relationships in code. Synapse's **Code Intelligence** layer ensures that when an agent asks for context, it receives:
1. The **correct logic** (via Hybrid Search).
2. The **complete structure** (via AST-Aware Chunking).
3. The **related symbols** (via Symbol Resolution).

This "Surgical Context" approach reduces token waste and eliminates "hallucinations" caused by incomplete code snippets.

---

**Next:** Learn how code-level facts are connected to architectural history in the **[Knowledge Graph](temporal)**.
