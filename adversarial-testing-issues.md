# Agentic Bug Report - Synapse Cortex Beta

## Environment
- OS: Linux x86_64
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: StdioClientTransport (SDK)
- ripgrep available: yes

## Bugs Found

### [UX] Phase 1: \`synapse setup\` does not confirm overwrite
- **Steps:** Run \`synapse setup\` twice.
- **Expected:** It should prompt before overwriting an existing config.
- **Actual:** Running \`synapse setup\` multiple times simply overwrites without prompt.
- **Severity:** Silent wrong behavior / UX

### [BUG] Phase 1: \`synapse doctor\` returns 9/10 with missing config instead of structured failure
- **Steps:** Delete config and run \`synapse doctor\`.
- **Expected:** It should report poor health or explicitly fail clearly as the system cannot run.
- **Actual:** While it flags \`config_file\` as FAIL, it reports 9/10 health.
- **Severity:** Poor error message / UX

### [PERF] Phase 3: Memory Store takes > 1.5 seconds
- **Steps:** Create a memory programmatically.
- **Expected:** Store operation under 500ms.
- **Actual:** \`synapse_memory_manage\` store operation took ~1782ms on local execution, which exceeds the 500ms target.
- **Severity:** Performance

### [BUG] Phase 4: KG Manage missing schema for \`add_entities_batch\` and others
- **Steps:** Use \`synapse_knowledge_graph_manage\` (actually \`synapse_kg_manage\`) to add a batch.
- **Expected:** Batch actions should be valid in the schema.
- **Actual:** The enum lists batch actions, but tool input validations fail for valid use cases when these are used by AI because of missing properties definitions.
- **Severity:** Silent wrong behavior

### [CRASH] Phase 4: KG Manage \`add_entity\` returns undefined \`data\`
- **Steps:** Call \`synapse_kg_manage\` with \`action: add_entity\`.
- **Expected:** Valid structured return with data property containing \`id\`.
- **Actual:** Returns a successful looking object but \`structuredContent.data\` is undefined. The internal tool response structure doesn't match MCP expectations, leading to client-side crashes when dereferencing.
- **Severity:** Crash / data loss

### [BUG] Phase 4: KG Manage schema camelCase vs snake_case mismatch
- **Steps:** Use \`subjectName\` when passing to \`synapse_kg_manage\`.
- **Expected:** Should validate properly or clearly reject.
- **Actual:** Schema uses \`subject_name\`, \`object_name\` but system prompts or user expectations might use \`subjectName\`. Using camelCase fails input validation and internal implementation mismatched what the schema exported.
- **Severity:** Silent wrong behavior

### [BUG] Phase 4: KG Query \`traverse\` schema vs implementation mismatch
- **Steps:** Call \`synapse_kg_query\` with \`action: traverse\` and \`start_entity_id: "..."\`.
- **Expected:** Successful traversal.
- **Actual:** Schema defines \`start_entity_id\` but the implementation inside \`synapse_kg_query\` traverse throws 'startEntityId is required' if \`start_entity_id\` is passed, or if \`startEntityId\` is passed it fails MCP schema validation upfront.
- **Severity:** Silent wrong behavior

### [DATA-INTEGRITY] Phase 6: Mid-truncation DB Lock
- **Steps:** Truncate DB to 0 bytes \`truncate -s 0 ~/.synapse/data/synapse.memory.db\`, start server, store memory.
- **Expected:** Should detect corruption cleanly, or error properly and doctor should detect.
- **Actual:** Truncating DB to 0 bytes makes the DB report as 'locked' on next start without \`synapse doctor\` detecting any corruption (reports Schema version 0, 10/10 Health). The process hangs / fails queries silently.
- **Severity:** Crash / data loss

### [UX] Phase 3: Contradictory memories cause multiple results
- **Steps:** Store a fact, then store contradictory fact, then query.
- **Expected:** Should resolve contradiction or merge.
- **Actual:** Storing a contradictory fact about the same topic leads to both memories being retrieved. It does not resolve conflicts or flag contradictions in standard recall.
- **Severity:** UX / Silent wrong behavior
