# 0.0.4-beta.6 Install

<div className="docPanel docPanel--compact">
  <p>
    Beta.6 keeps the direct top-level <code>synapse</code> install flow and adds stronger runtime
    diagnostics plus installed-runtime verification guidance.
  </p>
</div>

```bash
npm install -g synapse@0.0.4-beta.6
synapse-install-skill
synapse setup
synapse doctor
synapse upgrade
```

## Beta-specific notes

- `synapse setup` and `synapse doctor` remain the preferred bootstrap path.
- direct `synapse` binary startup is preferred for MCP clients; `npx` is only fallback behavior.
- release guidance in this version emphasizes installed-runtime validation and clearer runtime status output.
- cache diagnostics and retrieval miss guidance are improved relative to beta.5, but the underlying install flow is unchanged.

Need another version line? Use [/docs/releases/version-selection](/docs/releases/version-selection).
