[BUG] PHASE 1: `synapse start` auto-initializes config instead of gracefully failing when run before `synapse setup`

## Environment
- OS: Linux
- Node: 22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: Claude / test-client
- ripgrep available: yes

## Steps to Reproduce
1. Install `synapse-cortex@beta` via `npm install -g synapse-cortex@beta`.
2. Do NOT run `synapse setup`.
3. Run `synapse start`.

## Expected Behavior
The command should fail gracefully with an error indicating that `synapse setup` must be run first.

## Actual Behavior
The server auto-initializes a standard default configuration without user consent or knowledge, potentially bypassing important setup steps (like checking for Claude Code, setting backend preferences, etc).

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
