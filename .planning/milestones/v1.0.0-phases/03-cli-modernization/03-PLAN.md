# Phase 3 Plan: CLI Modernization

Unify fragmented scripts into a single router and decouple CLI code from direct service imports by consuming the `src/engine/` layer.

## Objectives
- [ ] Move business logic from `scripts/` to `src/engine/` or `src/runtime/`.
- [ ] Implement `synapse doctor`, `synapse setup`, and `synapse upgrade` commands.
- [ ] Refactor `synapse memory` subcommands to be protocol-agnostic.
- [ ] Decouple `src/cli/commands/*` from `src/services/*`.

## Proposed Changes

### 1. Engine & Runtime Refactoring
- **src/runtime/diagnostics.ts**: (New) Extract logic from `scripts/runtime/doctor-synapse.mjs`.
- **src/setup/orchestrator.ts**: (New) Extract logic from `scripts/runtime/setup-synapse.mjs`.
- **src/engine/index.ts**: Export `DiagnosticService` and `SetupService`.

### 2. CLI Command Implementation
- **src/cli/commands/doctor.ts**: (New) Command handler for `synapse doctor`.
- **src/cli/commands/setup.ts**: (New) Command handler for `synapse setup`.
- **src/cli/commands/memory.ts**: Refactor to use `engine.memory` and add `capture`, `context` subcommands.
- **src/cli/commands/mcp.ts**: Refactor to use `engine` instead of direct `runtime` config building where possible.

### 3. Routing & Shims
- **src/cli/router.ts**: Update to handle new commands and subcommands.
- **package.json**: Ensure `bin` entries are correct (though they already point to shims).
- **scripts/memory/memory-workflow-cli-utils.mjs**: Update to import from `src/engine`.

## Verification Plan
- [ ] `synapse doctor` (Check all diagnostics pass).
- [ ] `synapse setup --help` (Verify help output).
- [ ] `synapse memory help` (Verify unified memory commands).
- [ ] Existing `synapse-mcp-doctor` shim still works.
