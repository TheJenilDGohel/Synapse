# [BUG] Phase 3: memory search tools documented incorrectly / not found

## Environment
- OS: Linux
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: Stdio MCP client
- ripgrep available: yes

## Steps to Reproduce
1. Start synapse start.
2. Connect an MCP client.
3. List available tools.
4. Try to call synapse_memory_search (which is what one might guess based on the CLI synapse memory search).

## Expected Behavior
The tools should match the expected set. To search memory, the tool should be intuitive or clearly named.

## Actual Behavior
The tool synapse_memory_search is not found. The actual tool is synapse_memory_query, but calling it with a bare query fails validation because it requires an action parameter (like recall). The prompt says "List all your available memory and search tools" and gives "synapse_memory_search" as the expected tool.

## Severity
- [ ] Crash / data loss
- [ ] Silent wrong behavior
- [x] Poor error message
- [ ] Performance
- [x] Documentation gap

## Reproduction Rate
- [x] Always
- [ ] Sometimes
- [ ] Once
