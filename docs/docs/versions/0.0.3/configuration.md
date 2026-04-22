# 0.0.3 Configuration

<div className="docPanel docPanel--compact">
  <p>
    `0.0.3` is the stable configuration baseline. Use these settings when you want behavior that
    matches the current published npm package rather than unreleased `main` changes.
  </p>
</div>

## Root resolution order

1. `PROJECT_ROOTS`
2. `SYNAPSE_CONFIG`
3. current working directory fallback

## Index settings

| Variable | Default | Description |
| --- | --- | --- |
| `SYNAPSE_INDEX_BACKEND` | `sqlite-vec` | backend selection |
| `SYNAPSE_DB_PATH` | `~/.synapse/synapse.db` | SQLite DB path |
| `SYNAPSE_INDEX_PATH` | `~/.synapse/synapse.index.json` | JSON index path |
| `SYNAPSE_SQLITE_VEC_EXTENSION` | - | custom extension path |
| `SYNAPSE_VECTOR_CHUNK_LINES` | `60` | chunk size |
| `SYNAPSE_VECTOR_CHUNK_OVERLAP` | `15` | chunk overlap |
| `SYNAPSE_VECTOR_MAX_TERMS` | `80` | max terms per chunk |
| `SYNAPSE_VECTOR_MAX_FILES` | `20000` | max files indexed |

## Runtime settings

| Variable | Default | Description |
| --- | --- | --- |
| `SYNAPSE_RG_TIMEOUT_MS` | `15000` | ripgrep timeout |
| `SYNAPSE_AUTO_PROJECT_SPLIT` | `true` | auto project split |
| `SYNAPSE_MAX_AUTO_PROJECTS` | `120` | max discovered projects |
| `SYNAPSE_FORCE_SPLIT_CHILDREN` | `false` | force child split when no markers |

## Release-specific notes

- `0.0.3` documents the stable release line only
- canonical tool names are the public contract in this version
- update-check environment variables belong to unreleased `main`, not this release page
