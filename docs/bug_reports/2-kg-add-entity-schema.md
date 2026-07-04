## Environment
- OS: Linux x86_64
- Node: 22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: @modelcontextprotocol/sdk/client
- ripgrep available: yes

## Steps to Reproduce
1. Connect to MCP server `synapse start` via StdioClientTransport.
2. Call tool `synapse_kg_manage` with arguments `{"action": "add_entity", "entityId": "e1", "name": "Ent1", "type": "T", "description": "D"}`

## Expected Behavior
It should successfully return a structured content of the entity creation.

## Actual Behavior
Throws Output Validation Error:
MCP error -32602: Output validation error: Invalid structured content for tool synapse_kg_manage: [
  {
    "expected": "number",
    "code": "invalid_type",
    "path": [
      "data",
      "created"
    ],
    "message": "Invalid input: expected number, received boolean"
  }
]

## Severity
- [x] Crash / data loss
- [ ] Silent wrong behavior
- [x] Poor error message
- [ ] Performance
- [ ] Documentation gap

## Reproduction Rate
- [x] Always
- [ ] Sometimes (~X% of runs)
- [ ] Once, couldn't reproduce
