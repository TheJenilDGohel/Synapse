# Loci Milestone Roadmap: v2026.5.0 Stable Release

## 🎯 Milestone Goal
Stabilize the core engine, optimize tool context usage, and harden the architecture for final stable release.

## 🏁 Phase 02: Code Review & Implementation
- **Goal**: Address security and quality findings from Phase 02 review.
- **Status**: ✅ Completed
- **Tasks**:
  - [x] Implement strict validation for `sqliteVecModule` in `runtime.ts` (IN-01).
  - [x] Verify SQL parameterization across all remaining core services.

## 🚀 Phase 03: Tool Optimization
- **Goal**: Consolidate KG tools and standardize outputs to save tokens.
- **Status**: ✅ Completed
- **Plan**: `.planning/phases/03-tool-optimization/03-02-PLAN.md`
- **Tasks**:
  - [x] Create Knowledge Graph Controllers (`synapse_kg_manage`, `synapse_kg_query`).
  - [x] Standardize search/retrieval outputs on `items[]` array.
  - [x] Remove redundant legacy output arrays.

## 🏗️ Phase 04: Architectural Hardening
- **Goal**: Centralize interfaces and optimize performance-critical paths.
- **Status**: ✅ Completed
- **Plans**: `.planning/phases/04-architectural-hardening/04-0*.md`
- **Tasks**:
  - [x] Centralize Service Interfaces (Plan 04-01).
  - [x] Optimize AST traversal for chunking (Plan 04-01).
  - [x] Create `McpResponseMapper` utility (Plan 04-01).
  - [x] Decompose `MemoryService` into focused interfaces (Plan 04-02).
  - [x] Optimize graph traversal performance (Plan 04-02).
  - [x] Refactor remaining tool handlers to use `McpResponseMapper` (Plan 04-02).

## 🛠️ Phase 05: Release & CI/CD
- **Goal**: Finalize build pipeline and release automation.
- **Status**: ✅ Completed
- **Tasks**:
  - [x] Update GitHub Actions for Node 18, 20, 22.
  - [x] Resolve CI deprecation warnings.
  - [x] Finalize release automation via `gh` CLI.

## 🏁 Phase 06: Stable Release Stabilization
- **Goal**: Final A-to-Z verification and sandbox testing for stable release.
- **Status**: ✅ Completed
- **Tasks**:
  - [x] Pivot versioning to `1.0.0`.
  - [x] Perform full sandbox installation check.
  - [x] Report issues to GitHub if found (Found & Reported: #95, #96).
  - [x] Final release audit.

## 🩹 Phase 07: Stability Patch
- **Goal**: Resolve high-priority bugs discovered during final stabilization.
- **Status**: ✅ Completed
- **Plans**: 2 plans
- **Tasks**:
  - [x] Resolve Windows ESM path error in Skill CLI (Issue 1).
  - [x] Ensure MemoryStore sub-services are initialized before use (Issue 2).
  - [x] Fix tree-sitter language loading logic (Issue 3).
  - [x] Audit and fix core dependency categorization (Issue 4).

## 💎 Phase 08: CLI Stability & Logic Refinement
- **Goal**: Resolve critical CLI usability issues and logic bugs.
- **Status**: ✅ Completed
- **Plans**: 3 plans
- **Tasks**:
  - [x] Implement robust ANSI style chaining via Proxy (#99).
  - [x] Enable subcommand-level help across all CLI verbs (#100).
  - [x] Differentiate critical vs optional checks in doctor/onboard (#101).

## 🚀 Phase 09: Tool Density Optimization
- **Goal**: Reduce tool-schema token overhead and cognitive load.
- **Status**: ✅ Completed
- **Tasks**:
  - [x] Audit token cost of all 74 current MCP tools.
  - [x] Implement `synapse_help` / Dynamic Tool Discovery.
  - [x] Consolidate granular tools (Git, Memory CRUD) into Power Tools.
  - [x] Implement JIT tool loading in the MCP server.

## 📦 Phase 10: MCP Tool Consolidation
- **Goal**: Complete the transition to high-density controllers and remove 60+ redundant granular tools.
- **Status**: ✅ Completed
- **Plan**: `.planning/phases/10-tool-consolidation/10-01-PLAN.md`
- **Tasks**:
  - [x] Consolidate Memory tools into Manage/Query controllers.
  - [x] Consolidate Search and Symbol tools into Power Controllers.
  - [x] Consolidate Workspace and System tools.
  - [x] Update `synapse_discovery` and `synapse_help` for new architecture.
  - [x] Cleanup orphaned files and update CHANGELOG.

## ⚡ Phase 11: CI/CD Optimization
- **Goal**: Parallelize pipeline jobs and optimize resource usage.
- **Status**: ✅ Completed
- **Plan**: `.planning/phases/11-cicd-optimization/11-01-PLAN.md`
- **Requirements**: [CI-OPT-01, CI-OPT-02, CI-OPT-03, CI-OPT-04, CI-OPT-05]
- **Tasks**:
  - [x] Add granular quality scripts to `package.json`.
  - [x] Refactor `ci.yml` for parallel jobs and path-filtering.
  - [x] Optimize `publish.yml` with caching and granular checks.

## 📚 Phase 12: Documentation Transformation
- **Goal**: Modernize documentation for humans and AI agents.
- **Status**: ✅ Completed (Elite Deep-Dive)
- **Tasks**:
  - [x] Research and design "Agent-First" structure.
  - [x] Implement `llms.txt` and `SKILL.md`.
  - [x] Transform existing content to Diátaxis standards.
  - [x] Update beta details and precise changelog.
  - [x] Execute "Elite Deep-Dive" (JSON schemas, Temporal KG mechanics, Advanced config).
