<!-- cspell:ignore synapse SYNAPSE reranker RERANKER SARIF stopword optimised prefiltering -->

# Changelog

All notable changes to this project will be documented in this file.

## [0.0.1-beta.2] - 2026-05-03

### 🛠️ Hotfixes
- **Dependency Stabilization**: Resolved strict peer dependency conflicts with `tree-sitter` and its language parsers that were preventing clean global installations.
- **Search Binary Fix**: Replaced problematic `ripgrep-bin` with `@vscode/ripgrep` to ensure `rg` works flawlessly across all platforms without requiring native compilation (make/gcc) on Windows.

## [0.0.1-beta.1] - 2026-05-03

### 🔄 Redistribution & Sync
- **Package Rename**: Official redistribution as `synapse-cortex` on npm.
- **CI/CD Stabilization**: Synchronized version markers and release tags for automated distribution.

## [0.0.1-beta] - 2026-05-03

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
