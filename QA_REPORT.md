# Synapse QA Report

## Environment
- OS: Linux (devbox 6.8.0 x86_64)
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: StdioClientTransport via @modelcontextprotocol/sdk script
- ripgrep available: yes

---

## 1. [BUG] Phase 4: Misleading error message when adding triple with non-existent subject node

### Steps to Reproduce
1. Connect to the MCP server.
2. Call `synapse_kg_manage` with `action: "add_triple"`, `subjectName: "Project X"`, `predicate: "depends on"`, `objectName: "UNDEFINED_NODE_THAT_DOES_NOT_EXIST"`.
3. Ensure that "Project X" does not exist in the graph yet.
4. Observe the error.

### Expected Behavior
The server should raise an error indicating that the node "Project X" does not exist and needs to be created first, or handle it properly.

### Actual Behavior
The tool returns: `subject is required (provide subjectId or subjectName)`. This is highly misleading since `subjectName` was actually provided. The real issue is that the subject couldn't be resolved because it wasn't added yet.

### Severity
- [ ] Crash / data loss
- [ ] Silent wrong behavior
- [x] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always
- [ ] Sometimes
- [ ] Once

---

## 2. [BUG] Phase 6: `synapse doctor` fails to accurately flag a corrupted/truncated SQLite database

### Steps to Reproduce
1. Start synapse (`synapse start &`).
2. Truncate the DB file: `truncate -s 0 ~/.synapse/data/synapse.memory.db`.
3. Kill the server and run `synapse doctor`.

### Expected Behavior
`synapse doctor` should detect that the SQLite database file is corrupted or truncated, flag it as an issue, and potentially offer recovery/backup restore.

### Actual Behavior
`synapse doctor` marks `schema_version` as `OK`, showing: `Schema version: 0 (unmigrated) (Database: /home/jules/.synapse/data/synapse.memory.db)`. It reports Health: 10/10 and overall status as `healthy`. It does not detect corruption.

### Severity
- [x] Crash / data loss
- [ ] Silent wrong behavior
- [x] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always
- [ ] Sometimes
- [ ] Once

---

## 3. [PERF] Phase 8: Recalling a memory fails to meet < 300ms performance target

### Steps to Reproduce
1. Connect to the MCP server.
2. Rapidly store 50 memories (e.g. sequentially in a loop).
3. Call `synapse_memory_query` with `action: "recall"`.
4. Measure the execution time of the recall.

### Expected Behavior
Recall a specific memory with 50 stored items should take < 300ms.

### Actual Behavior
In testing, the recall query takes ~575ms (exceeds the 300ms target). Note: execution overhead may include Node SDK serialization, but the total time from client perspective misses the baseline.

### Severity
- [ ] Crash / data loss
- [ ] Silent wrong behavior
- [ ] Poor error message
- [x] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always
- [ ] Sometimes
- [ ] Once
