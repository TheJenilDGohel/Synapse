[BUG] PHASE 6: SQLite mid-interruption / Database Corruption causes persistent "database is locked" and Doctor silently ignores it

## Environment
- OS: Linux
- Node: 22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: Claude / test-client
- ripgrep available: yes

## Steps to Reproduce
1. Start `synapse start`
2. Truncate database: `truncate -s 0 ~/.synapse/data/synapse.memory.db`
3. Run `synapse doctor`

## Expected Behavior
`synapse doctor` detects that the database schema is invalid or missing and reports an error or prompts for recovery.

## Actual Behavior
`synapse doctor` reports: `OK schema_version: Schema version: 0 (unmigrated)`. It considers the database healthy. Subsequent queries using MCP tools throw `database is locked` or crash the SQLite bindings internally without recovering.

## Severity
- [x] Crash / data loss
- [ ] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

## Reproduction Rate
- [x] Always
