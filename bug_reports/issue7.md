[PERF] PHASE 8: Code search performance is degraded or silently fails

## Environment
- OS: Linux
- Node: 22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: Claude / test-client
- ripgrep available: yes

## Steps to Reproduce
1. Start `synapse start` in a large repository.
2. Call `synapse_search` with `{ action: "code", query: "fetchUser" }`

## Expected Behavior
Returns search results in < 5 seconds.

## Actual Behavior
Returns `No code matches found. Verify the scope and try a broader query` instantly, indicating it might have crashed ripgrep, failed to find the directory, or silently failed instead of actually searching.

## Severity
- [ ] Crash / data loss
- [ ] Silent wrong behavior
- [ ] Poor error message
- [x] Performance
- [ ] Documentation gap

## Reproduction Rate
- [x] Always
