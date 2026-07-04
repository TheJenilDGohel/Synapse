## Environment
- OS: Linux x86_64
- Node: 22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: @modelcontextprotocol/sdk/client
- ripgrep available: yes

## Steps to Reproduce
1. Install a fresh instance of synapse-cortex.
2. Run `synapse setup` twice in a row.

## Expected Behavior
It should warn the user that it will overwrite the configuration, or silently skip if unchanged.

## Actual Behavior
It silently overwrites the configuration without prompting for confirmation.

## Severity
- [x] Crash / data loss
- [ ] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

## Reproduction Rate
- [x] Always
- [ ] Sometimes (~X% of runs)
- [ ] Once, couldn't reproduce
