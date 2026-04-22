# 0.0.4-beta.4 Install

<div className="docPanel docPanel--compact">
  <p>
    Installation is the same base flow as stable, with beta docs emphasizing memory consent and
    version-aware skill sync behavior.
  </p>
</div>

```bash
npm install -g synapse@0.0.4-beta.4
synapse-install-skill
synapse-setup
synapse-doctor
```

## Beta-specific notes

- `synapse-setup` includes one-time memory consent prompts.
- Generated MCP snippets include memory env vars when enabled.
- `synapse-install-skill` skips reinstall when installed skill is already current.

Need another version line? Use [/docs/releases/version-selection](/docs/releases/version-selection).
