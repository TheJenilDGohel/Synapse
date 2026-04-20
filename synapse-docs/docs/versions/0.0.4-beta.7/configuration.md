# 0.0.4-beta.7 Configuration

<div className="docPanel docPanel--compact">
  <p>
    Beta.7 keeps the same configuration model as beta.6 while moving the local model runtime to
    Hugging Face and strengthening sqlite-vec startup behavior for global installs.
  </p>
</div>

## Core config model

- `PROJECT_ROOTS` -> highest priority runtime root override
- `SYNAPSE_CONFIG` -> explicit config file path
- working directory fallback -> used only when neither override is set

## Beta.7 configuration notes

| Setting | Expected beta.7 behavior |
| --- | --- |
| MCP startup command | prefer `synapse-mcp` directly when installed globally |
| Startup timeout | keep `startup_timeout_sec` at `30` or higher |
| Index backend | `sqlite-vec` preferred, JSON fallback still supported |
| sqlite extension | auto-detected when possible, explicit path override supported |
| Embedding runtime | Hugging Face provider/model is the intended runtime path |
| Memory database | `~/.synapse/data/synapse.memory.db` when memory is enabled |

## Important environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `SYNAPSE_CONFIG` | `~/.synapse/config/synapse.config.json` | explicit config file path |
| `SYNAPSE_INDEX_BACKEND` | `sqlite-vec` | requested retrieval backend |
| `SYNAPSE_DB_PATH` | `~/.synapse/data/synapse.db` | retrieval database path |
| `SYNAPSE_INDEX_PATH` | `~/.synapse/data/synapse.index.json` | JSON index path |
| `SYNAPSE_SQLITE_VEC_EXTENSION` | auto-detected | explicit sqlite-vec native extension path |
| `SYNAPSE_MEMORY_ENABLED` | `false` | enable memory subsystem |
| `SYNAPSE_MEMORY_BACKEND` | `auto` | memory backend selection |
| `SYNAPSE_MEMORY_DB_PATH` | `~/.synapse/data/synapse.memory.db` | memory database path |

All core retrieval settings from surrounding beta lines still apply.
