---
phase: "18"
plan: "1"
subsystem: cli/deprecation
tags: [deprecation, cli, backward-compat]
dependency_graph:
  requires: [Phase 10, Phase 13]
  provides: [DEP-01, DEP-02, DEP-03, DEP-04]
  affects: [bin/_shared.js, bin/synapse-*.js]
tech_stack:
  added: []
  patterns: [ANSI escape codes for colored stderr warnings]
key_files:
  created: []
  modified:
    - bin/_shared.js
    - bin/synapse-setup.js
    - bin/synapse-doctor.js
    - bin/synapse-upgrade.js
    - bin/synapse-install-skill.js
decisions:
  - "Yellow ANSI codes (\\x1b[33m) for deprecation warning color, consistent with Phase 10 raw ANSI approach"
  - "Fixed broken command forwarding by adding commandArgs to all 4 binaries"
  - "Changed synapse-install-skill replacement from 'synapse install skills' to 'synapse skill install' per DEP-04"
metrics:
  duration: "1m46s"
  completed: "2026-04-08"
  tasks: 1
  files: 5
---

# Phase 18 Plan 1: Binary Deprecation Summary

Yellow ANSI deprecation warnings on all 4 legacy binaries with correct command forwarding via commandArgs

## What Was Done

Updated `printDeprecationWarning` in `bin/_shared.js` to output yellow-colored (ANSI `\x1b[33m`) deprecation messages to stderr in the format: `[synapse] DEPRECATED: Use "<new>" instead of "<old>".`

Fixed all 4 legacy binaries to include `commandArgs` so they actually forward to the correct unified CLI command instead of falling through to help output:

| Legacy Binary | Replacement | commandArgs |
|---|---|---|
| synapse-setup | synapse setup | `['setup']` |
| synapse-doctor | synapse doctor | `['doctor']` |
| synapse-upgrade | synapse upgrade | `['upgrade']` |
| synapse-install-skill | synapse skill install | `['skill', 'install']` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed broken command forwarding in all 4 binaries**
- **Found during:** Task 1
- **Issue:** Legacy binaries called `forwardDeprecatedCommand` without `commandArgs`, so `buildSynapseCommandArgv` produced argv with no command token. This meant `synapse.js` saw an empty command and showed help instead of executing the intended command.
- **Fix:** Added `commandArgs` to each binary's `forwardDeprecatedCommand` call (e.g., `['setup']`, `['doctor']`, `['upgrade']`, `['skill', 'install']`)
- **Files modified:** bin/synapse-setup.js, bin/synapse-doctor.js, bin/synapse-upgrade.js, bin/synapse-install-skill.js
- **Commit:** 1332253

**2. [Rule 1 - Bug] Fixed synapse-install-skill replacement command**
- **Found during:** Task 1
- **Issue:** `replacementCommand` was `'synapse install skills'` but DEP-04 specifies `'synapse skill install'` (noun-verb pattern)
- **Fix:** Changed to `'synapse skill install'` with `commandArgs: ['skill', 'install']`
- **Files modified:** bin/synapse-install-skill.js
- **Commit:** 1332253

## Out-of-Scope Discoveries

Two other deprecated binaries (`synapse-capture-outcome.js`, `synapse-task-context.js`) have the same missing-commandArgs bug but are not in the DEP-01..04 scope.

## Commits

| Hash | Message |
|---|---|
| 1332253 | feat(18-1): add yellow ANSI deprecation warnings to legacy binaries |

## Known Stubs

None.

## Self-Check: PASSED

All 5 modified files verified present on disk. Commit 1332253 verified in git log.
