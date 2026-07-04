## Environment
- OS: Linux x86_64
- Node: 22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: @modelcontextprotocol/sdk/client
- ripgrep available: yes

## Steps to Reproduce
1. Install a fresh instance of synapse-cortex without calling `synapse setup`
2. Run `synapse doctor`

## Expected Behavior
It should gracefully explain that `synapse setup` must be run before using `synapse doctor`.

## Actual Behavior
The doctor output succeeds except for the missing config file, which returns:
FAIL config_file: Config not found: /home/jules/.synapse/config/synapse.config.json
   fix: Run synapse setup to create config.

## Severity
- [ ] Crash / data loss
- [ ] Silent wrong behavior
- [x] Poor error message
- [ ] Performance
- [ ] Documentation gap

## Reproduction Rate
- [x] Always
- [ ] Sometimes (~X% of runs)
- [ ] Once, couldn't reproduce
