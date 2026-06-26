# [BUG] Phase 4: KG traverse requires startEntityId instead of name

## Environment
- OS: Linux
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: Stdio MCP client
- ripgrep available: yes

## Steps to Reproduce
1. Connect MCP client.
2. Try to traverse the graph using entityName: "A" or similar intuitive parameters.

## Expected Behavior
The AI should be able to traverse the graph by passing an entity name.

## Actual Behavior
The tool requires startEntityId. This is very difficult for an AI to use natively without first doing a lookup to get the ID, which breaks fluidity. The validation error startEntityId is required halts progress.

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
