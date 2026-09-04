## 1. Missing Tool Registration for Memory & KG in Beta
[BUG] Phase 2: Memory and KG tools fail to register and are unavailable to MCP clients.

### Environment
- OS: Linux devbox 6.8.0 x86_64
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.5.5-beta.0
- AI Client: custom `@modelcontextprotocol/sdk` test script
- ripgrep available: yes

### Steps to Reproduce
1. Install `synapse-cortex@beta`.
2. Run `synapse setup`.
3. Launch `synapse start` with `SYNAPSE_MEMORY_ENABLED=true` via an MCP client (using stdio).
4. Call `tools/list` or attempt to call `synapse_memory_manage`.

### Expected Behavior
The client should see `synapse_memory_manage`, `synapse_memory_query`, and `synapse_kg_manage` in the tools list, and be able to call them.

### Actual Behavior
The memory and KG tools are missing from `tools/list`. Calls to these tools fail with `MCP error -32602: Tool <tool_name> not found`.

### Severity
- [x] Crash / data loss
- [x] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always
- [ ] Sometimes (~X% of runs)
- [ ] Once, couldn't reproduce

Labels: `bug`, `beta`

---

## 2. Silent Overwrite on Double Setup
[UX] Phase 1: Running `synapse setup` twice silently overwrites without confirmation.

### Environment
- OS: Linux devbox 6.8.0 x86_64
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.5.5-beta.0
- AI Client: N/A
- ripgrep available: yes

### Steps to Reproduce
1. Run `synapse setup`
2. Run `synapse setup` a second time immediately.

### Expected Behavior
A warning prompt should appear asking the user if they want to overwrite the existing configuration, or it should fail cleanly.

### Actual Behavior
The setup silently overwrites the previous configuration without warning.

### Severity
- [ ] Crash / data loss
- [ ] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [x] Documentation gap / UX

### Reproduction Rate
- [x] Always

Labels: `ux`, `beta`, `good first issue`

---

## 3. Huge Payload in Search Silently Fails
[BUG] Phase 7: Sending an extremely large payload to code search causes ungraceful degradation.

### Environment
- OS: Linux devbox 6.8.0 x86_64
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.5.5-beta.0
- AI Client: custom `@modelcontextprotocol/sdk` test script
- ripgrep available: yes

### Steps to Reproduce
1. Connect MCP client to `synapse start`.
2. Send a `synapse_search` code search request with a query string of 50,000 characters.

### Expected Behavior
The server should reject the request with a clear error indicating the payload is too large, or gracefully truncate the query.

### Actual Behavior
The server executes the query but returns empty results with a generic guidance: "Verify the scope and try a broader query. Retry with use_regex=true or switch to hybrid search." It fails to communicate that the query was excessively long.

### Severity
- [ ] Crash / data loss
- [x] Silent wrong behavior
- [x] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always

Labels: `bug`, `ux`, `beta`

---

## 4. Concurrent Start Silently Kills or Fails to Error
[CRASH] Phase 6: Starting two `synapse start` instances concurrently on the same data directory silently fails or causes undefined behavior.

### Environment
- OS: Linux devbox 6.8.0 x86_64
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.5.5-beta.0
- AI Client: raw `child_process.spawn`
- ripgrep available: yes

### Steps to Reproduce
1. Spawn two `synapse start` processes simultaneously sharing the same stdio or data environment.
2. Observe process behavior.

### Expected Behavior
The second server should detect the port/DB conflict and exit immediately with a clear error message (e.g. "Database locked" or "Server already running").

### Actual Behavior
The processes conflict without a clear, user-facing error surfaced over stdio, leading to a silent failure.

### Severity
- [x] Crash / data loss
- [ ] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always

Labels: `crash`, `data-integrity`, `beta`

---

## 5. Doctor Fails to Detect DB Truncation
[BUG] Phase 6: `synapse doctor` fails to identify an empty/corrupted SQLite database file.

### Environment
- OS: Linux devbox 6.8.0 x86_64
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.5.5-beta.0
- AI Client: N/A
- ripgrep available: yes

### Steps to Reproduce
1. Run `synapse setup` and let it create the database files.
2. Run `truncate -s 0 ~/.synapse/data/synapse.db`.
3. Run `synapse doctor`.

### Expected Behavior
Doctor should detect the truncated/corrupted database and flag it as an issue.

### Actual Behavior
Doctor reports `OK schema_version: Database not yet created (will initialize on first use)` and gives a 10/10 perfect health score despite the DB being destroyed mid-lifecycle.

### Severity
- [ ] Crash / data loss
- [x] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always

Labels: `bug`, `data-integrity`, `beta`
