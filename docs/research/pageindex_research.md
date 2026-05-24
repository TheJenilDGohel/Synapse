# Vectorless Reasoning-based RAG (PageIndex) Research

## Overview of PageIndex

PageIndex proposes a "Vectorless, Reasoning-based RAG" structure.
Instead of chunking documents and pushing them into a Vector DB for similarity-based retrieval, it:
1. Parses documents and builds a hierarchical semantic tree (Table of Contents style).
2. Embeds the hierarchy in JSON format with node summaries and IDs.
3. Exposes the tree to LLMs to perform "tree search", simulating human navigation through a long document.

## Fit for Synapse-Cortex

### Current Synapse Architecture
Synapse currently uses `sqlite-vec` to store embeddings for chunks and `BM25` for lexical search (Hybrid Search).
It generates code chunks using Tree-Sitter (AST-aware chunking).

### Would it be beneficial?
Yes, for the following reasons:
1. **Explainability**: Searching through a tree provides absolute certainty about where the context came from.
2. **Context-Aware**: Vector search lacks broader document context; returning isolated chunks often misses the overall architecture. Tree search inherently preserves the document structure.
3. **Synergy**: Synapse already extracts a "project tree" (`synapse_project_tree`) and "summarizes projects" (`synapse_summarize_project`). Extending this to a "file tree structure" (PageIndex-like) would bridge the gap between file-level and symbol-level navigation.

### Implementation Strategy for Prototype
To prototype this in `synapse-cortex`, we can create a new tool: `synapse_pageindex_tree`.
- **Target**: Parse a Markdown/Text file, generate a structured TOC (Table of Contents) using Markdown headers or AST symbols.
- **Node Navigation**: Create a tool `synapse_pageindex_read_node` to allow the LLM to read a specific node's content based on its ID.
- **Testing**: Test the LLM's ability to retrieve information accurately using tree navigation vs `synapse_search_hybrid`.
