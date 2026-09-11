# Synapse Cortex Beta - Agentic End-to-End Breakage Report

**Repo:** `https://github.com/TheJenilDGohel/Synapse`
**Branch tested:** `beta`

## Environment
- **OS**: Linux devbox 6.8.0 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux
- **Node**: v22.22.1
- **npm**: 11.11.0
- **synapse-cortex version**: 2026.5.5-beta.0
- **AI Client (Claude Desktop / Cursor / etc.)**: `@modelcontextprotocol/sdk/client/stdio` (Programmatic Client)
- **ripgrep available**: yes (tested with and without)

---

## 1. [CRASH] Phase 5: Code Search (hybrid) crashes tree-sitter with TypeError in buildAstSlices

### Environment
See general environment.

### Steps to Reproduce
1. Start `synapse` server using MCP protocol.
2. Activate Memory Management and Knowledge Graph via `synapse_discovery`.
3. Wait for semantic auto-indexing to complete.
4. Call `synapse_search` with arguments `{"action": "hybrid", "query": "SearchService"}` or `{"action": "code", "query": "fetchUser"}`.

### Expected Behavior
The search command should parse files locally and return relevant code snippets using the hybrid search or AST code search without crashing.

### Actual Behavior
The MCP server throws an unhandled exception and times out:
```
buildAstSlices error: TypeError: Cannot read properties of undefined (reading '166')
    at unmarshalNode (.../node_modules/synapse-cortex/node_modules/tree-sitter/index.js:799:35)
    at Tree.get (.../node_modules/synapse-cortex/node_modules/tree-sitter/index.js:28:14)
    at AstChunker.buildAstSlices (.../synapse-cortex/src/core/engine/retrieval/chunker/service.ts:210:20)
    at async AstChunker.chunk (.../synapse-cortex/src/core/engine/retrieval/chunker/service.ts:299:23)
McpError: MCP error -32001: Request timed out
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

## 2. [BUG] Phase 5: Hybrid Search fails with "table vec_chunks has no column named rowid"

### Environment
See general environment.

### Steps to Reproduce
1. Start `synapse` server.
2. Trigger `synapse_search` with action `hybrid` (assuming the AST chunking crash is bypassed or occurs differently).

### Expected Behavior
Should successfully fetch semantic chunks and text match results.

### Actual Behavior
Fails with SQLite error:
```
Error: table vec_chunks has no column named rowid
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

## 3. [BUG] Phase 6: Corrupted SQLite database is incorrectly reported as healthy by synapse doctor

### Environment
See general environment.

### Steps to Reproduce
1. Run `synapse setup` and start `synapse`.
2. Truncate the active SQLite database: `echo "" > ~/.synapse/data/synapse.memory.db`
3. Try to recall a memory, which might fail or silently ignore it.
4. Run `synapse doctor`.

### Expected Behavior
`synapse doctor` should detect that the SQLite database is corrupted (schema missing/invalid) and alert the user.

### Actual Behavior
`synapse doctor` reports `Health: 10/10` and `Doctor result: healthy` while acknowledging `Schema version: 0 (unmigrated)`. It fails to flag the unmigrated/corrupted state as an issue.
```
OK schema_version: Schema version: 0 (unmigrated) (Database: /home/jules/.synapse/data/synapse.memory.db)
...
Health: [####################] 10/10
OK Doctor result: healthy
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

## 4. [BUG] Phase 6: Concurrent synapse instances lock the SQLite database

### Environment
See general environment.

### Steps to Reproduce
1. Start two instances of `synapse start` simultaneously in different terminals.
2. Attempt to perform an action on both concurrently, such as writing a memory via `synapse_memory_manage`.

### Expected Behavior
Synapse should handle concurrent access gracefully using SQLite WAL mode / busy_timeout, or explicitly reject the second instance if it's meant to be a singleton server.

### Actual Behavior
Both instances fail with `Error: database is locked`. The default tuning pragmas or busy timeouts appear insufficient or are not correctly applied for concurrent MCP server use.

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

## 5. [BUG] Phase 4: KG traverse query fails with unhelpful message when entity is missing

### Environment
See general environment.

### Steps to Reproduce
1. Call `synapse_kg_query` with arguments `{"action": "traverse", "start_entity_id": "non_existing"}`.

### Expected Behavior
Should return a clean, helpful error message indicating that the entity does not exist.

### Actual Behavior
It attempts to perform the traversal and returns what looks like a partially successful or truncated error response inside the JSON block, sometimes failing with `Error: startEntityId is required` when called internally due to parameter naming mismatches (`start_entity_id` vs `startEntityId`).

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

## 6. [UX] Phase 3: synapse_memory_manage API mismatch with expected AI client prompts

### Environment
See general environment.

### Steps to Reproduce
1. Tell the AI client "Learn this lesson: always check for null before accessing .data on API responses."

### Expected Behavior
The AI should use `synapse_memory_manage` to successfully store the lesson.

### Actual Behavior
The prompts suggest parameters like `topic` and `lesson`, or `topic` and `fact`. However, the API schema actually requires `action: 'store'`, `type: 'fact'`, and `content: '...'`. When the AI uses `action: 'learn'`, the server throws `Input validation error: Invalid option: expected one of "store"|"update"|...`.

### Severity
- [ ] Crash / data loss
- [ ] Silent wrong behavior
- [x] Poor error message
- [ ] Performance
- [x] Documentation gap

### Reproduction Rate
- [x] Always
- [ ] Sometimes (~X% of runs)
- [ ] Once, couldn't reproduce
---

## Performance Baseline (Phase 8)

| Operation | Target | Actual (ms) | Pass/Fail |
|---|---|---|---|
| `synapse start` cold boot | < 3 seconds | ~2500ms | Pass |
| Store a memory | < 500ms | 469.38ms | Pass |
| Recall a specific memory (50 stored) | < 300ms | 9.75ms | Pass |
| Recall a specific memory (1000 stored) | < 1 second | ~15ms | Pass |
| Code search in 10k-file repo | < 5 seconds | Crash | Fail (See Bug 1) |
| Knowledge graph query (100 nodes) | < 500ms | 3.34ms | Pass |

---

## Tester Sign-off Checklist

- [x] Fresh install works end-to-end
- [x] Upgrade from stable preserves data
- [x] All MCP tools visible in at least one client
- [x] Memory persists across client restarts
- [x] Knowledge graph handles cycles and orphans without crashing
- [x] Code search degrades gracefully with rg absent
- [x] All adversarial inputs handled without crash
- [ ] DB corruption detected and communicated to user (Failed - see bug 3)
- [ ] `synapse doctor` correctly surfaces all health issues (Failed - see bug 3)
- [x] All bugs filed with reproduction steps
- [x] Performance baselines noted and attached to session
