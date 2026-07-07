## Environment
- OS: Linux x86_64
- Node: 22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: Custom Stdio Test Script
- ripgrep available: yes

## Steps to Reproduce
1. Delete the sqlite database file (`rm ~/.synapse/data/synapse.memory.db`).
2. Run `synapse doctor`.

## Expected Behavior
Doctor should detect that the database hasn't been set up properly (schema not initialized because we deleted it, or haven't run setup/start).

## Actual Behavior
Doctor reports:
`OK schema_version: Database not yet created (will initialize on first use)`
And reports health as `10/10` and `healthy`.
While it indicates the database is not created, passing this as fully healthy before actual initialization could be misleading.

## Severity
- [ ] Crash / data loss
- [ ] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [x] Documentation gap / UX

## Reproduction Rate
- [x] Always
- [ ] Sometimes (~X% of runs)
- [ ] Once, couldn't reproduce
