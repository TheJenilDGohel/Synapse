# Agentic End-to-End Breakage Protocol Findings

## Environment
- OS: Linux
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: @modelcontextprotocol/sdk/client (StdioClientTransport)
- ripgrep available: yes

---

## Issue 1

### Title
[BUG] PHASE 2: `synapse start` completely hangs with no output

### Body

## Environment
- OS: Linux
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client (Claude Desktop / Cursor / etc.): Custom script using @modelcontextprotocol/sdk/client
- ripgrep available: yes

## Steps to Reproduce
1. Install `synapse-cortex@beta`
2. Run `synapse setup`
3. Run `synapse start`

## Expected Behavior
The process should gracefully start the MCP server over stdio and log out readiness, or seamlessly enter a waiting state where an MCP client can request capabilities.

## Actual Behavior
The `synapse start` process launches but hangs indefinitely. It does not output any initial configuration data or capability listings on stdout/stderr, and when attempting to wrap it with an `@modelcontextprotocol/sdk` client via `StdioClientTransport`, the client times out trying to connect and list tools.

## Severity
- [x] Crash / data loss
- [ ] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

## Reproduction Rate
- [x] Always
- [ ] Sometimes (~X% of runs)
- [ ] Once, couldn't reproduce

---

## Issue 2

### Title
[CRASH] PHASE 2: `synapse mcp start` crashes due to missing .js file

### Body

## Environment
- OS: Linux
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client (Claude Desktop / Cursor / etc.): N/A
- ripgrep available: yes

## Steps to Reproduce
1. Install `synapse-cortex@beta`
2. Run `synapse setup`
3. Run `synapse mcp start`

## Expected Behavior
The MCP server should launch successfully using the `mcp-server` script.

## Actual Behavior
The command crashes with the following error:
```
Error: MCP server entry not found: /app/src/interfaces/app/mcp-server.js
```
The file exists as `mcp-server.ts` rather than `.js` on disk.

## Severity
- [x] Crash / data loss
- [ ] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

## Reproduction Rate
- [x] Always
- [ ] Sometimes (~X% of runs)
- [ ] Once, couldn't reproduce

---

## Issue 3

### Title
[BUG] PHASE 6: `synapse doctor` fails to detect 0-byte SQLite corruption

### Body

## Environment
- OS: Linux
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client (Claude Desktop / Cursor / etc.): N/A
- ripgrep available: yes

## Steps to Reproduce
1. Install `synapse-cortex@beta` and run `synapse setup`
2. Create a memory to generate the `synapse.memory.db` file
3. Manually run `truncate -s 0 ~/.synapse/data/synapse.memory.db`
4. Run `synapse doctor`

## Expected Behavior
The doctor should test opening the SQLite database, detect that it is completely empty/corrupted rather than a valid SQLite format, and report an error or issue under `schema_version` or a general SQLite backend check.

## Actual Behavior
The doctor prints:
```
OK schema_version: Schema version: 17 (Database: /home/user/.synapse/data/synapse.memory.db)
```
and reports `Health: [####################] 10/10`.

## Severity
- [ ] Crash / data loss
- [x] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

## Reproduction Rate
- [x] Always
- [ ] Sometimes (~X% of runs)
- [ ] Once, couldn't reproduce

---

## Issue 4

### Title
[BUG] PHASE 4: Knowledge Graph allows adding triples with implicitly undefined ghost nodes

### Body

## Environment
- OS: Linux
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client (Claude Desktop / Cursor / etc.): N/A
- ripgrep available: yes

## Steps to Reproduce
1. Install and setup `synapse`
2. Run `synapse kg add --subject "Project X" --predicate "depends on" --object "[thing you never defined]"`

## Expected Behavior
Because `[thing you never defined]` is an explicitly adversarial/undefined target, the Knowledge Graph tool should either fail the relationship insertion, ask the user if they'd like to dynamically create the missing object node, or error out indicating an invalid reference.

## Actual Behavior
It automatically constructs a node called `thing_you_never_defined` without alerting the user, creating a ghost node in the graph:
```
Created triple triple_5dccd4cd-e8c5-4d51-9669-173651ca8b86
  Project X --[depends on]--> [thing you never defined]
  Subject ID:  project_x
  Object ID:   thing_you_never_defined
```

## Severity
- [ ] Crash / data loss
- [x] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

## Reproduction Rate
- [x] Always
- [ ] Sometimes (~X% of runs)
- [ ] Once, couldn't reproduce
