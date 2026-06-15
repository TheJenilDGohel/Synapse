# End-to-End Breakage Protocol Results
## Environment
- OS: Linux 6.8.0 #1 SMP PREEMPT_DYNAMIC
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: Custom Node.js MCP SDK Client
- ripgrep available: yes

## Bug Reports

### [BUG] Phase 4.1: Delete node fails output schema validation
**Environment:** Linux / Node v22.22.1 / synapse-cortex@beta
**Steps to Reproduce:**
1. Start `synapse start` as an MCP server.
2. Call `synapse_knowledge_graph_manage` tool with action `add_entity` to create a test node (e.g., `node_a`).
3. Call `synapse_knowledge_graph_manage` tool with action `delete_entity` passing `entity_id` = `"node_a"`.
**Expected Behavior:**
The node is deleted and the server returns a successful response adhering to the MCP tool's output schema.
**Actual Behavior:**
The tool fails with an output schema validation error from MCP:
```json
{"content":[{"type":"text","text":"MCP error -32602: Output validation error: Invalid structured content for tool synapse_knowledge_graph_manage: [\n  {\n    \"expected\": \"number\",\n    \"code\": \"invalid_type\",\n    \"path\": [\n      \"data\",\n      \"deleted\"\n    ],\n    \"message\": \"Invalid input: expected number, received boolean\"\n  }\n]"}],"isError":true}
```
**Severity:**
- [x] Silent wrong behavior
- [x] Poor error message
**Reproduction Rate:**
- [x] Always

---

### [BUG] Phase 6.1: DB Corruption causes vague "database is locked" error, then silently wipes data on restart
**Environment:** Linux / Node v22.22.1 / synapse-cortex@beta
**Steps to Reproduce:**
1. Start `synapse start` in the background.
2. Manually truncate the SQLite DB file to 0 bytes: `truncate -s 0 ~/.synapse/data/synapse.memory.db`.
3. Make a tool call (e.g., `synapse_memory_manage` store).
4. Restart the server and run `synapse doctor`.
**Expected Behavior:**
The server immediately detects the corruption upon access and clearly informs the user (e.g., via `synapse doctor` or error payload). On restart, it should warn about the corrupted state instead of silently proceeding.
**Actual Behavior:**
The store operation simply returns a vague `database is locked` error payload. `synapse doctor` does not flag any DB health issue. Upon next restart, it silently initializes a new empty database without warning about previous data loss.
**Severity:**
- [x] Crash / data loss
- [x] Poor error message
**Reproduction Rate:**
- [x] Always

---

### [BUG] Phase 4.1: Adding relationship with undefined node creates dangling reference silently
**Environment:** Linux / Node v22.22.1 / synapse-cortex@beta
**Steps to Reproduce:**
1. Call `synapse_knowledge_graph_manage` tool with action `add_triple` with a `subject_id` that exists and an `object_id` that has never been defined (`undefinedthing`).
**Expected Behavior:**
The operation should either reject the triple creation because the node does not exist, or auto-create a proper node entry for `undefinedthing` and inform the user.
**Actual Behavior:**
The operation succeeds and stores the triple (`"object_id": "undefinedthing"`), creating a dangling graph relationship without validating the existence of the target node.
**Severity:**
- [x] Silent wrong behavior
**Reproduction Rate:**
- [x] Always

---

### [BUG] Phase 4.1: Adding entity with >400 character name throws raw Zod validation JSON
**Environment:** Linux / Node v22.22.1 / synapse-cortex@beta
**Steps to Reproduce:**
1. Call `synapse_knowledge_graph_manage` tool with action `add_entity`.
2. Provide a name string > 400 characters.
**Expected Behavior:**
A clean, friendly error message explaining the length limit or graceful truncation.
**Actual Behavior:**
Throws a raw JSON array string from Zod:
`Too big: expected string to have <=400 characters` wrapped inside a messy validation payload.
**Severity:**
- [x] Poor error message
**Reproduction Rate:**
- [x] Always

### [BUG] Phase 6.3: Concurrent Access causes secondary server to hang instead of erroring
**Environment:** Linux / Node v22.22.1 / synapse-cortex@beta
**Steps to Reproduce:**
1. Start `synapse start` in Terminal 1.
2. Start `synapse start` simultaneously in Terminal 2.
**Expected Behavior:**
The second server detects that the MCP endpoint or the SQLite database is already in use and crashes cleanly with an informative error message.
**Actual Behavior:**
The second server process hangs indefinitely (never printing its banner to STDOUT or STDERR), locking up without providing any feedback to the client or user.
**Severity:**
- [x] Poor error message
- [x] Silent wrong behavior
**Reproduction Rate:**
- [x] Always
