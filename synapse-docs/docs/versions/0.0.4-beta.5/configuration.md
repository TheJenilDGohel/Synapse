# 0.0.4-beta.5 Configuration

<div className="docPanel docPanel--compact">
  <p>
    Beta.5 uses the same root and indexing model as the surrounding release line, while shifting
    install guidance toward the generated Synapse config and direct-binary MCP startup.
  </p>
</div>

## Core config model

- `PROJECT_ROOTS` -> highest priority runtime root override
- `SYNAPSE_CONFIG` -> explicit config file path
- working directory fallback -> used only when neither override is set

## Beta.5 configuration notes

| Setting | Expected beta.5 behavior |
| --- | --- |
| MCP startup command | prefer `synapse-mcp` directly when installed globally |
| Startup timeout | keep `startup_timeout_sec` at `30` or higher |
| Index backend | `sqlite-vec` preferred, JSON fallback still supported |
| Memory database | `~/.synapse/data/synapse.memory.db` when memory is enabled |
| Setup output | generated MCP config lives under `~/.synapse/config/` |

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
