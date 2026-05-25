# Sentinel: Security Lessons Learned

## 2024-05-24 - [CRITICAL] Command Injection Risk via ripgrep Arguments
**Vulnerability:** In `lexical-search.ts`, `spawnSync` was used to execute `ripgrep` (`rg`) with user-provided arguments (`query`, `base`) directly as trailing positional arguments without a `--` separator. If a user provided a query or path starting with `-`, `ripgrep` would interpret it as an executable flag instead of a search pattern/path.
**Learning:** Even well-known tools like `ripgrep` are vulnerable to command injection/flag hijacking if the distinction between options and positional arguments isn't strictly enforced when spawning shell processes with user inputs.
**Prevention:** Always prepend a double dash (`--`) before any user-controlled input array passed to CLI tools in `spawn`/`spawnSync` that could potentially be interpreted as options or flags.

## 2026-05-10 - [CRITICAL] Ripgrep Command Argument Injection
**Vulnerability:** Found a critical command argument injection vulnerability where user-controlled inputs (`query` and `base`) were passed directly to `spawnSync` executing ripgrep (`rg`) without a `--` separator. This allows attackers to execute arbitrary commands or manipulate ripgrep behavior by injecting flags like `--pre`.
**Learning:** Even when using `spawnSync` instead of shell execution, argument injection is still possible if user inputs can be interpreted as flags by the underlying tool. This is particularly dangerous for tools that support executing other programs (like ripgrep's `--pre` flag).
**Prevention:** Always prepend user-controlled arguments with the `--` delimiter when using `spawn` or `spawnSync` with CLI tools to ensure they are strictly treated as positional arguments and not as executable flags.

## 2026-05-24 - [CRITICAL] Command Injection via shell: true in Claude Code Hooks
**Vulnerability:** A critical command injection vulnerability was found in the `synapse-pre-tool.cjs` and `synapse-post-tool.cjs` hook scripts. These scripts used `spawnSync('synapse.cmd', [...args], { shell: IS_WINDOWS })` where `args` contained unsanitized user inputs extracted from Claude Code tool calls (like the tool description, file paths, or commands run). Because `shell: true` evaluates shell metacharacters before passing arguments to the command, malicious tool inputs (e.g. `Ran: cmd & calc.exe`) would be executed by the shell on Windows, leading to unauthenticated Local Code Execution.
**Learning:** `spawnSync` with `shell: true` or `shell: process.platform === 'win32'` creates immediate command injection risks if any part of the arguments array contains unsanitized data (e.g. `&`, `|`, `>`). The myth that passing an array of arguments to `spawnSync` safely escapes arguments is **false** when `shell: true` is used, as `cmd.exe` parses the entire command string.
**Prevention:** Do not use `shell: true` to execute `.cmd` Node shims. Instead, explicitly invoke the underlying JavaScript file with `process.execPath` (e.g., `spawnSync(process.execPath, [absolutePathToScript, ...args])`). This avoids the shell completely and provides full protection against command injection.
## 2024-05-24 - [CRITICAL] Prevent Command Injection in CLI Script Arguments Used with shell: true
**Vulnerability:** Unsanitized CLI arguments (package name and target version) were passed directly into `spawnSync` with `shell: true` (which defaults to `cmd.exe` on Windows). This allowed potential command injection via shell metacharacters.
**Learning:** Due to Windows requiring `shell: true` to execute `.cmd` scripts (like `npm.cmd`), external inputs passed as arguments to such commands must be strictly validated or sanitized. The use of `--` does not prevent shell parsing before argument resolution on Windows.
**Prevention:** Always apply strict regex sanitization (e.g., `/[^a-zA-Z0-9@/._-]/g`) to user inputs when `shell: true` is necessary.

## 2024-05-24 - [BUG] Phase 2: synapse_memory_manage and synapse_knowledge_graph_manage tools missing from MCP registry
## Environment
- OS: Ubuntu Linux (AMD64)
- Node: Node.js 22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.4
- AI Client: MCP StdIO Client Test Script
- ripgrep available: yes

## Steps to Reproduce
1. Start the server using `node bin/synapse.cjs start`.
2. Connect to the MCP server and send an `initialize` request.
3. Send a `notifications/initialized` request.
4. Send a `tools/list` request to get the list of available tools.
5. Search the response for `synapse_memory_manage` or `synapse_knowledge_graph_manage`.

## Expected Behavior
The core tools for memory management (`synapse_memory_manage`) and knowledge graph management (`synapse_knowledge_graph_manage`) should be available and registered, as they are essential for memory usage and are referenced in documentation and status outputs.

## Actual Behavior
The tools are not listed in the response of `tools/list`.
The available tools returned are: `synapse_server_status, synapse_health, synapse_usage_guide, synapse_help, synapse_discovery, synapse_agent_prime, synapse_workspace_manage, synapse_search, synapse_kg_query`.
Any attempt to call `synapse_memory_manage` results in:
`MCP error -32602: Tool synapse_memory_manage not found`

## Severity
- [x] Silent wrong behavior
- [x] Crash / data loss (Unable to use core functionality)

## Reproduction Rate
- [x] Always

---

## 2024-05-24 - [CRASH] Phase 5: AST Parser Crash in tree-sitter during Stress Testing
## Environment
- OS: Ubuntu Linux (AMD64)
- Node: Node.js 22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.4
- AI Client: Node Script
- ripgrep available: yes

## Steps to Reproduce
1. Run the stress test suite: `npx tsx scripts/quality/stress-synapse.mjs`
2. Wait for the chunking process to start indexing files.

## Expected Behavior
The AST parser and chunker should successfully index the files, or gracefully fallback for unsupported/erroneous AST nodes.

## Actual Behavior
The script outputs multiple unhandled promise rejections / type errors from `tree-sitter`:
```
buildAstSlices error: TypeError: Cannot read properties of undefined (reading '134')
    at unmarshalNode (/app/node_modules/tree-sitter/index.js:786:35)
    at Tree.get (/app/node_modules/tree-sitter/index.js:28:14)
    at AstChunker.buildAstSlices (/app/src/core/engine/retrieval/chunker/service.ts:210:20)
    at async AstChunker.chunk (/app/src/core/engine/retrieval/chunker/service.ts:299:23)
```
This error prevents the AST-based chunking from successfully generating AST slices for files. It appears to occur inside `buildAstSlices` at `tree.rootNode` when unmarshaling from tree-sitter.

## Severity
- [x] Crash / data loss
- [ ] Silent wrong behavior

## Reproduction Rate
- [x] Always

---

## 2024-05-24 - [UX] Phase 7: Unhandled Internal Errors on Validation with Adversarial Inputs
## Environment
- OS: Ubuntu Linux (AMD64)
- Node: Node.js 22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.4
- AI Client: MCP StdIO client test script
- ripgrep available: yes

## Steps to Reproduce
1. Start the MCP server using `node bin/synapse.cjs start`
2. Connect to the MCP server.
3. Call `synapse_search` with an adversarial input string representing a SQL injection payload:
   `arguments: { query: "' OR 1=1; DROP TABLE memories;--" }`

## Expected Behavior
The server should safely sanitize all inputs and gracefully reject any that violate strict type requirements. It should ideally return a formatted business error instead of raw MCP error messages or input validation exceptions unless strict `zod` validation is expected to handle it.

## Actual Behavior
The MCP tool `synapse_search` fails during the SDK validation layer, indicating good defense against input corruption, but it surfaces complex internal error messages back to the user/client rather than handled logical errors:
```json
{"result":{"content":[{"type":"text","text":"MCP error -32602: Input validation error: Invalid arguments for tool synapse_search...
```
While data integrity is preserved (no crash or real SQL injection occurs), the lack of clear validation rejection messages or the inability to handle edge inputs more natively might cause the AI client to loop or confuse the user.

## Severity
- [x] Poor error message

## Reproduction Rate
- [x] Always

---

## 2024-05-24 - [UPDATE] Beta 2026.5.5-beta.0 Regression Check
The three bugs documented above (Missing Tools, AST Crash, UX Validation) were re-tested against the latest beta version (`2026.5.5-beta.0`).
- **Result:** All three bugs are still present in `2026.5.5-beta.0`. The `synapse_memory_manage` tool is still missing, `tree-sitter` still crashes during indexing, and validation still throws raw MCP error exceptions.
