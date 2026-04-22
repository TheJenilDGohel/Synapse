# Installation

<div className="docPanel docPanel--compact">
  <p>
    The recommended path is a global install followed by setup and doctor. Synapse <strong>v0.3.0</strong>
    is a modernization release that introduces a premium CLI with an interactive TUI dashboard. 
    It features <strong>74 MCP tools</strong> across temporal knowledge graph, multi-hop traversal, 
    and agent-scoped memory tracks.
  </p>
</div>

## Requirements

- **Node.js >=18**: Required for core search and file tools.
- **Node.js >=22**: **Recommended.** Required for the local memory subsystem and TUI dashboard.
- **ripgrep (rg)**: Highly recommended for high-performance lexical search.

:::tip Memory Requirement
If you are using the memory subsystem, ensure you are on **Node 22.13.1** or higher to support the underlying SQLite-vec extensions.
:::

## Recommended Install

Choose your release track:

**Stable Track (v0.2.0):**
```bash
npm install -g synapse
```

**Beta Track (v0.3.0-beta.2 — Interactive CLI & TUI):**
```bash
npm install -g synapse@beta
```

## Quick Start Sequence

```bash
# 1. Install the package (Stable or Beta)
npm install -g synapse

# 2. Install bundled skills to your AI clients
synapse install skills

# 3. Generate configuration & Provision backends
synapse setup

# 4. Verify the environment & Diagnostics
synapse doctor

# 5. Launch the Dashboard (Beta only)
synapse dashboard
```

## Bundled Skill Targets

`synapse install skills` installs tool-specific skill packages from one canonical Synapse skill source.

It automatically detects and installs to:
- `~/.cursor/skills`
- `~/.codeium/windsurf/skills`
- `~/.gemini/antigravity/skills`
- `~/.cline/skills`
- `~/.continue/skills`
- `~/.agents/skills`

## MCP Client Config

After setup, copy the `mcpServers` block from `~/.synapse/config/mcp.synapse.json` into your client configuration.

```json
{
  "mcpServers": {
    "synapse": {
      "command": "synapse",
      "startup_timeout_sec": 30,
      "env": {
        "MCP_MODE": "stdio",
        "SYNAPSE_CONFIG": "~/.synapse/config/synapse.config.json",
        "SYNAPSE_INDEX_BACKEND": "sqlite-vec",
        "SYNAPSE_MEMORY_ENABLED": "true"
      }
    }
  }
}
```

## Enabling Semantic Search

Synapse uses `@huggingface/transformers` for local embedding generation (MiniLM-L6-v2). This is installed automatically during postinstall. If it wasn't installed, add it manually:

```bash
cd $(npm root -g)/synapse
npm install --no-save @huggingface/transformers
```

Run `synapse doctor` to verify embedding status.

## Installing from GitHub

:::caution Known npm Limitation
Direct `npm install -g git+https://...` may fail with `TAR_ENTRY_ERRORS`. This is a [known npm bug](https://github.com/npm/cli/issues/3910) where git dependencies auto-bundle `node_modules` into the tarball, causing extraction failures for packages with large native binaries (onnxruntime, sharp).
:::

**Recommended: clone, pack, then install**
```bash
git clone https://github.com/wmt-mobile/synapse.git
cd synapse
git checkout release/0.3.0  # or main for stable
npm pack
npm install -g ./synapse-*.tgz
```

**Alternative: install with --ignore-scripts, then rebuild**
```bash
npm install -g --ignore-scripts git+https://github.com/wmt-mobile/synapse.git#release/0.3.0
cd $(npm root -g)/synapse && npm install
```

After either method, enable semantic search:
```bash
cd $(npm root -g)/synapse && npm install --no-save @huggingface/transformers
```

## Troubleshooting

- **Startup Timeout**: Keep `startup_timeout_sec` at `30` or higher.
- **Diagnostics**: Run `synapse doctor --verbose` for a full health scan.
- **Model Warmup**: Setup downloads embedding models to `~/.synapse/cache`. Ensure this path is writable.
- **Beta Features**: If `synapse dashboard` is not found, ensure you installed `@beta`.

### Common Install Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `TAR_ENTRY_ERROR ENOENT` | npm git-dep auto-bundling bug | Use `npm pack` + `npm install -g ./file.tgz` |
| `spawn sh ENOENT` | Concurrent extraction race | Same as above |
| `tarball data (null) corrupted` | Stale npm cache | `npm cache clean --force` then retry |
| Semantic search disabled | `@huggingface/transformers` not installed | `cd $(npm root -g)/synapse && npm install --no-save @huggingface/transformers` |
| `synapse: command not found` | Global bin not in PATH | Check `npm root -g` is accessible |
| `tsx not found` | Incomplete install | `cd $(npm root -g)/synapse && npm install` |

---

> **Note on v0.3.0**: The modernization cycle focuses on premium developer experience. All tool names and API contracts from 0.1.0/0.2.0 are fully preserved.
