# Synapse Cortex Beta Bugs

## 🐛 [BUG] Phase 1: Silent Overwrite on Setup
### Environment
- OS: Linux 6.8.0 x86_64
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: Node.js `@modelcontextprotocol/sdk` (custom tester)
- ripgrep available: yes

### Steps to Reproduce
1. Install `synapse-cortex@beta`.
2. Run `synapse setup`.
3. Run `synapse setup` again.

### Expected Behavior
The setup command should ask for confirmation before overwriting the existing configuration or clearly state that it is updating the existing configuration in a non-destructive manner.

### Actual Behavior
The command silently reruns and overwrites the config without prompting.

### Severity
- [ ] Crash / data loss
- [x] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always

---

## 🐛 [UX] Phase 1: No clear error on premature start
### Environment
- OS: Linux 6.8.0 x86_64
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: Node.js `@modelcontextprotocol/sdk` (custom tester)
- ripgrep available: yes

### Steps to Reproduce
1. Ensure no configuration exists (`rm -rf ~/.synapse`).
2. Run `synapse start`.

### Expected Behavior
The command should fail gracefully, instructing the user to run `synapse setup` first, since the server isn't configured.

### Actual Behavior
The command automatically initializes standard defaults and hangs waiting for MCP input over stdio without any clear warning that it bypassed the setup process.

### Severity
- [ ] Crash / data loss
- [ ] Silent wrong behavior
- [x] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always

---

## 🐛 [CRASH] Phase 4: Output validation error on delete_entity
### Environment
- OS: Linux 6.8.0 x86_64
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: Node.js `@modelcontextprotocol/sdk` (custom tester)
- ripgrep available: yes

### Steps to Reproduce
1. Connect to the MCP server.
2. Call `synapse_discovery` to activate Knowledge Graph.
3. Call `synapse_kg_manage` with `action: 'add_entity'` and `name: 'NodeToDelete'`.
4. Call `synapse_kg_manage` with `action: 'delete_entity'` and `entity_id: 'node_to_delete'`.

### Expected Behavior
The entity should be deleted successfully, and the tool should return a success message.

### Actual Behavior
The tool throws an unhandled validation error: `MCP error -32602: Output validation error: Invalid structured content for tool synapse_kg_manage: Invalid input: expected number, received boolean at data.deleted`

### Severity
- [x] Crash / data loss (API level crash)
- [ ] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always

---

## 🐛 [BUG] Phase 4: Dangling References on Knowledge Graph Deletion
### Environment
- OS: Linux 6.8.0 x86_64
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: Node.js `@modelcontextprotocol/sdk` (custom tester)
- ripgrep available: yes

### Steps to Reproduce
1. Connect to the MCP server and activate Knowledge Graph.
2. Call `synapse_kg_manage` to add Node A and Node B.
3. Call `synapse_kg_manage` to add a triple `A depends on B`.
4. Assume `delete_entity` worked (or test its intended side effects): Deleting an entity leaves the triple intact, referencing the deleted node ID.
5. In addition, adding a triple with a missing object node silently creates the missing node.

### Expected Behavior
Deleting a node should cascade and delete its associated triples, or it should fail if references exist. Adding a triple with a missing node should either fail or be clearly documented as an auto-create feature.

### Actual Behavior
Triples continue to point to deleted nodes, causing data inconsistency and dangling references.

### Severity
- [ ] Crash / data loss
- [x] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always

---

## 🐛 [BUG] Phase 6: Silent Data Loss on SQLite Corruption
### Environment
- OS: Linux 6.8.0 x86_64
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: Node.js `@modelcontextprotocol/sdk` (custom tester)
- ripgrep available: yes

### Steps to Reproduce
1. Start the server and create some memories.
2. Truncate the DB file to 0 bytes: `truncate -s 0 ~/.synapse/data/synapse.memory.db`.
3. Run `synapse doctor`.
4. Run `synapse start` and connect with a client to store a new memory.

### Expected Behavior
`synapse doctor` should flag the database as corrupted. `synapse start` should refuse to start and prompt the user to recover from a backup.

### Actual Behavior
`synapse doctor` incorrectly marks the database as "Schema version: 0 (unmigrated)" and gives a 10/10 health score. `synapse start` silently re-initializes the database from scratch, permanently wiping out any chance of recovering the previous data.

### Severity
- [x] Crash / data loss
- [ ] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always

---

## 🐛 [BUG] Phase 6: Database locked on concurrent start
### Environment
- OS: Linux 6.8.0 x86_64
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: Node.js `@modelcontextprotocol/sdk` (custom tester)
- ripgrep available: yes

### Steps to Reproduce
1. Start `synapse start` in Terminal 1.
2. Simultaneously start `synapse start` in Terminal 2.
3. Attempt to store a memory.

### Expected Behavior
The second instance should gracefully fail to start, citing that the port or database lock is already held.

### Actual Behavior
Both instances start. When trying to write to the database, a `database is locked` error is returned, completely stalling the service.

### Severity
- [ ] Crash / data loss
- [x] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Sometimes (~80% of runs when race conditions hit)

---

## 🐛 [DOCS] Phase 9: Missing documentation for KG deletion and Corruption Recovery
### Environment
- OS: Linux 6.8.0 x86_64
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: Node.js `@modelcontextprotocol/sdk` (custom tester)
- ripgrep available: yes

### Steps to Reproduce
1. Read `README.md` and `synapse --help`.
2. Look for instructions on deleting nodes/triples.
3. Look for instructions on handling corrupted SQLite databases.

### Expected Behavior
There should be explicit CLI commands or MCP tool documentation regarding node deletion (`delete_entity`) and recovery steps for DB corruption.

### Actual Behavior
Neither of these critical features/workflows are documented in the README.

### Severity
- [ ] Crash / data loss
- [ ] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [x] Documentation gap

### Reproduction Rate
- [x] Always
