# Release Plan: Loci v0.0.1-beta.4

## 🎯 Primary Objective
Maximize token efficiency and context compression to provide AI agents with more high-signal data in fewer tokens.

## ✅ Completed Tasks
- [x] **Smart Code Reads:**
    - Added `mode: 'signatures'` to `synapse_read_file`.
    - Integrated Tree-sitter for surgical extraction of function and class declarations.
- [x] **Compact Project Exploration:**
    - Added `compact: true` to `synapse_project_tree`.
    - Implemented directory grouping and file type summarization to reduce tree size by ~70% for large projects.
- [x] **Intelligent Tool Outputs:**
    - Implemented repetition collapsing for redundant command outputs.
    - Added automatic truncation with "Raw Log" resource links for long outputs to prevent context flooding.
- [x] **Efficiency Format Tiers:**
    - Finalized `compact` and `lite` modes across all search and retrieval tools.
    - Standardized `items[]` array as the canonical result shape.
- [x] **Hardening & Type Safety:**
    - Removed 20+ `@ts-ignore` and `any` types.
    - Secured `Backup` service against SQL injection.
- [x] **Documentation & Health:**
    - Added Cache Fallback troubleshooting to `README.md`.
    - Updated `loci doctor` with enhanced writable path checks.

## 🚀 Next Milestone: Adaptive Indexing & Multi-Root Intelligence (v0.0.1-beta.5)
We will focus on scale and multi-repo support:
- [ ] Adaptive indexing triggers (background delta indexing).
- [ ] Multi-root project context synthesis.
- [ ] Enhanced cross-file symbol tracking (cross-repo definitions).

## 🛠️ Maintenance & CI/CD
- [x] Updated GitHub Actions to test across Node 18, 20, and 22.
- [x] Resolved CI deprecation warnings for Node.js 20 actions.
- [ ] Finalize `gh` integration for automated beta 4 release.
