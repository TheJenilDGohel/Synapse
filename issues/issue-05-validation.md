## Environment
- OS: Linux x86_64
- Node: 22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: Custom Stdio Test Script
- ripgrep available: yes

## Steps to Reproduce
1. Send `tools/call` for `synapse_search` with missing required arguments (e.g. empty arguments object).

## Expected Behavior
A clean error message guiding the AI to provide required parameters correctly, handled within MCP tools structure.

## Actual Behavior
Returns a detailed JSON array dumped inside the message text string complaining about Zod validation instead of parsing it or showing it natively as a user-friendly or LLM-friendly plain string. While the server code has some regex to clean it, it's returning the JSON structured array directly instead of fixing it, meaning the regex doesn't match the actual Zod error message shape anymore, leaking internal schema details to the AI prompt in raw JSON.

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
