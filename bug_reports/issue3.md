[BUG] PHASE 4: Knowledge Graph cycle creation (`synapse_kg_manage`) crashes with "startEntityId is required" when querying `synapse_kg_query` traverse without correct params

## Environment
- OS: Linux
- Node: 22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: Claude / test-client
- ripgrep available: yes

## Steps to Reproduce
1. `synapse_kg_manage` add entity A
2. `synapse_kg_manage` add entity B
3. Add cycle: A -> B, B -> A
4. Try to query cycle using `synapse_kg_query` action "traverse".

## Expected Behavior
Graph traversal handles cycles properly and returns graph nodes.

## Actual Behavior
If `startEntityId` is missed in traverse, it returns a 400 error rather than graceful failure. If added, the tool might loop or crash depending on cycle logic (did not test full loop due to crash, but schema error popped first).
Also, adding an undefined node silently creates it instead of failing (e.g. `object_name: "Thing you never defined"` works successfully).

## Severity
- [ ] Crash / data loss
- [x] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

## Reproduction Rate
- [x] Always
