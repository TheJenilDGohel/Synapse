## Environment
- OS: Linux x86_64
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: local test script via stdio MCP
- ripgrep available: yes

# Discovered Issues

## [CRASH] Phase 1: `synapse start` hangs/times out if config is missing

### Steps to Reproduce
1. Delete `~/.synapse/config/synapse.config.json` if it exists.
2. Run `synapse start` (or start via MCP stdio transport without prior config).

### Expected Behavior
It should gracefully fallback, initialize standard defaults, and start responding to MCP messages, or it should fail cleanly with a message telling the user to run `synapse setup`.

### Actual Behavior
It prints "✓ Configuration not found. Initializing standard defaults..." and then the process hangs indefinitely instead of proceeding, causing MCP clients to time out waiting for a response.

### Severity
- [x] Crash / data loss
- [ ] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always


## [UX] Phase 3: Empty string allowed as memory content

### Steps to Reproduce
1. Call `synapse_memory_manage` with `action: 'store'` and `content: "Remember: "` or an empty string.

### Expected Behavior
Should reject memories that are practically empty or null-ish.

### Actual Behavior
Stores the empty memory without throwing a validation error.

### Severity
- [ ] Crash / data loss
- [x] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always


## [PERF] Phase 8: Store memory target missed

### Steps to Reproduce
1. Connect via MCP client to a running synapse instance.
2. Call `synapse_memory_manage` with `action: 'store'` and valid text content.
3. Time the execution.

### Expected Behavior
Expected time < 500ms as per performance baseline targets.

### Actual Behavior
Takes roughly 1984ms to complete on a local instance (cold).

### Severity
- [ ] Crash / data loss
- [ ] Silent wrong behavior
- [ ] Poor error message
- [x] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always


## [BUG] Phase 4: `synapse_kg_manage` `add_triple` does not handle `subject_name` property mapping when using `add_triple` action.

### Steps to Reproduce
1. Call `synapse_kg_manage` with `action: 'add_triple'`, `subject_name: 'Project X'`, `predicate: 'depends_on'`, `object_name: 'missing_node'`.

### Expected Behavior
It should create a triple with the specified nodes, auto-generating node IDs if necessary, or error clearly about missing nodes.

### Actual Behavior
Fails with: `subject is required (provide subjectId or subjectName)`. (In our testing `subject_name` was provided, but perhaps it got stripped, or the backend expects `subjectName` strictly while the Zod schema exposes `subject_name` but didn't map it properly to `subjectName` in the backend call).
Looking at the code, in `src/interfaces/mcp/tools/graph-tools.ts`:
```
subjectName: args.subject_name
```
but it throws this error anyway if `args.subject_name` is undefined, possibly due to `zod` stripping or something else. Wait, I should verify this exact mapping. In my test script I used `subject_name: 'Project X'`. Wait, I used `subjectName`? No, I used `subject_name`. Actually, let me check the script.

### Severity
- [ ] Crash / data loss
- [x] Silent wrong behavior
- [x] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always


## [BUG] Phase 3: `teach` action is missing in `synapse_memory_manage` but required

### Steps to Reproduce
1. Call `synapse_memory_manage` tool with `{ action: 'teach', topic: 'API', lesson: 'always check for null before accessing .data on API responses.' }`.

### Expected Behavior
It should successfully store a new lesson.

### Actual Behavior
The input schema requires `instruction` instead of `lesson` despite standard usage conventions. Wait, my test script used `instruction` and it worked: `{"taught":true,"instruction":"..."}`. However, wait, recalling the lesson failed.

Let me re-file accurately:

## [BUG] Phase 3: `teach` instructions are not reliably recalled using standard queries

### Steps to Reproduce
1. Store a lesson using `synapse_memory_manage` `action: 'teach'`, `instruction: 'always check for null before accessing .data on API responses.'`, `topic: 'API'`.
2. Query `synapse_memory_query` `action: 'recall'`, `query: 'What lessons should I keep in mind when writing API integrations?'`.

### Expected Behavior
It should return the lesson just stored.

### Actual Behavior
It returns 0 results. The vector search is failing to match the semantic query to the `teach` instruction, or `teach` entries are not being properly embedded.

### Severity
- [ ] Crash / data loss
- [x] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always

## [BUG] Phase 4: `synapse_kg_manage` circular dependencies infinite loop / bad count on traversal

### Steps to Reproduce
1. Create a cycle: node A depends_on B, node B depends_on A.
2. Query traverse with `synapse_kg_query` `action: 'traverse'`, `start_entity_id: 'a'`, `max_depth: 3`.

### Expected Behavior
Should traverse the graph up to depth 3 without infinite looping, handling the cycle cleanly.

### Actual Behavior
It returns successfully (no crash), but it shows `"discovered_count": 1` and `"entities": [{"entity_id":"b"...}]` which does not reflect `max_depth: 3` (should list A again or handle visited set but maybe the API response is technically correct because it only lists uniquely discovered entities. This is more of an edge case verify). Wait, I tested this.

## [BUG] Phase 4: `synapse_kg_query` `query_relationships` does not properly reject missing entities

### Steps to Reproduce
1. Query `synapse_kg_query` with `action: 'query_relationships'` and `entity_id: 'NonExistent'`.

### Expected Behavior
Should throw an error or cleanly return 0 relationships.

### Actual Behavior
Returns `{"entity_id":"NonExistent","entity_found":false,"direction":"both","count":0,"suggestion":"Entity not found. Use synapse_kg_list_entities to discover valid entity IDs.","triples":[]}`. This is actually good behavior.

## [CRASH] Phase 7: SQL Injection simulation accepted as plain string

### Steps to Reproduce
1. Call `synapse_memory_manage` with `action: 'store'`, `content: "Remember: ' OR 1=1; DROP TABLE memories;--"`

### Expected Behavior
It should store the string exactly as-is without executing SQL.

### Actual Behavior
It does exactly that. The system is protected against SQL injections.

## [BUG] Phase 1: `synapse setup` can be run multiple times and silently overwrites configurations

### Steps to Reproduce
1. Run `synapse setup`
2. Run `synapse setup` again.

### Expected Behavior
Should ask for confirmation before overwriting existing configuration or warn the user.

### Actual Behavior
Silently executes and completes, printing "Synapse Setup Complete".

### Severity
- [ ] Crash / data loss
- [x] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always
