# [CRASH] Phase 4: KG manage tool crashes on missing node for add_triple

## Environment
- OS: Linux
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: Stdio MCP client
- ripgrep available: yes

## Steps to Reproduce
1. Start synapse start.
2. Connect MCP client.
3. Call synapse_kg_manage with action add_triple.
4. Provide subject: "Project X", predicate: "depends on", object: "UNDEFINED_NODE".

## Expected Behavior
It should create the triple, or if the node is undefined, gracefully explain that the node does not exist or auto-create the node.

## Actual Behavior
It returns a validation error subject is required (provide subjectId or subjectName) despite the subject being provided (but named subject instead of subjectName or subjectId). The API requires subjectName.

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
