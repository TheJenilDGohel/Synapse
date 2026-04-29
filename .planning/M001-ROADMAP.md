# Roadmap - Synapse Performance & Expansion

## Phases

- [x] **Phase 1: Stabilization & Scaling** - Ensure reliability and performance for large-scale production use.

- [x] **Phase 2: Local Enrichment** - Improve context quality via background local LLM indexing.
- [x] **Phase 3: Multi-Language Expansion** - Broaden AST-aware intelligence to Python, Go, and Rust.

## Phase Details

### Phase 1: Stabilization & Scaling
**Goal**: Ensure core reliability and high performance at scale across all major platforms.
**Depends on**: Existing v0.3.2 foundation
**Requirements**: STAB-01, PERF-01, PERF-02
**Success Criteria**:
  1. No "binary not found" or "extension load failed" reports across Windows, macOS, and Linux.
  2. Search latency remains <500ms on repositories exceeding 10M vectors.
  3. Validated prototype of advanced semantic backend (vec1/LanceDB) demonstrates clear scaling advantage.
**Plans**: 
- [x] 01-01-PLAN.md — Foundation & Platform Verification (STAB-01)
- [x] 01-02-PLAN.md — Scaling Implementation (vec1 migration) (PERF-02)
- [x] 01-03-PLAN.md — Performance Optimization (10M bench) (PERF-01)

### Phase 2: Local Enrichment
**Goal**: Improve retrieval relevance by enriching raw code with AI-generated metadata.
**Depends on**: Phase 1
**Requirements**: ENR-01, ENR-02, UX-01
**Success Criteria**:
  1. System can run background indexing using Qwen2.5-Coder-1.5B without blocking user queries.
  2. Improved Mean Reciprocal Rank (MRR) for "conceptual" queries (e.g., "where is the retry logic?").
  3. Unified Find correctly prioritizes enriched metadata in hybrid scoring.
**Plans**: 
- [x] 02-01-PLAN.md — LLM Runtime Integration (ENR-01)
- [x] 02-02-PLAN.md — Background Enrichment Worker (ENR-01, ENR-02)
- [x] 02-03-PLAN.md — Metadata Schema & Search Fusion (ENR-02, UX-01)

### Phase 3: Multi-Language Expansion
**Goal**: Deliver high-fidelity code intelligence for non-TypeScript polyglot repositories.
**Depends on**: Phase 2
**Requirements**: LANG-01
**Success Criteria**:
  1. Accurate AST-aware chunking for Python, Go, and Rust (verified via `inspect_chunks`).
  2. Full symbol navigation (definitions/references) working across mixed-language projects.
**Plans**: 
- [x] 03-01-PLAN.md — Multi-Language Integration & Test Scaffold (LANG-01)
- [x] 03-02-PLAN.md — Query-Based AST Chunking (LANG-01)
- [x] 03-03-PLAN.md — Symbol Mapping & Retrieval Verification (LANG-01)

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Stabilization & Scaling | 3/3 | Completed | 2026-04-27 |
| 2. Local Enrichment | 3/3 | Completed | 2026-04-27 |
| 3. Multi-Language Expansion | 3/3 | Completed | 2026-04-28 |
