---
phase: "10"
plan: "1"
subsystem: cli
tags: [cli, subcommands, help, global-flags]
dependency_graph:
  requires: []
  provides: [cli-framework, noun-verb-routing, global-options, colored-help]
  affects: [bin/synapse.js]
tech_stack:
  added: []
  patterns: [hand-rolled-argv-parser, ansi-escape-codes, noun-verb-subcommands]
key_files:
  created:
    - src/cli/options.js
    - src/cli/help.js
    - src/cli/router.js
    - src/cli/commands/memory.js
    - src/cli/commands/kg.js
    - src/cli/commands/skill.js
    - src/cli/commands/mcp.js
    - src/cli/commands/ingest.js
    - src/cli/commands/completion.js
  modified:
    - bin/synapse.js
    - package.json
decisions:
  - Hand-rolled argv parser instead of Commander.js to maintain zero new runtime deps
  - Raw ANSI escape codes instead of chalk for colored output
  - Noun-verb routing via Map-based module dispatch in src/cli/router.js
metrics:
  duration: 4m25s
  completed: "2026-04-08T08:42:29Z"
  tasks: 6
  files: 11
---

# Phase 10 Plan 1: CLI Framework Setup Summary

Hand-rolled noun-verb subcommand router with global flags (--json, --verbose, --quiet, --config), colored categorized help, and stub handlers for 6 future command groups -- zero new dependencies added.

## What Was Done

1. **Global options parser** (`src/cli/options.js`): Extracts --json, --verbose, --quiet, --config from argv and returns clean remaining args for subcommands.

2. **Colored help renderer** (`src/cli/help.js`): ANSI-colored output organized by 5 categories (Core, Memory, KG, Skills, Diagnostics). Respects NO_COLOR/FORCE_COLOR env vars.

3. **Subcommand router** (`src/cli/router.js`): Maps noun commands (memory, kg, skill, mcp, ingest, completion) to handler modules. Falls back to legacy flat commands (setup, doctor, upgrade, task-context, capture-outcome) for backward compatibility.

4. **Subcommand stubs** (6 files in `src/cli/commands/`): Each prints verb-specific help on --help, prints "not yet implemented" with correct phase number, and supports --json output mode.

5. **Rewritten entry point** (`bin/synapse.js`): Integrates all modules. `synapse --version` and `synapse version` both work. `synapse` with no args prints colored categorized help. All existing commands (start, serve, setup, doctor, upgrade, install skills, task-context, capture-outcome) continue to work.

6. **Check script updated** (`package.json`): All 9 new src/cli/*.js files added to `npm run check`.

## Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Global options parser | f39ec76 |
| 2 | Colored help renderer | ae35a64 |
| 3 | Subcommand router | a9f234f |
| 4 | Subcommand stubs | 5a844f6 |
| 5 | Rewrite bin/synapse.js | e7f6fb9 |
| 6 | Update check script | 5266dff |

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

| File | Stub | Reason | Resolving Phase |
|------|------|--------|-----------------|
| src/cli/commands/memory.js | All verbs print "not yet implemented" | Intentional placeholder | Phase 11 |
| src/cli/commands/kg.js | All verbs print "not yet implemented" | Intentional placeholder | Phase 12 |
| src/cli/commands/skill.js | All verbs print "not yet implemented" | Intentional placeholder | Phase 13 |
| src/cli/commands/mcp.js | All verbs print "not yet implemented" | Intentional placeholder | Phase 14 |
| src/cli/commands/ingest.js | Prints "not yet implemented" | Intentional placeholder | Phase 15 |
| src/cli/commands/completion.js | All verbs print "not yet implemented" | Intentional placeholder | Phase 17 |

These stubs are intentional -- each will be implemented in its designated phase. The CLI framework itself is complete.

## Verification Results

- `synapse` (no args) prints colored categorized help
- `synapse --version` prints 0.0.7-beta.1
- `synapse version` prints 0.0.7-beta.1
- `synapse --json version` prints {"version":"0.0.7-beta.1"}
- `synapse memory` prints memory subcommand help
- `synapse memory add` prints stub message
- `synapse --json memory add` prints JSON stub message
- `synapse setup --help` works (backward compat)
- `synapse doctor` works (backward compat)
- `npm run check` passes with all new files

## Self-Check: PASSED

All 9 created files verified on disk. All 6 commit hashes found in git log.
