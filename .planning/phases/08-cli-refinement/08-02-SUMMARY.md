# Plan 08-02 Summary: Universal Subcommand Help

## Status
- **Task 1: Update parseFlags to detect help requests**: COMPLETED
- **Task 2: Implement help check in subcommand handlers**: COMPLETED

## Changes
- **src/interfaces/cli/parse-flags.ts**:
  - Updated `ParsedFlags` interface and `parseFlags` function to detect `--help` and `-h`.
  - Added `helpRequested: boolean` to the returned object.
- **src/interfaces/cli/commands/memory.ts**:
  - Added help interception to `handleAdd`, `handleSearch`, `handleList`, `handleShow`, `handleDelete`, `handlePrime`, `handleContext`, and `handleOutcome`.
- **src/interfaces/cli/commands/kg.ts**:
  - Added help interception to `handleAdd`, `handleQuery`, `handleTimeline`, and `handleStats`.
- **src/interfaces/cli/commands/onboard.ts**:
  - Added help interception to the `run` entry point.

## Verification Results
- `node bin/synapse.cjs memory outcome --help`: SUCCESS (Displays specific usage).
- `node bin/synapse.cjs kg query -h`: SUCCESS (Displays specific usage).
- `node bin/synapse.cjs onboard --help`: SUCCESS (Displays specific usage).
