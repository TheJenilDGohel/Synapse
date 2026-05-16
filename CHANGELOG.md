<!-- cspell:ignore synapse SYNAPSE reranker RERANKER SARIF stopword optimised prefiltering -->
# Changelog

All notable changes to this project will be documented in this file.

## [2026.05.1-beta.0] - 2026-05-15

### 📚 Documentation (Diátaxis & Agent-First)
- **Agent-First Layer**: Added `llms.txt` and `SKILL.md` for rapid context ingestion by AI agents (GEO).
- **Diátaxis Restructure**: Completely reorganized documentation into focused categories: Tutorials, How-to Guides, Reference, and Explanation.
- **Neural Branding**: Refined documentation content to reflect Synapse's bio-inspired architecture.

### ⚡ CI/CD Optimization
- **Parallelization**: Refactored GitHub Actions to run 7 quality jobs in parallel, reducing fast-path feedback to < 2 minutes.
- **Job Splitting**: Separated Unit, Integration, and E2E tests into dedicated jobs with optimized matrices.
- **Path Filtering**: CI now intelligently skips heavy test suites for documentation-only changes.
- **Granular Tooling**: Added `quality:*` scripts to `package.json` for precise pipeline control.

### 🔄 Versioning
- **CalVer Standard**: Fully transitioned to `YYYY.MM.Patch` with zero-padded months for consistency.
- **Automation**: Implemented `bump-version.mjs` to handle automated CalVer increments and beta cycles.

## [2026.05.0] - 2026-05-15

### 🔄 Versioning
- **CalVer Transition**: Switched from SemVer to Calendar Versioning (`YYYY.MM.Patch`) for better alignment with the rapid release cycle and temporal context mission.
- **Leading Zero Standard**: Standardized on zero-padded months (e.g., `2026.05.0`) for consistent sortability and readability.

### 🚀 Tool Density & AI Compatibility
- **JIT Loading**: Implemented just-in-time tool loading to reduce the initial MCP schema size and token overhead.
- **Tool Categorization**: Introduced hierarchical tool categories for improved discovery via `synapse_help` and `synapse_discovery`.
- **Power Controllers**: Consolidated 72+ granular tools into 12 high-density "Power Controllers" using flat JSON objects for maximum compatibility.
  - `synapse_memory_manage`: Consolidated store, update, delete, relations, ingestion, and workflow teach/outcome.
  - `synapse_memory_query`: Consolidated list, recall, context, events, and taxonomy.
  - `synapse_search`: Consolidated file, code, hybrid, and unified search.
  - `synapse_symbol_query`: Consolidated callers, definition, implementations, usages, and rename preview.
  - `synapse_workspace_manage`: Consolidated root listing, project mapping, tree exploration, and file reading.
  - `synapse_system_manage`: Consolidated indexing, health audits, database maintenance, and updates.
- **Gemini Compatibility**: Refactored all tool schemas to use flat objects and explicit parameter descriptions, resolving discovery issues in Gemini and Vertex AI clients.
- **Breaking Changes**: Removed 60+ redundant granular tools in favor of unified controllers to minimize context window "tax".

## [1.0.0] - 2026-05-12

### 🚀 Stable Release
- **Official Launch**: Transition from beta to stable release.
- **Production Ready**: Full stabilization of the core engine and tool suites.
- **Enhanced Verification**: Exhaustive sandbox installation and usage validation.

## [0.0.1-beta.4] - 2026-05-12

### 🛡️ Hardening & Security
...
- **SQL Injection Fix**: Secured `Backup` service against SQL injection in `VACUUM INTO` operations.
- **Type Safety**: Removed 20+ `@ts-ignore` and `any` types across the codebase, replacing them with proper type declarations and `ts-expect-error` where necessary.
- **Dependency Audit**: Merged 10+ dependency updates for core libraries and GitHub Actions.

### ⚡ Performance Optimization
- **N+1 Query Resolution**: Optimized entity recall and entry batch deduplication to eliminate N+1 query patterns.
- **Async I/O**: Refactored chunker and ingestion pipelines to use asynchronous file system operations, improving throughput for large workspaces.
- **Batch Operations**: Implemented batch file removals in SQLite VEC service.

## [0.0.1-beta.3] - 2026-05-08

### 🛡️ Hardened Foundations
- **Dependency Inversion (DIP)**: Centralized all core service interfaces in `src/core/interfaces/services.ts`. All external entrypoints (CLI, MCP) now depend on abstractions rather than concrete implementations.
- **Service Registry Refactor**: Stabilized the `CoreServiceRegistry` for centralized dependency management, eliminating "God Object" patterns and circular imports.
- **DSA Performance**: Implemented `WeakMap`-based memoization for AST node lookups. Reduced AST scope resolution complexity from **O(N²)** to **O(N)** amortized.

### 📉 Context Optimization
- **High-Density Bundling**: Consolidated 27+ Knowledge Graph tools into high-density `synapse_kg_manage` and `synapse_kg_query` controllers using discriminated unions.
- **Output Standardization**: Standardized all search/retrieval tools onto a single `items[]` array, reducing token overhead by **~40%**.
- **Efficiency Tiers**: Introduced `compact` and `lite` format modes for memory and KG queries, enabling up to **85% token savings** for large result sets.

### 🛠️ Core & Engine
- **Bug Fixes**: Resolved 9 critical build blockers, including invalid regex ranges in heuristics and stale property access in the search service.
- **Enhanced Normalization**: Introduced the `McpResponseMapper` to unify and optimize tool output across the platform.
- **Clean Slate**: Removed redundant test files and legacy tool definitions to streamline the codebase.

## [0.0.1-beta.2] - 2026.5.03

### 🛠️ Hotfixes
- **Dependency Stabilization**: Resolved strict peer dependency conflicts with `tree-sitter` and its language parsers that were preventing clean global installations.
- **Search Binary Fix**: Replaced problematic `ripgrep-bin` with `@vscode/ripgrep` to ensure `rg` works flawlessly across all platforms without requiring native compilation (make/gcc) on Windows.

## [0.0.1-beta.1] - 2026.5.03

### 🔄 Redistribution & Sync
- **Package Rename**: Official redistribution as `synapse-cortex` on npm.
- **CI/CD Stabilization**: Synchronized version markers and release tags for automated distribution.

## [0.0.1-beta] - 2026.5.03

### 🚀 Zero-Friction Installation
- **Bundled ripgrep**: Integrated `ripgrep-bin` for out-of-the-box code search even if system-wide `rg` is missing.
- **Improved Platform Support**: Enhanced path resolution for Windows and automated native extension management.
- **Smart Hooks**: Automated memory-capture hook installation for Claude Code with legacy path migration.

### 🧠 Intelligence & Core
- **Restored Services**: Fully recovered `NERService` and `ClassifierService` for on-device entity extraction.
- **Skill Optimization**: Bundled skills now auto-adapt to 9+ AI clients (Cursor, Windsurf, Claude, etc.).
- **Health Diagnostics**: Upgraded `synapse doctor` with 9 comprehensive health checks.

### 📖 Documentation & UX
- **Consolidated Truth**: `README.md` is now the single source of truth for the project.
- **Neural Aesthetic**: Polished bio-inspired UI elements for documentation and dashboard.
- **Repository Readiness**: Polished `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and community standards for open-source excellence.

### 🤖 CI/CD
- **Automated Releases**: New GitHub Actions pipeline for synchronized npm and GitHub distribution.
- **Provenance Attestation**: Enabled OIDC trusted publishing for verifiable package integrity.

---

## [0.3.2] - 2026-04-16

### Fixed

- **Windows: `sqlite-vec-extension.ts` bare `npm` spawn** — `detectGlobalNpmRoot()` and the sqlite-vec auto-installer used bare `'npm'` in `spawnSync`, which fails on Windows (needs `npm.cmd`). Now uses platform-aware `NPM_CMD` constant + `shell: isWindows` on the install call.
- **Windows: `agent-prime.ts` bash shell pipeline** — `getRecentChanges()` used a single `execSync` with bash-only `2>/dev/null || ... || echo` pipeline. Refactored to sequential try/catch calls that work on both bash and cmd.exe.

...
