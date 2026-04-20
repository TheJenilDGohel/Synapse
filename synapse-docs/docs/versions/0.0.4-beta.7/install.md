# 0.0.4-beta.7 Install

<div className="docPanel docPanel--compact">
  <p>
    Beta.7 keeps the direct top-level <code>synapse</code> install flow while switching the
    local model runtime to Hugging Face and tightening global install behavior.
  </p>
</div>

```bash
npm install -g synapse-mcp@0.0.4-beta.7
synapse-mcp-install-skill
synapse setup
synapse doctor
synapse upgrade
```

## Beta-specific notes

- `synapse setup` and `synapse doctor` remain the preferred bootstrap path.
- direct `synapse-mcp` binary startup is preferred for MCP clients; `npx` is only fallback behavior.
- the setup output in this version still documented `xenova`-style env values in some generated snippets, even though the shipped runtime had moved to Hugging Face.
- install noise was reduced significantly relative to beta.6, but one upstream ONNX warning could still appear.

Need another version line? Use [/docs/releases/version-selection](/docs/releases/version-selection).
