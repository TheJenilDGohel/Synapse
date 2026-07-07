## Environment
- OS: Linux x86_64
- Node: 22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: Custom Stdio Test Script
- ripgrep available: yes

## Steps to Reproduce
1. Store a memory using `synapse_memory_manage` (action: store).
2. Stop the server, truncate the database: `truncate -s 0 ~/.synapse/data/synapse.memory.db`.
3. Start the server and attempt to store a new memory using `synapse_memory_manage`.

## Expected Behavior
The server should clearly inform the client that the database is corrupted, and offer a way to restore from backup.

## Actual Behavior
The server returns JSONRPC errors:
`disk I/O error`
`Cannot read properties of undefined (reading 'storeEntry')`
`no such table: memory_entries`
It does not clearly identify the corruption for the end-user (AI client) to auto-fix, leading to generic exceptions. `synapse doctor` reports: `OK schema_version: Schema version: 0 (unmigrated)`.

## Severity
- [ ] Crash / data loss
- [x] Silent wrong behavior / UX
- [x] Poor error message
- [ ] Performance
- [ ] Documentation gap

## Reproduction Rate
- [x] Always
- [ ] Sometimes (~X% of runs)
- [ ] Once, couldn't reproduce
