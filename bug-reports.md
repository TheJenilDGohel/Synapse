# Synapse Cortex @beta - Adversarial Testing Bug Reports

This document contains detailed bug reports following the Agentic End-to-End Breakage Protocol.

---

## 1. [BUG] Phase 1: `synapse setup` silently overwrites existing configuration

### Environment
- OS: Linux (Ubuntu 22.04 LTS / 6.8.0)
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: Tested via local terminal
- ripgrep available: yes

### Steps to Reproduce
1. Run `synapse setup` to generate the initial configuration.
2. Verify `~/.synapse/config/synapse.config.json` exists.
3. Run `synapse setup` again.

### Expected Behavior
The CLI should detect an existing configuration and prompt the user for confirmation before overwriting, or warn the user that configuration already exists.

### Actual Behavior
The CLI silently overwrites the existing configuration without warning, potentially destroying custom settings.

### Severity
- [x] Silent wrong behavior
- [ ] Crash / data loss
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always
- [ ] Sometimes (~X% of runs)
- [ ] Once, couldn't reproduce

---

## 2. [CRASH] Phase 6: Mid-execution DB truncation causes process crashes instead of clean recovery

### Environment
- OS: Linux (Ubuntu 22.04 LTS / 6.8.0)
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: MCP SDK Test Script
- ripgrep available: yes

### Steps to Reproduce
1. Start the MCP server: `synapse start &`
2. Wait for it to initialize (models warmed up).
3. In another terminal, truncate the database: `truncate -s 0 ~/.synapse/synapse.db`
4. Attempt to run queries or run `synapse doctor`.

### Expected Behavior
`synapse doctor` should detect the corrupted/empty schema and flag it as a critical failure requiring recovery, or `synapse start` should gracefully detect the corruption on next operation and attempt to rebuild/re-initialize safely.

### Actual Behavior
`synapse doctor` reports `OK schema_version: Schema version: 0 (unmigrated)` as if it's a fresh installation, completely failing to warn the user about data corruption. Existing running server instances crash or produce cryptic SQLite internal errors when trying to read/write against the truncated schema.

### Severity
- [x] Crash / data loss
- [x] Silent wrong behavior
- [x] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always
- [ ] Sometimes (~X% of runs)
- [ ] Once, couldn't reproduce

---

## 3. [UX] Phase 2: Disabling memory tools silently hides them without warning

### Environment
- OS: Linux (Ubuntu 22.04 LTS / 6.8.0)
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: MCP SDK Test Script
- ripgrep available: yes

### Steps to Reproduce
1. Start the MCP server with `SYNAPSE_MEMORY_ENABLED="false"`.
2. Connect an AI client (Claude/Cursor) and request available tools.

### Expected Behavior
The server should either expose memory tools that gracefully return "Memory is disabled" when called, or `synapse start` should log an explicit warning/info message: "Memory tools are disabled via SYNAPSE_MEMORY_ENABLED=false".

### Actual Behavior
The memory tools (`synapse_memory_manage`, `synapse_kg_manage`, etc.) simply do not appear in the MCP tool discovery list. There is no explicit feedback provided by `synapse start` or `synapse doctor` explaining what features were omitted due to configuration.

### Severity
- [ ] Crash / data loss
- [ ] Silent wrong behavior
- [x] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always
- [ ] Sometimes (~X% of runs)
- [ ] Once, couldn't reproduce

---

## 4. [UX] Phase 4: Graph node validation error is cryptic for huge names

### Environment
- OS: Linux (Ubuntu 22.04 LTS / 6.8.0)
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: MCP SDK Test Script
- ripgrep available: yes

### Steps to Reproduce
1. Start MCP server.
2. Call `synapse_kg_manage` with `action: 'add_entity'` and a `name` exceeding 400 characters.

### Expected Behavior
The system should either gracefully truncate the entity name and store it, or return a clear business error indicating the exact schema limits.

### Actual Behavior
It returns a raw Zod-style validation error:
`Validation Error for tool 'synapse_kg_manage': MCP error -32602: Input validation error: Too big: expected string to have <=400 characters at name`
While functional, this exposes internal validation mechanics rather than returning a clean error to the LLM.

### Severity
- [ ] Crash / data loss
- [ ] Silent wrong behavior
- [x] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always
- [ ] Sometimes (~X% of runs)
- [ ] Once, couldn't reproduce

---

## 5. [DOCS] Phase 9: Missing explicit upgrade path documentation

### Environment
- OS: Linux (Ubuntu 22.04 LTS / 6.8.0)
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0

### Steps to Reproduce
1. Search the repository and help commands (`synapse --help`) for an explicit upgrade/migration path when switching between beta and stable versions.

### Expected Behavior
Users should be guided on how to upgrade or downgrade safely without wiping their SQLite DB.

### Actual Behavior
There is a `synapse upgrade` internal command (as seen in `package.json`), but it is not cleanly exposed or well-documented for standard end-users who might just run `npm install -g synapse-cortex@beta`. Upgrading in-place relies on implicit schema migrations that are not mentioned in CLI feedback.

### Severity
- [ ] Crash / data loss
- [ ] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [x] Documentation gap

### Reproduction Rate
- [x] Always
- [ ] Sometimes (~X% of runs)
- [ ] Once, couldn't reproduce
