# 0.0.4-beta.6 Configuration

<div className="docPanel docPanel--compact">
  <p>
    Beta.6 keeps the same configuration model as beta.5 while improving runtime diagnostics,
    installed-runtime validation, and current-versus-archived release guidance.
  </p>
</div>

## Core config model

- `PROJECT_ROOTS` -> highest priority runtime root override
- `SYNAPSE_CONFIG` -> explicit config file path
- working directory fallback -> used only when neither override is set

## Beta.6 configuration notes

| Setting | Expected beta.6 behavior |
| --- | --- |
| MCP startup command | prefer `synapse-mcp` directly when installed globally |
| Startup timeout | keep `startup_timeout_sec` at `30` or higher |
| Index backend | `sqlite-vec` preferred, JSON fallback still supported |
| Memory database | `~/.synapse/data/synapse.memory.db` when memory is enabled |
| Setup output | generated MCP config lives under `~/.synapse/config/` |
| Runtime diagnostics | richer `synapse_server_status` and `synapse_health` output |

## Important environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `SYNAPSE_CONFIG` | `~/.synapse/config/synapse.config.json` | explicit config file path |
| `SYNAPSE_INDEX_BACKEND` | `sqlite-vec` | requested retrieval backend |
| `SYNAPSE_DB_PATH` | `~/.synapse/data/synapse.db` | retrieval database path |
| `SYNAPSE_INDEX_PATH` | `~/.synapse/data/synapse.index.json` | JSON index path |
| `SYNAPSE_MEMORY_ENABLED` | `false` | enable memory subsystem |
| `SYNAPSE_MEMORY_BACKEND` | `auto` | memory backend selection |
| `SYNAPSE_MEMORY_DB_PATH` | `~/.synapse/data/synapse.memory.db` | memory database path |

All core retrieval settings from the stable and surrounding beta lines still apply.
