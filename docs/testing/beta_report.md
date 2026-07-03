
# Synapse beta Testing Report & Findings

## Environment
- OS: Linux (Ubuntu x86_64)
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- ripgrep available: yes

## Bug Reports

### 1. [UX] Phase 1: `synapse setup` silently overwrites configuration
**Steps to Reproduce:**
1. Run `synapse setup`
2. Run `synapse setup` again

**Expected Behavior:**
It should ask for confirmation before overwriting an existing configuration file.

**Actual Behavior:**
It silently overwrites the configuration.

**Severity:**
- [x] UX / Silent overwrites

---

### 2. [BUG] Phase 6: DB Corruption results in unhelpful 'database is locked' errors
**Steps to Reproduce:**
1. Truncate `~/.synapse/data/synapse.memory.db` to 0 bytes while running or before starting.
2. Connect to the MCP server.
3. Try to use a tool like `synapse_memory_manage` to store a memory.

**Expected Behavior:**
The server should detect database corruption (or lack of tables) and cleanly report a corruption error or attempt to recover/reinitialize.

**Actual Behavior:**
The server returns `database is locked` or other generic sqlite errors to the MCP client.

**Severity:**
- [x] Poor error message / Data integrity

---

### 3. [DOCS] Phase 6: `synapse doctor` does not clearly flag a corrupted 0-byte database
**Steps to Reproduce:**
1. Truncate `~/.synapse/data/synapse.memory.db` to 0 bytes.
2. Run `synapse doctor`.

**Expected Behavior:**
The doctor should report that the database is corrupted or in an invalid state.

**Actual Behavior:**
It reports: `OK schema_version: Schema version: 0 (unmigrated) (Database: ...)` and gives a 10/10 health score.

**Severity:**
- [x] Documentation gap / Poor error message

---

## Performance Baselines
- Connect time: ~1200ms
- Store memory: ~10ms
- Recall memory: ~4ms
- Code search: ~2ms

*All performance metrics are well within the required thresholds.*

## Stability Checklist
- [x] Fresh install works end-to-end
- [x] All MCP tools visible in at least one client
- [x] Memory persists across client restarts
- [x] Knowledge graph handles cycles and orphans without crashing (Validation errors returned)
- [x] Code search degrades gracefully
- [x] All adversarial inputs handled without crash (Validation errors returned properly)
- [ ] DB corruption detected and communicated to user (Failed - see bug reports)
- [ ] `synapse doctor` correctly surfaces all health issues (Failed - misses 0-byte DB)
- [x] All bugs filed with reproduction steps (Local report generated)
- [x] Performance baselines noted and attached to session
