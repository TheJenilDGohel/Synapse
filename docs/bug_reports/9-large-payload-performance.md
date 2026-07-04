## Environment
- OS: Linux x86_64
- Node: 22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: @modelcontextprotocol/sdk/client
- ripgrep available: yes

## Steps to Reproduce
1. Install a fresh instance of synapse-cortex.
2. Store a memory with a large payload (50,000 characters).

## Expected Behavior
It should successfully store the memory without significant performance issues.

## Actual Behavior
When the payload is exact 50000 characters long, it successfully stores, but takes over 4 seconds, missing the benchmark for `< 500ms` for storing memory.

## Severity
- [ ] Crash / data loss
- [ ] Silent wrong behavior
- [ ] Poor error message
- [x] Performance
- [ ] Documentation gap

## Reproduction Rate
- [x] Always
- [ ] Sometimes (~X% of runs)
- [ ] Once, couldn't reproduce
