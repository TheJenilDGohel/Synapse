# 0.0.4-beta.8 Install

<div className="docPanel docPanel--compact">
  <p>
    Beta.8 keeps the direct top-level <code>synapse</code> install flow from beta.7 while
    focusing on startup regressions, status hardening, and safer installed-runtime validation.
  </p>
</div>

```bash
npm install -g synapse-mcp@0.0.4-beta.8
synapse-mcp-install-skill
synapse setup
synapse doctor
synapse upgrade
```

## Beta-specific notes

- `synapse setup` and `synapse doctor` remain the preferred bootstrap path.
- direct `synapse-mcp` binary startup is still preferred for MCP clients; `npx` remains fallback behavior.
- startup no longer blocks on the synchronous npm warm-check that caused early MCP delays in prior builds.
- sqlite-vec index status now degrades safely when the database is locked instead of hanging or crashing status calls.

Need another version line? Use [/docs/releases/version-selection](/docs/releases/version-selection).
