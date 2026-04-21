---
phase: "10"
plan: "1"
type: implementation
autonomous: true
wave: 1
depends_on: []
requirements: [CLI-01, CLI-02, CLI-03, CLI-04]
---

# Phase 10 Plan 1: CLI Framework Setup

## Objective

Replace the existing flat command router in `bin/synapse.js` with a noun-verb subcommand architecture that supports global flags, colored categorized help, and subcommand stubs -- all without adding new dependencies.

## Context

- @bin/synapse.js -- current CLI entry point with COMMAND_MODULES map
- @bin/_shared.js -- shared CLI utilities
- @src/runtime/version.js -- version constants
- @package.json -- zero new runtime deps policy

## Tasks

### Task 1: Create CLI global options parser
type="auto"

Create `src/cli/options.js` that:
- Parses global flags from process.argv: --json, --verbose, --quiet, --config <path>
- Strips consumed flags from argv so subcommands get clean args
- Exports a `parseGlobalOptions(argv)` function returning `{ json, verbose, quiet, config, args }`

**Done when:** Module exports parseGlobalOptions and correctly strips flags from argv.

### Task 2: Create colored help renderer
type="auto"

Create `src/cli/help.js` that:
- Uses ANSI escape codes (no chalk dep) for colored output
- Organizes commands into categories: Core, Memory, KG, Skills, Diagnostics
- Shows global flags section
- Detects NO_COLOR / FORCE_COLOR env vars
- Exports `printHelp()` and `printCommandHelp(command)`

**Done when:** printHelp() outputs categorized colored help text.

### Task 3: Create subcommand router
type="auto"

Create `src/cli/router.js` that:
- Maps noun-verb pairs to handler modules (memory -> src/cli/commands/memory.js, etc.)
- Falls back to existing COMMAND_MODULES for backward compat (setup, doctor, upgrade, etc.)
- Routes `synapse <noun> <verb> [args]` and `synapse <command> [args]`
- Exports `routeCommand(command, subcommand, args, globalOpts)`

**Done when:** Router correctly dispatches noun-verb and flat commands.

### Task 4: Create subcommand stubs
type="auto"

Create stub handler files for future subcommands:
- `src/cli/commands/memory.js` -- stubs for add, search, list, show, delete
- `src/cli/commands/kg.js` -- stubs for add, query, timeline, stats
- `src/cli/commands/skill.js` -- stubs for install, list, remove
- `src/cli/commands/mcp.js` -- stubs for start, status, config
- `src/cli/commands/ingest.js` -- stub for file ingestion
- `src/cli/commands/completion.js` -- stubs for bash, zsh, fish

Each stub prints "Not yet implemented. Coming in Phase N." with the correct phase number.

**Done when:** All stub files exist and print appropriate messages.

### Task 5: Rewrite bin/synapse.js entry point
type="auto"

Rewrite `bin/synapse.js` to:
- Import and use `parseGlobalOptions` for global flag extraction
- Import and use the router for command dispatch
- Import and use `printHelp` for help display
- Keep `--version` and `version` working
- Keep backward compat with setup, doctor, upgrade, task-context, capture-outcome, start/serve, install skills
- Wire up noun-verb subcommands: memory, kg, skill, mcp, ingest, completion

**Done when:** All existing commands still work AND new subcommands route correctly.

### Task 6: Update check script and verify
type="auto"

- Add new src/cli/*.js files to the `check` script in package.json
- Run `npm run check` to verify all files parse cleanly

**Done when:** `npm run check` passes with all new files included.

## Verification

- `node bin/synapse.js` prints colored categorized help
- `node bin/synapse.js --version` prints version
- `node bin/synapse.js version` prints version
- `node bin/synapse.js --json version` prints version (--json parsed)
- `node bin/synapse.js memory` prints memory subcommand help
- `node bin/synapse.js setup --help` still works (backward compat)
- `npm run check` passes

## Success Criteria

1. Single synapse binary supports noun-verb subcommands
2. Global flags --json, --verbose, --quiet, --config work on all commands
3. Colored help with categories: Core, Memory, KG, Skills, Diagnostics
4. `synapse --version` and `synapse version` both work
5. Backward compat with existing commands
6. Empty stubs for memory, kg, skill, mcp, ingest, completion

## Output

- src/cli/options.js
- src/cli/help.js
- src/cli/router.js
- src/cli/commands/memory.js
- src/cli/commands/kg.js
- src/cli/commands/skill.js
- src/cli/commands/mcp.js
- src/cli/commands/ingest.js
- src/cli/commands/completion.js
- bin/synapse.js (rewritten)
- package.json (updated check script)
