# main Configuration

<div className="docPanel docPanel--compact">
  <p>
    `main` keeps the stable configuration model and adds update-specific environment variables for
    version checks and retry behavior.
  </p>
</div>

`main` keeps the `0.1.0` configuration surface and adds update-specific environment variables.

| Variable | Default | Description |
| --- | --- | --- |
| `SYNAPSE_UPDATE_PACKAGE` | `synapse-mcp` | package used for update checks |
| `SYNAPSE_UPDATE_CHECK_INTERVAL_MINUTES` | `120` | cached update interval |
| `SYNAPSE_UPDATE_FAILURE_BACKOFF_MINUTES` | `15` | retry interval after failures |

All indexing and root settings from `0.1.0` still apply.
