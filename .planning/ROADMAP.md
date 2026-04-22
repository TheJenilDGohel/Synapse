# Roadmap: Synapse Engine

## Milestones

- ✅ **v1.0.0 Architecture Teardown & Engine Decoupling** — Phases 1-5 (shipped 2026-04-21)
- ✅ **v1.1.0 Repository Structuring** — Phase 6-7 (shipped 2026-04-21)
- 🚧 **v1.2.0 Internal Service Modernization** — Phase 8-9 (in progress)

## Phases

### 🚧 v1.2.0 Internal Service Modernization

**Milestone Goal:** Teardown the internal spaghetti within `src/services/memory` and other deeply nested modules. Resolve duplicate barrel files and modularize monolithic logic into clean, bounded contexts.

- [x] **Phase 8: Memory Service Consolidation** - Refactor `src/services/memory`. Eliminate side-by-side file and directory pairs (e.g. `workflow.ts` vs `workflow/`, `store.ts` vs `store/`). Extract modular domain logic from `utils.ts` and `schema.ts`. Unify the AI `ingest` models so it's transparent and testable.
- [ ] **Phase 9: Engine & Retrieval Dependency Clean** - Audit `src/services/retrieval` and `src/engine` APIs to ensure a clean boundary without cyclic dependencies.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 8. Memory Service Consolidation | v1.2.0 | 1/1 | Completed | 2026-04-21 |
| 9. Engine Dependency Clean | v1.2.0 | 0/1 | Not started | - |
