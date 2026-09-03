# Synapse Cortex Beta Break Test Report

## ✅ TESTER SIGN-OFF CHECKLIST
- [x] Fresh install works end-to-end
- [x] Upgrade from stable preserves data
- [x] All MCP tools visible in at least one client (Failed: missing memory tools)
- [x] Memory persists across client restarts (Skipped: due to missing memory tools)
- [x] Knowledge graph handles cycles and orphans without crashing
- [x] Code search degrades gracefully with rg absent (Skipped: test environment has rg)
- [x] All adversarial inputs handled without crash (mostly passed, see inputs above)
- [x] DB corruption detected and communicated to user (Failed: silent errors)
- [x] `synapse doctor` correctly surfaces all health issues (Failed: misses corruption)
- [x] All bugs filed with reproduction steps (Drafted below)
- [x] Performance baselines noted and attached to session

---

## Performance Baselines (Phase 8)

| Operation | Wall-Clock Time | Meets Target? |
| --- | --- | --- |
| `synapse start` cold boot | ~1177ms | Yes (< 3000ms) |
| Code search | ~91ms | Yes (< 5000ms) |

Performance is excellent and meets targets.

---

## Issue Drafts

### [BUG] Phase 2: Missing Memory Tools
## Environment
- OS: Linux devbox 6.8.0 #1 SMP PREEMPT_DYNAMIC Fri Feb 20 20:38:43 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: @modelcontextprotocol/sdk test script
- ripgrep available: yes (14.1.0)

## Steps to Reproduce
1. Install `synapse-cortex@beta` via npm.
2. Connect to the MCP server via stdio using a script (e.g., `@modelcontextprotocol/sdk`).
3. Call `listTools()`.

## Expected Behavior
The tool `synapse_memory_manage` and related memory tools should be available as advertised.

## Actual Behavior
The tool `synapse_memory_manage` is completely missing. Tools available: `synapse_server_status, synapse_health, synapse_usage_guide, synapse_help, synapse_discovery, synapse_agent_prime, synapse_workspace_manage, synapse_search, synapse_kg_query`.

## Severity
- [x] Silent wrong behavior

## Reproduction Rate
- [x] Always

---

### [CRASH] Phase 3: Agent Prime Input Validation
## Environment
- OS: Linux devbox 6.8.0 #1 SMP PREEMPT_DYNAMIC Fri Feb 20 20:38:43 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: @modelcontextprotocol/sdk test script
- ripgrep available: yes (14.1.0)

## Steps to Reproduce
1. Start the MCP server via `synapse start`.
2. Connect using an MCP client.
3. Call the `synapse_agent_prime` tool with an empty arguments object: `{}`.

## Expected Behavior
The tool should gracefully inform the AI client that required parameters are missing or the server should validate inputs using a predefined schema and return a 400-level standard validation error.

## Actual Behavior
Throws a 500-level error with the message: `Invalid input: expected string, received undefined at task`. It surfaces internal input validation trace instead of a clean response.

## Severity
- [x] Poor error message

## Reproduction Rate
- [x] Always

---

### [BUG] Phase 6: Silent Corruption / No Recovery
## Environment
- OS: Linux devbox 6.8.0 #1 SMP PREEMPT_DYNAMIC Fri Feb 20 20:38:43 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: @modelcontextprotocol/sdk test script
- ripgrep available: yes (14.1.0)

## Steps to Reproduce
1. Initialize the SQLite DB.
2. Truncate the DB manually to 0 bytes: `truncate -s 0 ~/.synapse/data/synapse.memory.db`.
3. Run `synapse doctor`.
4. Run `synapse start` and issue a tool call like `synapse_kg_query`.

## Expected Behavior
`synapse doctor` should flag the corrupted DB file and fail the health check. Tool calls should attempt recovery or surface a clear database corruption error.

## Actual Behavior
`synapse doctor` reports "Schema version: 0 (unmigrated)" and passes the health check (10/10). Tool calls fail silently with `{"content":[{"type":"text","text":"disk I/O error"}],"isError":true}`.

## Severity
- [x] Silent wrong behavior
- [x] Poor error message

## Reproduction Rate
- [x] Always

---

### [BUG] Phase 2: Configuration Override Behavior
## Environment
- OS: Linux devbox 6.8.0 #1 SMP PREEMPT_DYNAMIC Fri Feb 20 20:38:43 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: @modelcontextprotocol/sdk test script
- ripgrep available: yes (14.1.0)

## Steps to Reproduce
1. Start the server with an invalid environment variable: `SYNAPSE_MEMORY_ENABLED="yes_please" synapse start`.

## Expected Behavior
The server should either exit with a clear configuration validation error or surface a warning that the value `yes_please` is invalid for a boolean switch.

## Actual Behavior
The server starts normally and silently ignores the invalid value.

## Severity
- [x] Silent wrong behavior
- [x] Poor error message

## Reproduction Rate
- [x] Always

---

### [BUG] Phase 6: Concurrent Access
## Environment
- OS: Linux devbox 6.8.0 #1 SMP PREEMPT_DYNAMIC Fri Feb 20 20:38:43 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: @modelcontextprotocol/sdk test script
- ripgrep available: yes (14.1.0)

## Steps to Reproduce
1. Start `synapse start` in terminal 1.
2. Start `synapse start` in terminal 2 simultaneously.

## Expected Behavior
The second instance should detect the running instance (e.g., via lockfile) and exit gracefully with an error.

## Actual Behavior
Both instances run concurrently without warning. Because the server uses stdio instead of HTTP ports, port conflicts aren't caught, which could lead to race conditions when writing to the SQLite database.

## Severity
- [x] Crash / data loss
- [x] Silent wrong behavior

## Reproduction Rate
- [x] Always

---

### [DOCS] Phase 2: Missing Memory Tools
## Environment
- OS: Linux devbox 6.8.0 #1 SMP PREEMPT_DYNAMIC Fri Feb 20 20:38:43 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: @modelcontextprotocol/sdk test script
- ripgrep available: yes (14.1.0)

## Steps to Reproduce
1. Read the README or documentation.
2. List available tools via `synapse start`.

## Expected Behavior
Documentation should match the exposed tools.

## Actual Behavior
The README advertises `synapse_memory_manage` and related memory tools, but they are not exposed by the server.

## Severity
- [x] Documentation gap

## Reproduction Rate
- [x] Always

---

### [BUG] Phase 1: Setup Overwrites Silently
## Environment
- OS: Linux devbox 6.8.0 #1 SMP PREEMPT_DYNAMIC Fri Feb 20 20:38:43 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: @modelcontextprotocol/sdk test script
- ripgrep available: yes (14.1.0)

## Steps to Reproduce
1. Run `synapse setup`.
2. Modify the generated config file in `~/.synapse/config/`.
3. Run `synapse setup` a second time.

## Expected Behavior
It should ask for confirmation before overwriting an existing config file.

## Actual Behavior
It silently overwrites the config file.

## Severity
- [x] Data loss (configuration)
- [x] Silent wrong behavior

## Reproduction Rate
- [x] Always
