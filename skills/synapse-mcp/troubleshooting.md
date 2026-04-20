# Troubleshooting

## Doctor fails with MCP SDK import error

Symptom: `sdk_import` check fails (`ERR_MODULE_NOT_FOUND`).

Fix:
```bash
npm install
synapse-mcp-doctor
```

## ripgrep missing

Ripgrep is optional. If `rg` is not found, the server still starts and search tools fall back to a JS filesystem walker.

To get full performance:
- macOS: `brew install ripgrep`
- Linux: `sudo apt-get install ripgrep`
- Windows: `winget install BurntSushi.ripgrep.MSVC`

## File exceeds size cap in `read_file`

Synapse caps reads at 800 lines per window. Narrow your `start_line` / `end_line` range.

## MCP startup timeout

If the client times out, set:

```toml
[mcp_servers.synapse]
startup_timeout_sec = 30
```

## Semantic search returns no results

Check:
- `synapse_index_status`
- `synapse_embed_status`

Interpretation:
- `enabled=true` but `available=false` means the embedding model is configured but has not loaded successfully in the current runtime.
- If `search_hybrid` returns `reranker.applied=false`, inspect the reranker/model path instead of assuming semantic ranking is active.

Then rebuild with:

```bash
synapse_index_project
```

## glob `*.ts` returns no results from subdirectories

Use `**/*.ts` instead of `*.ts`.

## sqlite-vec unavailable

Synapse auto-falls back to JSON backend. Confirm via:
- `synapse_server_status`
- `synapse_index_status`

## Memory disabled or unavailable

Check:
- `synapse_memory_status`

Common causes:
- user did not opt in during setup
- memory backend unavailable on the current runtime

## Duplicate-looking tools in MCP clients

Stable releases expose canonical `synapse_*` tools only.
