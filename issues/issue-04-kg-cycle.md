## Environment
- OS: Linux x86_64
- Node: 22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: Custom Stdio Test Script
- ripgrep available: yes

## Steps to Reproduce
1. Use `synapse_kg_manage` to add a triple: A depends on B.
2. Use `synapse_kg_manage` to add a triple: B depends on A.
3. Use `synapse_kg_query` with action `traverse` on start_entity_id: `a`.

## Expected Behavior
The server handles the circular dependency correctly without getting stuck in an infinite loop, returning nodes `a` and `b`.

## Actual Behavior
The graph query `traverse` appears to silently hang or return an empty entities list instead of reporting correctly on a cycle, failing to fetch anything at all or possibly timing out when returning the graph query. On traversing "A", the output received returns an empty entities list rather than handling the actual cycles or nodes properly. Actually, wait, it successfully processed and just returned empty `[]`, which means it doesn't crash but does silently swallow circular relationship results or fails to report them properly.

## Severity
- [ ] Crash / data loss
- [x] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

## Reproduction Rate
- [x] Always
- [ ] Sometimes (~X% of runs)
- [ ] Once, couldn't reproduce
