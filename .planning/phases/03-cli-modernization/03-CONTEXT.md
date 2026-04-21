# Phase 3 Context: CLI Modernization

## Domain Boundary
Unifying the fragmented `bin/synapse-*` scripts into a single, cohesive `synapse` command-line interface. This phase ensures that the CLI layer is a thin consumer of the `src/engine/` barrel, separating human/interactive logic from core cognitive and data operations.

## Locked Decisions (Autonomous)
- **Primary Entry Point**: `bin/synapse.js` is the single source of truth for CLI routing.
- **Command Architecture**: Noun-verb pattern (`synapse memory add`, `synapse mcp start`) remains the standard.
- **Backward Compatibility**: Existing executable names (e.g., `synapse-mcp-doctor`) will be preserved as shims that delegate to the unified `synapse` command to avoid breaking existing users.
- **Engine-First**: CLI commands must never import from `src/services/*` directly. They must consume the `src/engine/` barrel.
- **Config Pattern**: Continue using `buildRuntimeConfig()` from `src/runtime/config.js` to stay consistent with the project's established configuration pattern.

## Gray Areas & Auto-Decisions
- **Legacy Logic Migration**: Move business logic from fragmented `scripts/` (e.g., `doctor-synapse.mjs`) into the engine where appropriate, or into the `src/cli/commands/` layer for CLI-specific UI logic.
- **Output Standard**: Standardize all CLI output on the `src/cli/output.js` and `src/cli/ansi.js` utilities for consistent terminal styling and JSON support.
- **Service Instantiation**: Use a unified service factory in the CLI layer (similar to `create-services.ts` in the app layer) but tailored for CLI lifecycle.

## Folded Todos
- CLI-01: Replace fragmented executable scripts with unified routing.
- CLI-02: Separate human interaction logic from backend engine calls.

## Canonical Refs
- [PROJECT.md](file:///c:/Jenil/localnest/.planning/PROJECT.md)
- [REQUIREMENTS.md](file:///c:/Jenil/localnest/.planning/REQUIREMENTS.md)
- [ROADMAP.md](file:///c:/Jenil/localnest/.planning/ROADMAP.md)
- [bin/synapse.js](file:///c:/Jenil/localnest/bin/synapse.js)
- [src/cli/router.ts](file:///c:/Jenil/localnest/src/cli/router.ts)
