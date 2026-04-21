# Configuration

<div className="docPanel docPanel--compact">
  <p>
    Setup writes a config file for roots and indexing, plus a ready-to-paste MCP client block. As of
    <strong>0.1.0</strong>, setup also auto-detects and installs skills for 13 AI clients
    (Claude, Cursor, Windsurf, Copilot, Gemini, Kiro, Codex, Cline, Continue, OpenCode, and more).
    Run <code>synapse mcp config</code> to generate client-specific config blocks.
  </p>
</div>

## Files written by setup

<div className="docGrid docGrid--2">
  <div className="docPanel">
    <h3>`~/.synapse/config/synapse.config.json`</h3>
    <p>Stores configured roots, indexing preferences, and memory settings such as consent and memory DB path.</p>
  </div>
  <div className="docPanel">
    <h3>`~/.synapse/config/mcp.synapse.json`</h3>
    <p>Contains the generated `mcpServers.synapse` block for your MCP client configuration.</p>
  </div>
  <div className="docPanel">
    <h3>`~/.synapse/data/*`</h3>
    <p>Holds the SQLite index, JSON fallback index, and local memory database.</p>
  </div>
</div>

## Config priority

1. `PROJECT_ROOTS`
2. `SYNAPSE_CONFIG`
3. current working directory fallback

## Most common changes

Most teams only adjust these values:

- `PROJECT_ROOTS`: set one or more explicit root paths.
- `SYNAPSE_INDEX_BACKEND`: keep `sqlite-vec` on Node 22+, otherwise use `json`.
- `SYNAPSE_SQLITE_VEC_EXTENSION`: normally auto-written by setup for `sqlite-vec`; only override this if you are debugging a custom vec0 path.
- `SYNAPSE_MEMORY_ENABLED`: set `true` only when you explicitly want local memory features.

## Practical guidance

- Use `PROJECT_ROOTS` when you want a temporary override in CI or a one-off shell session.
- Use `SYNAPSE_CONFIG` when you need to point the server at a non-default config file.
- Keep `SYNAPSE_INDEX_BACKEND` aligned with the Node runtime available to your MCP client.
- If you use `sqlite-vec`, rerun setup instead of hand-editing vec0 paths unless you have a custom native build.
- Leave memory backend on `auto` unless you are debugging backend selection.

## Key environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `SYNAPSE_INDEX_BACKEND` | `sqlite-vec` | index backend |
| `SYNAPSE_DB_PATH` | `~/.synapse/data/synapse.db` | SQLite DB path |
| `SYNAPSE_INDEX_PATH` | `~/.synapse/data/synapse.index.json` | JSON index path |
| `SYNAPSE_SQLITE_VEC_EXTENSION` | setup-managed | vec0 shared library path for sqlite-vec native acceleration |
| `SYNAPSE_VECTOR_CHUNK_LINES` | `60` | chunk size |
| `SYNAPSE_VECTOR_CHUNK_OVERLAP` | `15` | chunk overlap |
| `SYNAPSE_VECTOR_MAX_TERMS` | `80` | max terms per chunk |
| `SYNAPSE_VECTOR_MAX_FILES` | `20000` | max files per index run |
| `SYNAPSE_MEMORY_ENABLED` | `false` | enable local memory subsystem |
| `SYNAPSE_MEMORY_BACKEND` | `auto` | memory backend selection |
| `SYNAPSE_MEMORY_DB_PATH` | `~/.synapse/data/synapse.memory.db` | SQLite memory DB path |
| `SYNAPSE_MEMORY_AUTO_CAPTURE` | `false` | background memory capture behavior |
| `SYNAPSE_MEMORY_CONSENT_DONE` | `false` | whether setup already collected memory consent |
| `SYNAPSE_UPDATE_PACKAGE` | `synapse` | package checked for updates |
| `SYNAPSE_UPDATE_CHECK_INTERVAL_MINUTES` | `120` | update check cache interval |
| `SYNAPSE_UPDATE_FAILURE_BACKOFF_MINUTES` | `15` | retry backoff after failures |

## Config schema notes

- Setup now writes config schema `version: 3`.
- Existing configs and the older flat `.synapse` layout are auto-migrated on startup, with timestamped backups stored under `~/.synapse/backups/`.
- Memory remains disabled unless the user opted in during setup or explicitly enables it via environment variables.

## Release validation

For release verification, prefer the installed-runtime harness over ad hoc manual checks:

```bash
node scripts/release/release-test-installed-runtime.mjs --version-label 0.1.0
```

This validates the installed binary and writes both markdown and JSON reports under `reports/`.
