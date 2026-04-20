# 0.0.3 Install

<div className="docPanel docPanel--compact">
  <p>
    This archived install page mirrors the current stable package behavior. Use it when you need
    installation instructions frozen to the `0.0.3` release contract.
  </p>
</div>

## Requirements

- Node.js `>=18`
- `ripgrep` recommended for fastest lexical search

Install ripgrep:

| Platform | Command |
| --- | --- |
| Ubuntu/Debian | `sudo apt-get install ripgrep` |
| macOS | `brew install ripgrep` |
| Windows | `winget install BurntSushi.ripgrep.MSVC` |

## Global install

```bash
npm install -g synapse-mcp@0.0.3
synapse-mcp-install-skill
synapse-mcp-setup
synapse-mcp-doctor
```

## npx fallback

```bash
npx -y synapse-mcp-setup
npx -y synapse-mcp-doctor
```

## MCP client config

`0.0.3` expects a config block like:

```json
{
  "mcpServers": {
    "synapse": {
      "command": "npx",
      "args": ["-y", "synapse-mcp"],
      "startup_timeout_sec": 30,
      "env": {
        "MCP_MODE": "stdio",
        "SYNAPSE_CONFIG": "~/.synapse/synapse.config.json",
        "SYNAPSE_INDEX_BACKEND": "sqlite-vec",
        "SYNAPSE_DB_PATH": "~/.synapse/synapse.db",
        "SYNAPSE_INDEX_PATH": "~/.synapse/synapse.index.json"
      }
    }
  }
}
```

## Notes

- global install is the preferred path in `0.0.3`
- setup writes both `synapse.config.json` and `mcp.synapse.json`
- Windows users should use the generated `npx.cmd` command from setup output
- use [/docs/releases/version-selection](/docs/releases/version-selection) to choose another version line
