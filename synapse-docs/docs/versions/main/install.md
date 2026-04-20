# main Install

<div className="docPanel docPanel--compact">
  <p>
    The installation flow stays aligned with `0.1.0`, but operational guidance on `main` assumes the
    newer update-aware tooling and the non-fatal ripgrep fallback behavior.
  </p>
</div>

The install flow is the same as `0.1.0`:

```bash
npm install -g synapse-mcp
synapse install skills
synapse setup
synapse doctor
```

## Main-specific operational note

Agents can check for newer versions and request approval to self-update once these main-branch changes are released.

## Practical difference from 0.1.0

- setup flow is the same
- runtime guidance expects `synapse_update_status` to be called regularly
- missing `rg` is handled as a startup warning with TypeScript fallback rather than a fatal hard stop
