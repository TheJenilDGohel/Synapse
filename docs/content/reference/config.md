---
title: Configuration Reference
description: Detailed guide to Loci environment variables and configuration files.
---

# Configuration Reference

Loci can be configured via environment variables or a JSON configuration file. By default, it looks for a config file at `~/.loci/config/loci.config.json`.

## Environment Variables

Use these variables to override default behavior, especially when running in containerized environments or CI/CD.

| Variable | Description | Default |
|:---|:---|:---|
| `LOCI_HOME` | Root directory for all Loci data (logs, database, cache). | `~/.loci` |
| `LOCI_CONFIG` | Absolute path to a custom `loci.config.json`. | `$LOCI_HOME/config/...` |
| `LOCI_MEMORY_ENABLED` | Enable or disable the persistent memory pillar. | `true` |
| `LOCI_DB_PATH` | Path to the main SQLite database. | `$LOCI_HOME/storage/loci.db` |
| `PROJECT_ROOTS` | Semicolon-separated list of roots to index. Format: `label=path;path2`. | Current Directory |
| `LOCI_EMBED_CACHE_DIR`| Directory where local embedding models are stored. | `$LOCI_HOME/cache` |
| `LOCI_RERANKER_CACHE_DIR`| Directory where reranker models are stored. | `$LOCI_HOME/cache` |
| `LOCI_INDEX_BACKEND` | The storage backend for the code index: `sqlite-vec` or `json`.| `sqlite-vec` |
| `DISABLE_CONSOLE_OUTPUT`| Suppress all non-essential console logging. | `false` |
| `MCP_MODE` | Communication mode: `stdio` (default) or `sse`. | `stdio` |

## Configuration File Schema

The `loci.config.json` file allows for fine-grained control over indexing and memory behavior.

```json
{
  "roots": [
    { "label": "MyProject", "path": "/Users/name/dev/project" }
  ],
  "index": {
    "backend": "sqlite-vec",
    "chunkLines": 60,
    "chunkOverlap": 15,
    "maxIndexedFiles": 20000,
    "embeddingModel": "sentence-transformers/all-MiniLM-L6-v2",
    "rerankerModel": "cross-encoder/ms-marco-MiniLM-L-6-v2"
  },
  "memory": {
    "enabled": true,
    "autoCapture": true,
    "dbPath": "/path/to/memory.db"
  }
}
```

### Index Settings
- **`chunkLines`**: Maximum number of lines in a single code chunk. High values provide more context but consume more tokens.
- **`chunkOverlap`**: Number of overlapping lines between chunks to ensure semantic continuity.
- **`maxIndexedFiles`**: Safety limit for the number of files Loci will index in a single root.

### Memory Settings
- **`autoCapture`**: When enabled, Loci will automatically log significant events (like tool usage) to the background event log.
- **`enabled`**: Master switch for the persistent memory system.

## Performance Tuning

For very large codebases, you may want to increase the indexing limits:

```bash
export LOCI_VECTOR_MAX_FILES=50000
export LOCI_RG_TIMEOUT_MS=30000
```

---

**Next:** View the full **[Tools Reference](tools)**.
