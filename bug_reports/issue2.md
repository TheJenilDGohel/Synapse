[BUG] PHASE 3: `synapse_discovery` activation mechanism is confusing and doesn't clearly expose `synapse_memory_manage` by default

## Environment
- OS: Linux
- Node: 22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: Claude / test-client
- ripgrep available: yes

## Steps to Reproduce
1. Start MCP client with `SYNAPSE_MEMORY_ENABLED="true"`.
2. Try to find memory tools using standard discovery (`listTools`). Only `synapse_discovery` is present.
3. Call `synapse_discovery` with `{ action: "activate", tools: ["synapse_memory_manage"] }` or `{ activate_category: "Memory Management" }`.
4. Wait for it to activate.

## Expected Behavior
Memory tools should be immediately available if `SYNAPSE_MEMORY_ENABLED="true"`. If not, `synapse_discovery` should have clear parameters. But it has `activate_category` and `activate_tool` instead of `action: activate`.

## Actual Behavior
The user/agent has to guess the schema for `synapse_discovery` (which is `activate_category` and `activate_tool`). If they don't, they get missing tool errors.

## Severity
- [ ] Crash / data loss
- [ ] Silent wrong behavior
- [x] Poor error message / UX
- [ ] Performance
- [ ] Documentation gap

## Reproduction Rate
- [x] Always
- [ ] Sometimes
- [ ] Once
