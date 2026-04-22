# Roadmap: Synapse Engine

## Milestones

- ✅ **v1.0.0 Architecture Teardown & Engine Decoupling** — Phases 1-5 (shipped 2026-04-21)
- ✅ **v1.1.0 Repository Structuring** — Phase 6-7 (shipped 2026-04-21)
- 🚧 **v1.2.0 Internal Service Modernization** — Phase 8-9 (in progress)
- 📅 **v1.3.0 Universal Distribution** — Phase 10 (planned)

## Phases

### 🚧 v1.2.0 Internal Service Modernization

**Milestone Goal:** Teardown the internal spaghetti within `src/services/memory` and other deeply nested modules. Resolve duplicate barrel files and modularize monolithic logic into clean, bounded contexts.

- [x] **Phase 8: Memory Service Consolidation** - Refactor `src/services/memory`. Eliminate side-by-side file and directory pairs (e.g. `workflow.ts` vs `workflow/`, `store.ts` vs `store/`). Extract modular domain logic from `utils.ts` and `schema.ts`. Unify the AI `ingest` models so it's transparent and testable.
- [ ] **Phase 9: Engine & Retrieval Dependency Clean** - Audit `src/services/retrieval` and `src/engine` APIs to ensure a clean boundary without cyclic dependencies.

### 📅 v1.3.0 Universal Distribution

**Milestone Goal:** Establish the "Universal Transmission Layer"—the infrastructure for 5-minute onboarding and cross-platform installation.

- [x] **Phase 10: Seamless Onboarding & Distribution** - Build `synapse link` orchestrator for cross-platform AI client patching. Implement `scripts/install.sh` and `install.ps1`. Automate GitHub Actions for universal package distribution.
- [x] **Phase 11: AI-Native Optimization** - Implement token-tier response formatting (`compact`/`lite`) across all high-traffic tools. Suppress CLI ANSI-decoration when AI_AGENT=true. Refactor core schemas for context-window efficiency.
- [x] **Phase 12: End-to-End Verification** - Stress-test `install.ps1/sh` in sandboxed paths. Verify MCP rehydration depth. Perform final smoke test with `AI_AGENT=true` override.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 8. Memory Service Consolidation | v1.2.0 | 1/1 | Completed | 2026-04-21 |
| 9 | Engine Sanitization | Cleanup dependencies and modules | [0.3.0] | ✅ Completed | 2026-04-22 |
| 10 | Seamless Onboarding | Universal installer + Neural Link | [1.3.0] | ✅ Completed |
| 11 | AI-Native Optimization | Token tiers & CLI silencing | [1.4.0] | ✅ Completed | 2026-04-22 |
| 12 | End-to-End Verification | Installer & Multi-client Stress Test | [1.5.0] | ✅ Completed | 2026-04-22 |
| 🚀 | **Production Launch** | **v1.0.0 Release Cycle** | **v1.0.0** | ⏹️ Pending |
