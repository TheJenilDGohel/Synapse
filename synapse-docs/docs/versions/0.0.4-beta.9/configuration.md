# 0.0.4-beta.9 Configuration

<div className="docPanel docPanel--compact">
  <p>
    Beta.9 keeps the beta.8 runtime/configuration baseline while tightening packaged-skill version
    alignment and install/reporting behavior.
  </p>
</div>

## Core config model

- `PROJECT_ROOTS` -> highest priority runtime root override
- `SYNAPSE_CONFIG` -> explicit config file path
- working directory fallback -> used only when neither override is set

## Beta.9 configuration notes

| Setting | Expected beta.9 behavior |
| --- | --- |
| MCP startup command | prefer `synapse` directly when installed globally |
| Startup timeout | keep `startup_timeout_sec` at `30` or higher |
| Index backend | `sqlite-vec` preferred, JSON fallback still supported |
| sqlite extension | auto-detected when possible, explicit path override supported |
| Embedding runtime | Hugging Face provider/model is the intended runtime path |
| Skill sync command | prefer `synapse install skills`, legacy alias still supported |
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
