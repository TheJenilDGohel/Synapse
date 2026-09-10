[BUG] PHASE 7: Adversarial input Control Characters stored successfully, risking terminal corruption on recall

## Environment
- OS: Linux
- Node: 22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: Claude / test-client
- ripgrep available: yes

## Steps to Reproduce
1. Call `synapse_memory_manage` action "store" with content: `"Remember: \x00\x01\x1b[31m"`
2. Try to recall it.

## Expected Behavior
Control characters and ANSI escape sequences should be stripped before storage to prevent terminal corruption when displayed in logs or CLI.

## Actual Behavior
The control characters are successfully stored and returned exactly as is, which could mess up a terminal client rendering the JSON or logs.

## Severity
- [ ] Crash / data loss
- [x] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

## Reproduction Rate
- [x] Always
