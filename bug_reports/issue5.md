[BUG] PHASE 7: Adversarial input with Huge Payload crashes with validation error instead of graceful chunking/error

## Environment
- OS: Linux
- Node: 22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: Claude / test-client
- ripgrep available: yes

## Steps to Reproduce
1. Call `synapse_memory_manage` action "store" with a 50,000 character string.

## Expected Behavior
The AI should be warned the payload is too large, or it should be truncated, or gracefully error.

## Actual Behavior
It returns `MCP error -32602: Input validation error: Invalid arguments for tool synapse_memory_manage: Too big: expected string to have <=20000 characters at content`. While this is a validation error, it's not a friendly domain-level error message for AI to understand.

## Severity
- [ ] Crash / data loss
- [ ] Silent wrong behavior
- [x] Poor error message
- [ ] Performance
- [ ] Documentation gap

## Reproduction Rate
- [x] Always
