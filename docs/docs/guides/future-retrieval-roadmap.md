# Future Retrieval Roadmap

Last reviewed: 2026-03-12

This note captures retrieval/backend research that should remain easy to pick up in future work.
It is intentionally opinionated: the goal is to narrow the search space for Synapse rather than
keep every option equally open.

## Primary Constraints

- local-first by default
- no required background service for the default path
- migration should be rebuild-based from local source files, not export/import-heavy
- better semantic retrieval without weakening exact code search
- minimal runtime and packaging burden
- keep Synapse aligned with stdio MCP and in-process execution where possible

## Current Position

Synapse already keeps exact search and hybrid orchestration locally:

- `ripgrep`/lexical search remains the best path for exact code and symbol lookups
- semantic search is the backend seam
- fusion/reranking happens in Synapse, not in the backend

Implication:

- a backend replacement should improve the semantic layer first
- it does not need to replace `search_files` or `search_code`
- memory should remain a separate concern from semantic indexing

## Recommendation Summary

### Keep Today

- Keep `sqlite-vec` as the default semantic backend for now.
- Keep SQLite-backed memory as-is.
- Keep local lexical search and local reranking in Synapse.

### Near-Term Research Direction

- Track `vec1` as the most promising future minimal SQLite-native vector option.
- If a stronger backend becomes necessary before `vec1` is ready, evaluate LanceDB before Qdrant.

### Avoid As Default

- Do not silently replace `sqlite-vec` with Qdrant.
- Do not move the default product shape toward a required local service.
- Do not add a generative LLM to the hot query path.

## Backend Assessments

### Qdrant

Status:

- powerful, mature, and strong for large semantic retrieval workloads
- good optional backend candidate
- poor default replacement for Synapse today

Why it is attractive:

- strong hybrid and multistage query features
- named vectors and payload filtering
- scaling, snapshots, aliases, quantization

Why it is a bad silent default swap:

- JS integration expects a running REST/gRPC service
- adds operational surface: process management, ports, storage, security hardening
- worsens the local in-process simplicity that Synapse currently promises
- migration would be rebuild-based, not transparent reuse of the existing SQLite DB
- likely faster only for larger semantic-search-heavy workloads, not all local repo workloads

Decision:

- do not make Qdrant the default backend
- revisit only as an explicit opt-in backend if Synapse later supports larger shared or hosted deployments

### LanceDB

Status:

- strongest embedded/local alternative researched so far
- better fit than Qdrant for Synapse's local-first design

Why it is attractive:

- embedded OSS mode with local path usage
- TypeScript SDK support
- vector search, FTS, hybrid search, reranking, schema evolution, versioning

Why it is not the immediate default move:

- still implies a real backend migration and validation project
- Synapse already owns lexical search and fusion logic, so benefit needs to justify complexity

Decision:

- strongest candidate if Synapse wants a more capable local semantic backend before `vec1`

### DuckDB VSS

Status:

- attractive on paper because of SQL familiarity
- not mature enough for Synapse's default path

Why it is blocked:

- vector extension remains experimental
- persistent HNSW support is explicitly still behind experimental controls

Decision:

- not suitable as the default retrieval backend today

### Milvus Lite / Weaviate / Typesense

Status:

- all are capable systems
- none match Synapse's minimal local default as well as embedded/file-backed options

Main issue:

- they push Synapse toward a service-first or heavier deployment model

Decision:

- not prioritized for Synapse's current product direction

### SQLite-Vector / SQLite-AI

Status:

- very interesting technically
- close to the desired shape: local, SQLite-native, minimal

Main issue:

- licensing is the blocker, not capability

Decision:

- do not treat as the default Synapse path unless licensing constraints become acceptable

### vectorlite

Status:

- interesting experimental SQLite-native option

Why it is interesting:

- local SQLite extension
- HNSW-based ANN
- npm package exists

Why it is risky:

- beta quality
- no transaction support
- index is held in memory

Decision:

- acceptable only for experimental prototyping, not the default backend

### vec1

Status:

- most promising long-term minimal option
- SQLite-native and aligned with Synapse's design goals

Why it matters:

- minimal integration story
- likely the cleanest replacement path if it becomes stable and production-ready

Current caveat:

- treat it as "watch closely", not "adopt now", until release maturity is clearer

Decision:

- keep `sqlite-vec` today
- track `vec1` as the preferred future replacement candidate

## Local LLM For Reindexing

### Main Conclusion

If Synapse uses a small local LLM in indexing, it should be used for metadata enrichment only.

It should not be used for:

- embeddings
- exact symbol extraction
- hot-path query answering
- per-query reranking in the default path

### Best-Use Pattern

Use a small local model to enrich changed files or changed chunks with derived metadata such as:

- short summary
- keywords
- aliases or user-facing terms
- API surface hints
- side effects
- concepts

This derived metadata can then be appended to semantic text before generating embeddings.

### Qwen2.5-Coder-1.5B-Instruct

Status:

- strong candidate for local code-oriented enrichment
- small enough to consider for background indexing jobs

Where it helps:

- code summarization
- alias generation for poorly named code
- unsupported-language fallback enrichment
- semantic text improvement before embedding

Where it does not help enough:

- replacing embedding models
- replacing exact lexical/symbol search
- running on every query

### Qwen2.5-1.5B-Instruct

Status:

- better general-purpose small model

Where it may be preferable:

- docs/config/table-oriented enrichment
- stricter structured JSON extraction

### Suggested LLM Integration Rules

- opt-in only
- background indexing only
- cache by file signature
- process changed files only
- strict JSON output schema
- deterministic fallback if model inference fails

Example enrichment payload:

```json
{
  "summary": "",
  "keywords": [],
  "aliases": [],
  "api_surface": [],
  "side_effects": [],
  "concepts": []
}
```

## Future Plan

### Phase 0: Preserve Current Strengths

- keep `sqlite-vec` default
- keep JSON fallback
- keep local lexical search untouched

### Phase 1: Prepare For Backend Swaps

- tighten the semantic backend contract so only semantic indexing/search are swappable
- keep Synapse's fusion/reranking logic outside the backend
- keep memory on SQLite regardless of semantic backend experiments

### Phase 2: Add Optional Enrichment

- prototype Qwen-based enrichment behind a disabled-by-default flag
- run only during indexing
- cache by file signature
- measure whether enriched semantic text improves retrieval enough to justify the runtime cost

### Phase 3: Evaluate Next Minimal Backend

Preference order:

1. `vec1` when it is stable enough
2. LanceDB if a stronger backend is needed sooner
3. Qdrant only as an explicit advanced backend, never as a silent default swap

### Phase 4: Migration Model

Migration should always be:

- choose backend
- rebuild semantic index from source files
- validate search quality
- cut over

Avoid:

- direct DB-to-DB migration requirements
- one-way silent backend upgrades

## Resume Checklist

If this work resumes later, start with these questions:

1. Is `vec1` production-ready enough to replace `sqlite-vec`?
2. Is LanceDB still the strongest embedded/local alternative?
3. Is Qwen-based enrichment measurably better than plain chunk text?
4. Do Synapse users actually need a stronger semantic backend, or is the bigger issue chunk quality and metadata?

## Research Links

- Qdrant docs: [qdrant.tech/documentation](https://qdrant.tech/documentation/)
- Qdrant JS client: [github.com/qdrant/qdrant-js](https://github.com/qdrant/qdrant-js)
- LanceDB docs: [docs.lancedb.com](https://docs.lancedb.com/)
- DuckDB VSS docs: [duckdb.org/docs/vss](https://duckdb.org/docs/stable/core_extensions/vss.html)
- Milvus Lite docs: [milvus.io/docs/milvus_lite](https://milvus.io/docs/milvus_lite.md)
- Weaviate docs: [docs.weaviate.io](https://docs.weaviate.io/)
- Typesense docs: [typesense.org/docs](https://typesense.org/docs/)
- SQLite-Vector: [github.com/sqliteai/sqlite-vector](https://github.com/sqliteai/sqlite-vector)
- SQLite-AI: [github.com/sqliteai/sqlite-ai](https://github.com/sqliteai/sqlite-ai)
- vectorlite: [github.com/1yefuwang1/vectorlite](https://github.com/1yefuwang1/vectorlite)
- SQLite vec1: [sqlite.org/vec1](https://sqlite.org/vec1)
- Qwen2.5-Coder-1.5B-Instruct: [huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct)
- Qwen2.5-1.5B-Instruct: [huggingface.co/Qwen/Qwen2.5-1.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct)
- Qwen2.5-Coder-1.5B-Instruct ONNX: [huggingface.co/onnx-community/Qwen2.5-Coder-1.5B-Instruct](https://huggingface.co/onnx-community/Qwen2.5-Coder-1.5B-Instruct)
- Qwen2.5-Coder-1.5B-Instruct GGUF: [huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF](https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF)
