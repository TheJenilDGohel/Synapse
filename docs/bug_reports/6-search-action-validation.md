## Environment
- OS: Linux x86_64
- Node: 22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: @modelcontextprotocol/sdk/client
- ripgrep available: yes

## Steps to Reproduce
1. Connect to MCP server `synapse start` via StdioClientTransport.
2. Call tool `synapse_search` with arguments `{"query": "fetchUser"}` (no `action` provided)

## Expected Behavior
It should either gracefully default to a valid search action (e.g. `code` or `hybrid`) OR provide a very clear error message indicating that `action` is a required string enum for the search type.

## Actual Behavior
Throws: `Invalid option: expected one of "files"|"code"|"hybrid"|"find"` but only in the `values` array of a validation error payload.

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
