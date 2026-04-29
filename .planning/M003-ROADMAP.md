# Milestone 3 Roadmap: Stabilization & Release

**Status**: Planning
**Target**: v0.3.3 / Final 0.3.2 Release
**Description**: Fix critical runtime issues discovered in deep testing to unblock global installation and release verification.

## Phases

- [x] **Phase 1: Global Runtime & Doctor Fixes** - Repair global command shims and Windows setup validation.
- [x] **Phase 2: CLI & Tooling Recovery** - Fix predictable CLI behavior and restore broken quality/stress scripts.
- [x] **Phase 3: Release Gate & Final Verification** - Verify all exit criteria and unblock the release.

## Phase Details

### Phase 1: Global Runtime & Doctor Fixes
**Goal**: Users can run `synapse` globally and validate their setup accurately on Windows.
**Depends on**: Nothing
**Requirements**: M003-01, M003-02, M003-03
**Success Criteria** (what must be TRUE):
  1. `synapse --version` returns a valid version from any directory without module errors.
  2. `synapse doctor` correctly reports npm/npx status on Windows environments.
  3. The installed-runtime MCP sweep initializes successfully and generates a report.
**Plans**: TBD

### Phase 2: CLI & Tooling Recovery
**Goal**: CLI commands behave predictably and internal maintenance tools are functional.
**Depends on**: Phase 1
**Requirements**: M003-04, M003-05, M003-06
**Success Criteria** (what must be TRUE):
  1. `doctor --help` and `selftest --help` print usage instructions instead of executing logic.
  2. `stress-synapse.mjs` runs against the current engine architecture without import errors.
  3. Release scripts are executable via standardized npm commands or documented `tsx` paths.
**Plans**: TBD

### Phase 3: Release Gate & Final Verification
**Goal**: Confirm all release blockers are resolved and the gate is green.
**Depends on**: Phase 2
**Requirements**: M003-07
**Success Criteria** (what must be TRUE):
  1. `release-exit-criteria` script reports 0 failures across all categories.
  2. All mandatory release reports are produced and repeatable.
**Plans**: TBD

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Global Runtime & Doctor Fixes | 1/1 | Completed | 2026-04-29 |
| 2. CLI & Tooling Recovery | 1/1 | Completed | 2026-04-29 |
| 3. Release Gate & Final Verification | 1/1 | Completed | 2026-04-29 |
