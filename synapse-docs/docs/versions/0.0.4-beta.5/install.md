# 0.0.4-beta.5 Install

<div className="docPanel docPanel--compact">
  <p>
    Beta.5 established the recommended top-level <code>synapse</code> flow for install, setup,
    doctor, and upgrade tasks.
  </p>
</div>

```bash
npm install -g synapse-mcp@0.0.4-beta.5
synapse-mcp-install-skill
synapse setup
synapse doctor
synapse upgrade
```

## Beta-specific notes

- `synapse setup` is the preferred configuration path on this version.
- `synapse doctor --verbose` is the recommended follow-up when validating cache and runtime state.
- direct `synapse-mcp` binary startup is preferred for MCP clients; `npx` is only fallback behavior.
- upgrade guidance in this release centers on `synapse upgrade`, not the removed `synapse update` alias.

Need another version line? Use [/docs/releases/version-selection](/docs/releases/version-selection).
