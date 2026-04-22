---
phase: "11"
plan: "1"
subsystem: cli/memory
tags: [cli, memory, crud]
dependency_graph:
  requires: [phase-10-cli-framework]
  provides: [memory-cli-add, memory-cli-search, memory-cli-list, memory-cli-show, memory-cli-delete]
  affects: [src/cli/commands/memory.js]
tech_stack:
  added: []
  patterns: [service-bootstrap-from-runtime-config, flag-parsing-without-deps]
key_files:
  created: []
  modified: [src/cli/commands/memory.js]
decisions:
  - "Bootstrap MemoryService directly from buildRuntimeConfig + EmbeddingService rather than full createServices to avoid loading unnecessary workspace/search/update services"
  - "Hand-rolled flag parser (parseFlags) to stay zero-dep consistent with Phase 10 decision"
  - "Interactive delete confirmation via readline, skippable with -f/--force"
metrics:
  duration: "2m30s"
  completed: "2026-04-08"
  tasks: 1
  files: 1
requirements: [MCLI-01, MCLI-02, MCLI-03, MCLI-04, MCLI-05]
---

# Phase 11 Plan 1: Memory CLI Commands Summary

Full memory CRUD via synapse memory subcommands with service bootstrap, flag parsing, and JSON output support.

## What Was Done

Replaced the Phase 10 stub in `src/cli/commands/memory.js` with a complete implementation of all 5 memory subcommands:

### memory add

- Accepts positional content argument
- Flags: --type/-t (kind), --importance/-i (0-100), --nest/-n, --branch/-b, --title
- Creates memory via MemoryService.storeEntry
- Reports created ID or duplicate detection

### memory search

- Accepts positional query argument
- Flags: --limit/-l, --nest/-n, --branch/-b, --kind/-k
- Calls MemoryService.recall with filters
- Displays ranked results with scores

### memory list

- Flags: --limit/-l, --kind/-k, --status/-s, --json
- Calls MemoryService.listEntries
- Displays tabular output with ID, kind, importance, title, date

### memory show

- Accepts positional ID argument
- Calls MemoryService.getEntry
- Displays full entry details including revision history

### memory delete

- Accepts positional ID argument
- Flag: -f/--force to skip confirmation prompt
- Interactive readline confirmation when not forced
- Calls MemoryService.deleteEntry

### Service Bootstrap

- Creates MemoryService from buildRuntimeConfig() + EmbeddingService
- Only loads memory-related services (not workspace/search/vectorindex)
- Respects SYNAPSE_MEMORY_ENABLED, SYNAPSE_HOME, and all memory env vars

### JSON Output

- All subcommands respect the global --json flag
- JSON output includes full structured data from service layer

## Commits

| Hash | Message |
|------|---------|
| b1ba671 | feat(11-1): implement memory CLI subcommands (add, search, list, show, delete) |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all subcommands are fully wired to the MemoryService backend.

## Verification

All subcommands tested with SYNAPSE_MEMORY_ENABLED=true against a fresh SQLite database:

- `memory add` created a memory and returned ID
- `memory list` displayed the stored memory in tabular format
- `memory search` found the memory by query with score ranking
- `memory show` displayed full entry with revision history
- `memory delete -f` removed the memory without prompt
- `--json` flag produced structured JSON output on all subcommands
- Nest/branch filters on search worked correctly

## Self-Check: PASSED

- [x] src/cli/commands/memory.js exists and is 310+ lines of implementation
- [x] Commit b1ba671 exists in git log
