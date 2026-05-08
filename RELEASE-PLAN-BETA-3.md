# Release Plan: Synapse v0.0.1-beta.3

## 🎯 Primary Objective
Resolve critical cross-platform installation issues and stabilize the environment for a broader range of systems.

## âœ… Completed Tasks
- [x] **Fatal Setup Errors Fixed:** Corrected import paths in `setup-synapse.mjs` and `upgrade-synapse.mjs` that broke after the `src/services` -> `src/core/engine` refactoring.
- [x] **Enhanced Installer Scripts:** Improved `install.sh` (Linux/Mac) to avoid unnecessary `sudo` usage and added Node.js 22 recommendation logic.
- [x] **Broadened Compatibility:** Lowered `engines.node` requirement to `>=18.0.0` with graceful fallbacks for missing `node:sqlite`.
- [x] **Metadata Unification:** Synchronized package name (`synapse-cortex`) and stale directory prefixes across all tools.
- [x] **Path Normalization Fixes:** Resolved Windows path boundary issues in `WorkspaceService`.
- [x] **Documentation Sync:** Updated `ARCHITECTURE.md`, `README.md`, and `CONTRIBUTING.md` to reflect current engine-centric structure.
- [x] **Context Optimization (v0.0.1-beta.3 Early Access):**
    - Bundled 27+ KG tools into `synapse_kg_manage` and `synapse_kg_query` controllers.
    - Standardized all search/retrieval tool outputs on a single `items[]` array.
    - Implemented `compact` and `lite` format tiers to reduce token overhead by ~65%.
    - Stabilized `CoreServiceRegistry` for centralized dependency management.

## ðŸš€ Next Milestone: Token Efficiency & Context Compression (v0.0.1-beta.4)
Inspired by `rtk-ai/rtk`, we will implement aggressive token-saving strategies:

### Phase 1: Smart Code Reads
- [x] Add `mode: 'signatures'` to `synapse_read_file`.
- [x] Use Tree-sitter (or regex fallback) to extract function/class declarations only.

### Phase 2: Compact Project Exploration
- [x] Add `compact: true` to `synapse_project_tree`.
- [x] Group repeated file types or deep directories into single-line summaries.

### Phase 3: Intelligent Tool Outputs
- [x] Implement repetition collapsing for command outputs.
- [x] Add automatic truncation with "Raw Log" resource links for long outputs.

## 🛠️ Maintenance & CI/CD
- [ ] Update GitHub Actions to test across Node 18, 20, and 22.
- [ ] Resolve deprecation warnings for Node.js 20 actions in CI.
- [ ] Finalize `gh` integration for release automation.
