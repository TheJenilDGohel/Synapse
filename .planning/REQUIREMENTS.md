# Requirements

## v1: Performance & Expansion

### Stability & Performance
- **STAB-01**: Ensure cross-platform binary compatibility for `sqlite-vec` (Windows/macOS/Linux). (COMPLETED)
- **PERF-01**: Optimize vector indexing and search performance for repositories with >10M vectors. (COMPLETED)
- **PERF-02**: Prototype transition to advanced semantic backends (e.g., `vec1`, `LanceDB`) for better scaling. (COMPLETED - using sqlite-vec v0.1.0+)

### Metadata Enrichment
- **ENR-01**: Integrate local, privacy-preserving LLMs (e.g., Qwen2.5-Coder-1.5B) for background indexing. (COMPLETED)
- **ENR-02**: Generate and store enriched metadata for code chunks to improve retrieval quality. (COMPLETED)

### Multi-Language Support
- **LANG-01**: Broaden Tree-sitter AST support to include Python, Go, and Rust. (COMPLETED)

### Retrieval UX
- **UX-01**: Refine Unified Find reranking logic to better fuse results from Lexical, Semantic, and KG sources. (COMPLETED)

## v2: Documentation Ecosystem
- **RE-01**: React-based Documentation Site (Docusaurus). (COMPLETED)
- **RE-02**: Interactive Components & MDX. (COMPLETED)
- **RE-03**: Build Automation & Quality. (COMPLETED)

## v3: Stabilization & Release (M003)
- **M003-01**: Repair global `synapse` command shims and junction targets.
- **M003-02**: Fix installed-runtime MCP release sweep initialization failure.
- **M003-03**: Fix Windows-specific `synapse doctor` npm/npx detection (shell: true).
- **M003-04**: Fix `doctor --help` and `selftest --help` command execution bug.
- **M003-05**: Update `stress-synapse.mjs` to work with refactored engine architecture.
- **M003-06**: Standardize release script execution (npm scripts / tsx).
- **M003-07**: Unblock release gate and verify final exit criteria.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| STAB-01 | Phase 1 | Completed |
| PERF-01 | Phase 1 | Completed |
| PERF-02 | Phase 1 | Completed |
| ENR-01 | Phase 2 | Completed |
| ENR-02 | Phase 2 | Completed |
| LANG-01 | Phase 3 | Completed |
| UX-01 | Phase 2 | Completed |
| RE-01 | M2 Phase 1 | Completed |
| RE-02 | M2 Phase 2 | Completed |
| RE-03 | M2 Phase 3 | Completed |
| M003-01 | M003 Phase 1 | Completed |
| M003-02 | M003 Phase 1 | Completed |
| M003-03 | M003 Phase 1 | Completed |
| M003-04 | M003 Phase 2 | Completed |
| M003-05 | M003 Phase 2 | Completed |
| M003-06 | M003 Phase 2 | Completed |
| M003-07 | M003 Phase 3 | Completed |
| RE-01 | M4 Phase 1 | Completed |
| RE-02 | M4 Phase 2 | Completed |
| RE-03 | M4 Phase 3 | Completed |
