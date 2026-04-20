# 0.1.0 Overview

<div className="docPanel docPanel--compact">
  <p>
    Major internal overhaul. Full TypeScript migration (96 files, 0 JS in src/), CLI refresh
    with shared modules and ora spinners, SQLite performance optimizations, and dependency updates.
  </p>
</div>

## Key changes from 0.0.7-beta.3

### TypeScript Migration
- All 96 source files in `src/` converted from JavaScript to TypeScript
- Runtime uses `tsx`, production builds use `tsc`
- New `src/types/` directory for shared type declarations

### CLI Refresh
- Shared CLI modules: `ansi.ts` (colors), `output.ts` (structured output), `spinner.ts` (ora wrapper)
- ora spinners on all async CLI operations
- New commands: `dashboard`, `onboard`, `selftest`, `hooks`

### Performance
- 3 composite SQLite indexes for memory recall, KG queries, and relation lookups
- Embedding LRU cache (256 entries) to avoid redundant computation
- Async vector index persistence (non-blocking writes)
- Batch embedding queries during index builds
- Graph CTE optimization using `INSTR()` for cycle detection

### Dependencies
- `@modelcontextprotocol/sdk` updated to 1.29.0
- `ora` 9.3.0 added for CLI spinners

## Tools

52 MCP tools (unchanged from 0.0.7-beta.3). No new MCP tools in this release.

## Requirements

- **Node.js** 18+ (search and file tools), 22.13+ (memory and KG features)
- **ripgrep** recommended for fast lexical search
- **ora** 9.3.0 (bundled, no manual install needed)
