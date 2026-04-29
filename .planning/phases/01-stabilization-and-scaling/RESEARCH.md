# Phase 1: Stabilization & Scaling - Research

**Researched:** April 2026
**Domain:** SQLite Vector Search & Cross-Platform Reliability
**Confidence:** HIGH

## Summary
The research confirms that `sqlite-vec` is the optimal starting point for Synapse's vector needs due to its "run-anywhere" C-based architecture. However, scaling to 10M vectors requires a transition from `vec0` (brute-force) to `vec1` (ANN-indexed). For platform stability, the official Node.js loading patterns must be strictly followed to handle pre-compiled binaries correctly.

## Architectural Responsibility Map
| Capability | Primary Tier | Rationale |
|------------|--------------|-----------|
| Vector Storage | Database (SQLite) | Embedded storage keeps data local and minimizes latency. |
| Vector Indexing | Database (Extension) | Offloading ANN logic to C extensions (`sqlite-vec`) ensures performance. |
| Binary Management | Build/Install (NPM) | Automation of platform-specific binary fetching is handled by the package manager. |

## Standard Stack
### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `sqlite-vec` | ^0.1.9 | Vector Search Extension | Official, pure C, cross-platform binaries. |
| `better-sqlite3`| ^11.0.0 | SQLite Engine | High-performance Node.js bindings with extension support. |

## Platform Compatibility (Focus 1)
- **Binary Distribution:** `sqlite-vec` provides pre-compiled binaries for `linux-x64`, `linux-arm64`, `darwin-x64`, `darwin-arm64`, and `windows-x64`.
- **Zero-Friction Installation:**
  - Use `sqliteVec.getLoadablePath()` from the `sqlite-vec` npm package.
  - Avoid manual binary compilation; rely on the package's post-install scripts.
- **MacOS Specifics:** System-bundled SQLite often blocks `enable_load_extension`. The application must ensure it uses a version of SQLite (like the one bundled with `better-sqlite3`) that permits loading.

## 10M Vector Scaling (Focus 2)
- **vec0 vs vec1:**
  - `vec0` performs linear scans. At 10M vectors, query latency exceeds 1s, making it unusable.
  - `vec1` uses **IVFADC** (Inverted File with Asymmetric Distance Computation). This enables ANN search with millisecond latency at the cost of slight accuracy loss (~90-99% recall).
- **Alternatives:**
  - **LanceDB:** Highly recommended if `sqlite-vec` stability issues arise at 10M+. It is built on the Lance format specifically for high-scale vector data and offers native Node.js bindings.

## Automated Testing (Focus 3)
- **CI Strategy:** GitHub Actions matrix testing.
- **Platform Matrix:** `[ubuntu-latest, macos-latest, windows-latest, macos-14]` (to cover Intel and Silicon Mac).
- **Validation Test:** A minimal "Smoke Test" that loads the extension and runs `SELECT vec_version();`.

## Common Pitfalls
- **Extension Loading:** Attempting to load extensions on locked system SQLite versions (especially on macOS).
- **Memory Overhead:** HNSW-based extensions (like `vectorlite`) require significant RAM at 10M vectors; `sqlite-vec` (IVFADC) is more memory-efficient for disk-resident databases.

## Implementation Path (PLAN.md Preview)
1. **Wave 0:** Set up CI matrix to verify `sqlite-vec` loading across all platforms.
2. **Wave 1:** Refactor `VectorIndexService` to use `sqliteVec.getLoadablePath()`.
3. **Wave 2:** Implement a migration path from `vec0` to `vec1` virtual tables to support 10M vector scaling.
4. **Wave 3:** Benchmark 10M vector search and tune IVFADC "probe" counts for optimal speed/recall balance.
