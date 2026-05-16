---
title: Advanced Configuration
description: Tuning Synapse for performance, custom models, and environment isolation.
---

# Advanced Configuration

Synapse is designed to be "zero-config" for most users, but power users can tune every aspect of the engine via environment variables or the `synapse.config.json` file.

## Configuration Methods

1.  **Environment Variables**: Highest priority. Best for ephemeral CI/CD settings.
2.  **`synapse.config.json`**: Located at `~/.synapse/config/synapse.config.json`. Best for persistent local machine settings.

---

## 1. Engine & Indexing

| Variable | Default | Description |
|:---|:---|:---|
| `SYNAPSE_INDEX_BACKEND` | `sqlite-vec` | The vector search backend. Use `json` for systems without native extension support. |
| `SYNAPSE_VECTOR_CHUNK_LINES` | `60` | Number of lines per code chunk. |
| `SYNAPSE_VECTOR_MAX_FILES` | `20000` | Maximum number of files to index per project. |
| `SYNAPSE_RG_TIMEOUT_MS` | `15000` | Timeout for Ripgrep text searches. |

### Tuning Chunks
If your codebase has very large files, consider increasing `SYNAPSE_VECTOR_CHUNK_LINES` to `100` to provide more context per semantic hit.

---

## 2. Models & Embeddings

Synapse uses HuggingFace-compatible models running locally via `@huggingface/transformers`.

| Variable | Default | Description |
|:---|:---|:---|
| `SYNAPSE_EMBED_MODEL` | `all-MiniLM-L6-v2` | The model used for generating code embeddings. |
| `SYNAPSE_RERANKER_MODEL` | `ms-marco-MiniLM-L-6-v2` | The model used for RRF cross-encoding. |
| `SYNAPSE_EMBED_CACHE_DIR` | `~/.synapse/cache` | Where model weights are stored. |

### Using a Custom Model
To use a different model, update your config:
```json
{
  "index": {
    "embeddingModel": "Xenova/all-distilroberta-v1",
    "embeddingDimensions": 768
  }
}
```
*Note: You must match the `embeddingDimensions` to the model's output.*

---

## 3. Memory & Knowledge Graph

| Variable | Default | Description |
|:---|:---|:---|
| `SYNAPSE_MEMORY_ENABLED` | `true` | Toggle the persistent memory system. |
| `SYNAPSE_MEMORY_AUTO_CAPTURE` | `true` | Automatically capture git commits and file edits as events. |
| `SYNAPSE_NER_ENABLED` | `false` | Enable local Named Entity Recognition for auto-triple generation. |

---

## 4. Multi-Root Workspaces

If you work in a monorepo or across multiple related repositories, you can define **Project Roots**:

```json
{
  "roots": [
    { "label": "frontend", "path": "~/dev/my-app/client" },
    { "label": "backend", "path": "~/dev/my-app/server" }
  ]
}
```

This allows the agent to use `list_roots` and `list_projects` to navigate between domains without re-initializing setup.

---

## 5. Security & Isolation

- **`DISABLE_CONSOLE_OUTPUT`**: Set to `true` to suppress all stdout/stderr, useful for embedded MCP environments.
- **`SYNAPSE_DB_PATH`**: Redirect the main SQLite database to a secure or encrypted volume.
