# Phase 4 Plan: AI Awareness & Architectural Hardening

## Plan
1. **Engine Consolidation**
   - [ ] Export `WorkspaceService` from `src/engine/index.ts`.
   - [ ] Update `src/app/create-services.ts` to import `WorkspaceService` from `../engine/index.js`.
   - [ ] Export `UpdateService` from `src/engine/index.ts` (for completeness).

2. **AI Awareness**
   - [ ] Create `SKILL.md` in root with "I am a Synapse Brain" identity and tool usage tips.
   - [ ] Create `.claude.md` for Claude-specific context.

3. **CLI Parity & Hardening**
   - [ ] Update `src/cli/commands/memory.ts` to support `--topic`, `--feature`, and `--kind` in the `context` subcommand.
   - [ ] Add basic JSON schema validation for these flags in the handler.

4. **Test Infrastructure**
   - [ ] Create `test/cli/router.test.ts`.
   - [ ] Implement tests for:
     -   Valid noun-verb routing (e.g., `memory list`).
     -   Invalid command handling.
     -   Legacy bridge routing (if possible via mocks).
   - [ ] Create `test/cli/memory-cmd.test.ts` for memory subcommand logic.

5. **Roadmap Progress**
   - [ ] Update `ROADMAP.md` and `PROJECT.md` to reflect completion.
