# [BUG] Phase 1: start succeeds but hangs when config is missing

## Environment
- OS: Linux
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: Tested via programmatic client
- ripgrep available: yes

## Steps to Reproduce
1. Ensure ~/.synapse/config/synapse.config.json does not exist.
2. Run synapse start.

## Expected Behavior
The command should gracefully fail and tell the user to run synapse setup first.

## Actual Behavior
The command outputs a welcome banner and then hangs indefinitely, running the MCP server despite not having a valid configuration.

## Severity
- [ ] Crash / data loss
- [x] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

## Reproduction Rate
- [x] Always
- [ ] Sometimes
- [ ] Once
