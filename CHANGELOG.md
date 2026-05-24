# Changelog

All notable changes to synapse-cortex are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)  
Versioning: [CalVer](https://calver.org/) — `YYYY.MM.PATCH[-beta.N]`

## [Unreleased]

### Fixed
- **CLI Bootstrap Resilience**: Re-engineered the CLI entrypoint (`bin/synapse.js`) to be completely dependency-free for core commands. `synapse --version` and `synapse help` now work even if `node_modules` is missing or corrupted.
- **Robust Auto-Relaunch**: Improved the `tsx` relauncher to handle missing loader dependencies gracefully, providing actionable instructions instead of internal module resolution crashes.

### Added
- **Incremental Delta-Indexing (S02)**: Implemented surgical index updates for only changed/deleted files, significantly reducing re-indexing overhead in large workspaces.
- **Multi-Root Discovery (S03)**: Implemented recursive project detection in monorepo structures (depth limit: 3).
- **Graceful Lite Mode**: Heavyweight native dependencies (`@huggingface/transformers`, `sqlite-vec`) are now optional. The system automatically detects missing backends and degrades to "Lite Mode" (Lexical search + KG) instead of failing to install or start in restricted environments.



## [2026.05.4] - 2026-05-22

### Changed
- **Technical Positioning Overhaul**: Replaced all 'minimalist' branding with 'self-contained' and 'local-first' to accurately reflect the powerful technical engine.
- **Documentation 2.1**: Added concrete 'See It In Action' demonstration to README.

### Fixed
- **N+1 Query Resolution**: Optimized the `SqliteVecIndexService` to pre-fetch file signatures in bulk, significantly improving indexing speed in large workspaces.
- **CI/CD Reliability**: Fixed a critical hang in the release pipeline by ensuring `ripgrep` is installed in the Ubuntu runner environment.
- **Code Health**: Removed several unused imports and constants across the engine and tool suites.

### Added
- **Multi-Root Preparation**: Initial infrastructure for Milestone M2 (Adaptive Indexing & Multi-Root Discovery).

## [2026.05.3-beta.0] - 2026-05-22

## [2026.05.2] - 2026-05-21

### Fixed
- **AST Chunking Stability**: Fixed a critical `TypeError` during AST initialization by upgrading `tree-sitter` to `^0.25.0` and adding a robust type shim for optional dependency stability.

## [2026.05.1] - 2026-05-21

### Changed
- **Initial CalVer Release**: Transitioned from SemVer to Calendar Versioning (`YYYY.MM.Patch`).
- **Identity Unification**: Consolidated branding as **Synapse** (published as `synapse-cortex` on npm).
- **Documentation 2.0**: Full Diátaxis restructuring with an Agent-First context layer (`llms.txt`, `SKILL.md`).
- **Branding Overhaul**: Shifted positioning from 'minimalist' to 'self-contained' to reflect the powerful local engine.

### Fixed
- **Windows Core Hardening**: Fixed ESM loader issues, file locking bugs in `synapse doctor`, and SQLite-vec syntax errors on Windows.
- **Power Controllers**: Finalized the consolidation of 72+ granular tools into 14 high-density MCP Power Controllers for maximum token efficiency.

### Added
- **Distribution Stability**: Included `.mcp.json.example` in the package for easier client configuration.

## [2026.05.1-beta.1] - 2026-05-21

### Fixed
- **AST Chunking Fix**: Resolved a critical regression where mismatching `tree-sitter` versions caused a `TypeError` during language initialization. Upgraded core `tree-sitter` to `^0.25.0`.

## [2026.05.1-beta.0] - 2026-05-15

### Added
- **Agent-First Layer**: Added `llms.txt` and `SKILL.md` for rapid context ingestion by AI agents (GEO).

### Changed
- **Diátaxis Restructure**: Completely reorganized documentation into focused categories.
- **CI/CD Optimization**: Refactored GitHub Actions to run jobs in parallel.

## [2026.05.0] - 2026-05-15

### Changed
- **CalVer Transition**: Switched from SemVer to Calendar Versioning.
- **Tool Density**: Consolidated 72+ granular tools into 12 high-density "Power Controllers".

## [1.0.0] - 2026-05-12

### Added
- **Official Launch**: Transition from beta to stable release.

## [0.0.1-beta.4] - 2026-05-12

### Fixed
- **SQL Injection Fix**: Secured `Backup` service against SQL injection.
- **Type Safety**: Removed redundant `@ts-ignore` and `any` types.

## [0.0.1-beta.3] - 2026-05-08

### Changed
- **Dependency Inversion**: Centralized core service interfaces.
- **Performance**: Implemented `WeakMap`-based memoization for AST node lookups.
- **Context Optimization**: Standardized result sets onto a single `items[]` array.

## [0.0.1-beta.2] - 2026-05-03

### Fixed
- **Dependency Stabilization**: Resolved strict peer dependency conflicts with `tree-sitter`.
- **Search Binary Fix**: Replaced `ripgrep-bin` with `@vscode/ripgrep`.

## [0.0.1-beta.1] - 2026-05-03

### Changed
- **Package Rename**: Official redistribution as `synapse-cortex` on npm.
