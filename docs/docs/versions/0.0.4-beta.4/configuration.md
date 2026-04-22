# 0.0.4-beta.4 Configuration

<div className="docPanel docPanel--compact">
  <p>
    This beta keeps the stable root/index configuration model and adds memory-focused settings used
    by setup and runtime status workflows.
  </p>
</div>

## Core config model

- `PROJECT_ROOTS` -> highest priority runtime root override
- `SYNAPSE_CONFIG` -> explicit config file path
- working directory fallback -> used only when neither override is set

## Beta-relevant environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `SYNAPSE_MEMORY_ENABLED` | `false` | enable memory subsystem |
| `SYNAPSE_MEMORY_BACKEND` | `auto` | backend selection |
| `SYNAPSE_MEMORY_DB_PATH` | `~/.synapse/data/synapse.memory.db` | memory database path |
| `SYNAPSE_MEMORY_AUTO_CAPTURE` | `false` | auto-capture event behavior |
| `SYNAPSE_MEMORY_CONSENT_DONE` | `false` | setup consent marker |
| `SYNAPSE_UPDATE_PACKAGE` | `synapse` | package checked for updates |
| `SYNAPSE_UPDATE_CHECK_INTERVAL_MINUTES` | `120` | update status cache interval |
| `SYNAPSE_UPDATE_FAILURE_BACKOFF_MINUTES` | `15` | retry interval after check failure |

All stable indexing and retrieval settings from `0.0.3` still apply.

