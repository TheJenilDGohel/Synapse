# Phase 4: AI Awareness & Architectural Hardening

## Context
Following the successful unification of the CLI in Phase 3, Phase 4 focuses on "hardening" the identity of Synapse as an AI Brain. This involves two parallel efforts: surface-level visibility for agents (documentation) and structural verification (testing and barrel completion).

## Objectives
- **AWARENESS**: Create instruction sets for incoming AI agents (`SKILL.md`, `.claude.md`).
- **VERIFICATION**: Establish the first automated tests for the unified CLI router and command handlers.
- **SOLIDIFICATION**: Complete the Engine barrel by including `WorkspaceService` and ensuring the App entry points consume it.
- **PARITY**: Ensure `synapse memory context` supports all legacy filtering flags.

## Success Criteria
1. `SKILL.md` exists and describes the `recall` and `context` workflows correctly.
2. `npm test test/cli/router.test.ts` passes, verifying noun-verb routing.
3. `src/engine/index.ts` exports `WorkspaceService`.
4. `synapse memory context --help` displays `topic`, `feature`, and `kind` flags.
