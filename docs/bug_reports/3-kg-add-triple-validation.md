## Environment
- OS: Linux x86_64
- Node: 22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: @modelcontextprotocol/sdk/client
- ripgrep available: yes

## Steps to Reproduce
1. Connect to MCP server `synapse start` via StdioClientTransport.
2. Call tool `synapse_kg_manage` with arguments `{"action": "add_triple", "subjectId": "s1", "predicate": "p1", "objectId": "o1"}`

## Expected Behavior
It should successfully create the relationship triple.

## Actual Behavior
Throws: `subject is required (provide subjectId or subjectName)` even though `subjectId` is provided!

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
