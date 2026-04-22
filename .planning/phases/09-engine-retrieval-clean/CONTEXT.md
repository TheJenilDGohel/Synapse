# Phase 9: Engine & Retrieval Dependency Clean

## Context
The goal of this phase is to audit the boundaries between `src/core/engine` and `src/services` (specifically `src/services/retrieval` and `src/services/memory`) to ensure a clean, protocol-agnostic core without cyclic dependencies.

## Scouting Findings
1. **Barrel Proxying**: `src/core/engine/retrieval.ts` and `src/core/engine/memory.ts` are currently just barrel files that re-export implementations from `src/services/retrieval` and `src/services/memory`.
2. **Directory Cycle**: 
   - `src/core/engine` -> imports from `src/services/retrieval` (via `retrieval.ts`)
   - `src/services/retrieval` -> imports from `src/core/engine` (e.g., `sqlite-tuning.js`)
   - This creates a dependency cycle between the `core` and `services` directories.
3. **Core vs Implementation**: By definition, `core` should be the foundation. Implementations that are re-exported as the "Engine API" should ideally live within `core` to maintain a strict "upward" dependency flow (`services` -> `core`).

## Decisions
- [ ] **Move Retrieval Core**: Relocate the core logic from `src/services/retrieval` to `src/core/engine/retrieval/`.
- [ ] **Remove Barrel Re-exports**: Replace the re-exporting barrel files in `src/core/engine` with direct implementations (or internal imports from subdirectories within `core/engine`).
- [ ] **Update Consumer Paths**: Rewire `src/interfaces` and `src/services` to import from the new `core/engine` locations.
- [ ] **Audit Memory similarly**: Check if `src/services/memory` logic should also move to `src/core/engine/memory/` to maintain consistency.

## Gray Areas
- **Scope of movement**: Should ALL of `src/services/retrieval` move, or only the "engine" parts? Currently, most of it seems stateless and core-like.
- **Service vs Engine**: If we move the implementation to `core/engine`, what remains in `services/retrieval`? If nothing remains, we should delete `src/services/retrieval`.

## Next Steps
1. Map out the specific files in `src/services/retrieval` and their responsibilities.
2. Draft a plan to relocate them without breaking the public engine API.
3. Verify that `src/core/engine` no longer imports from `src/services`.
