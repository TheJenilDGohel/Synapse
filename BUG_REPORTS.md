# Synapse Beta Breakage Report

## Environment (Baseline for all issues)
- **OS**: Linux (6.8.0 x86_64 Ubuntu)
- **Node**: v22.22.1
- **npm**: 11.11.0
- **synapse-cortex version**: 2026.5.5-beta.0
- **AI Client**: Custom MCP Stdio Script (simulating Claude Desktop / Cursor)
- **ripgrep available**: Yes (tested with and without)

---

## 🐛 [BUG] Phase 1: `synapse doctor` crashes hard when ripgrep is uninstalled and sqlite backend fails

### Steps to Reproduce
1. Uninstall `ripgrep` (`sudo apt-get remove ripgrep`)
2. Run `synapse doctor`

### Expected Behavior
Doctor should gracefully flag `ripgrep` as missing (or warn about Lite Mode) without crashing the entire CLI.

### Actual Behavior
The CLI crashes entirely with an internal node module error:
```
[synapse-cli] fatal: No such built-in module: node:sqlite
```

### Severity
- [x] Crash / data loss
- [ ] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always
- [ ] Sometimes (~X% of runs)
- [ ] Once, couldn't reproduce

---

## 🐛 [BUG] Phase 4: `synapse_kg_query` traverse throws unhandled exception on missing startEntityId instead of validation error

### Steps to Reproduce
1. Connect via MCP stdio.
2. Call `synapse_kg_query` with action `traverse`, but provide the `entity_id` instead of `startEntityId` (or omit it entirely).

### Expected Behavior
MCP standard -32602 input validation error explicitly rejecting the payload before execution.

### Actual Behavior
Throws an internal exception string directly to the client:
```json
{"content":[{"type":"text","text":"startEntityId is required"}],"isError":true}
```

### Severity
- [ ] Crash / data loss
- [x] Silent wrong behavior
- [x] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always
- [ ] Sometimes (~X% of runs)
- [ ] Once, couldn't reproduce

---

## 🐛 [BUG] Phase 4: Dangling references during `delete_entity` causes internal boolean validation error

### Steps to Reproduce
1. Create nodes and a triple (e.g. Service Foo uses Service Bar).
2. Call `synapse_kg_manage` action `delete_entity` with the explicit `entity_id` of Service Foo.

### Expected Behavior
Entity deletes successfully, cleaning up dangling references, returning a success payload.

### Actual Behavior
Throws an MCP output validation error because it returns a boolean instead of the expected number:
```
MCP error -32602: Output validation error: Invalid structured content for tool synapse_kg_manage: Invalid input: expected number, received boolean at data.deleted
```

### Severity
- [ ] Crash / data loss
- [x] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always
- [ ] Sometimes (~X% of runs)
- [ ] Once, couldn't reproduce

---

## 🐛 [CRASH] Phase 5: Code Search completely broken with `vec_chunks` table error and `tree-sitter` undefined property

### Steps to Reproduce
1. Have a valid project directory (e.g. `/tmp/synapse-test`).
2. Start server and call `synapse_search` with action `hybrid`.

### Expected Behavior
Should search code and return semantic/lexical matches.

### Actual Behavior
The tool always errors out with:
```json
{"content":[{"type":"text","text":"table vec_chunks has no column named rowid"}],"isError":true}
```
Followed by a massive background crash loop in the server log:
```
buildAstSlices error: TypeError: Cannot read properties of undefined (reading '166')
    at unmarshalNode (.../node_modules/tree-sitter/index.js:799:35)
    at Tree.get (.../node_modules/tree-sitter/index.js:28:14)
```

### Severity
- [x] Crash / data loss
- [ ] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always
- [ ] Sometimes (~X% of runs)
- [ ] Once, couldn't reproduce

---

## 🐛 [CRASH] Phase 7: Adversarial inputs (Unicode, SQLi, Control chars) cause unhandled `storeEntry` undefined errors

### Steps to Reproduce
1. Send adversarial strings via `synapse_memory_manage` action `store`.
2. Examples:
   - Unicode bomb: `"🧠💣👾 ñ 한국어 العربية"`
   - SQL injection: `"' OR 1=1; DROP TABLE memories;--"`
   - Path traversal: `"../../etc/passwd"`
   - Control chars: `"\x00\x01\x1b[31m"`

### Expected Behavior
It should store the string literally or fail gracefully with a validation error.

### Actual Behavior
Fails with a severe internal exception:
```
Cannot read properties of undefined (reading 'storeEntry')
```
This implies the database layer crashed silently or disconnected upon receiving the payload.

### Severity
- [x] Crash / data loss
- [ ] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

### Reproduction Rate
- [x] Always
- [ ] Sometimes (~X% of runs)
- [ ] Once, couldn't reproduce

---

## 📊 Performance Baseline Notes (Phase 8)
* `synapse start` cold boot: ~2000ms (Target: < 3s) -> **PASS**
* Store memory: ~8ms (Target: < 500ms) -> **PASS**
* Recall memory: ~3ms (Target: < 300ms) -> **PASS**
* Code Search: N/A (Failed entirely due to crashes)
* Knowledge Graph Query: < 100ms (Target: < 500ms) -> **PASS**