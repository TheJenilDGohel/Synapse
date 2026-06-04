# Synapse Agentic End-to-End Breakage Report

**Environment**
- OS: Linux devbox 6.8.0 #1 SMP PREEMPT_DYNAMIC x86_64 x86_64 x86_64 GNU/Linux
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- ripgrep available: yes

---

## [BUG] Phase 1: `synapse setup` silently overwrites existing configuration without confirmation

### Steps to Reproduce
1. Run `npx synapse setup` to initialize the project for the first time.
2. Run `npx synapse setup` again immediately after the first successful setup.

### Expected Behavior
The CLI should detect that Synapse is already configured for the current directory and either abort with a warning or prompt the user for confirmation before silently overwriting the setup.

### Actual Behavior
The CLI reruns the setup process completely, outputting `[setup] auto-detected 1 root(s): /tmp/synapse-test` and successfully replacing the configuration without any interactive prompt or warning.

### Severity
- [ ] Crash / data loss
- [x] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always
- [ ] Sometimes
- [ ] Once, couldn't reproduce

---

## [BUG] Phase 4: `kg query` silently fails to warn when querying a non-existent entity

### Steps to Reproduce
1. Start with a fresh/empty Synapse installation or any installation.
2. Run `npx synapse kg query "Find everything"` (or any completely undefined entity name).

### Expected Behavior
The CLI should raise an error or display a warning explicitly stating that the node does not exist in the graph.

### Actual Behavior
The CLI silently treats the node as valid but having zero relationships, outputting: `No relationships found for entity "Find everything" (find_everything)`.

### Severity
- [ ] Crash / data loss
- [x] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always
- [ ] Sometimes
- [ ] Once, couldn't reproduce

---

## [PERF] Phase 8: Storing large payloads and subsequent memory recalls exceeds performance targets

### Steps to Reproduce
1. Run `npx synapse memory add --content "perf test memory" --kind note` to get a baseline timing (measured at ~2s).
2. Run a loop to rapidly add 50 memories (e.g., `for i in {1..50}; do npx synapse memory add ...`).
3. Run a query: `npx synapse memory search --query "bulk memory 25"`.

### Expected Behavior
According to the baseline targets:
- Store a memory: < 500ms
- Recall a specific memory (50 stored): < 300ms

### Actual Behavior
- `Store a memory` took **2.162s** (over 4x the target).
- `Recall a specific memory (50 stored)` took **1.926s** (over 6x the target).
Note: Time taken does include the Node startup overhead for `npx synapse`, but even accounting for that, the operations consistently exceed targets under load.

### Severity
- [ ] Crash / data loss
- [ ] Silent wrong behavior
- [ ] Poor error message
- [x] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always
- [ ] Sometimes
- [ ] Once, couldn't reproduce

---

## [BUG] Phase 6: `synapse doctor` fails to detect complete database truncation/corruption

### Steps to Reproduce
1. Ensure Synapse is initialized and has a valid database file at `~/.synapse/data/synapse.memory.db`.
2. Truncate the database file completely using `truncate -s 0 ~/.synapse/data/synapse.memory.db`.
3. Run `npx synapse doctor`.
4. Run `npx synapse memory list`.

### Expected Behavior
`synapse doctor` should flag the database as corrupted and the health score should reflect a critical data integrity failure. Additionally, it should provide a recovery path.

### Actual Behavior
`synapse doctor` outputs `OK schema_version: Schema version: 0 (unmigrated)` and reports `Health: [####################] 10/10` with `OK Doctor result: healthy`.
Subsequent reads such as `npx synapse memory list` return `No memories stored yet.` instead of reporting database corruption. This means total data loss happens completely silently.

### Severity
- [x] Crash / data loss
- [x] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always
- [ ] Sometimes
- [ ] Once, couldn't reproduce
