# 0.0.4-beta.9 Install

<div className="docPanel docPanel--compact">
  <p>
    Beta.9 keeps the direct top-level <code>synapse</code> install flow while fixing bundled
    skill version reporting and hardening package metadata for published installs.
  </p>
</div>

```bash
npm install -g synapse@0.0.4-beta.9
synapse install skills
synapse setup
synapse doctor
synapse upgrade
```

## Beta-specific notes

- `synapse install skills` is the preferred bundled-skill sync command for this version line.
- `synapse-install-skill` remains available as a legacy alias.
- bundled skill version reporting now uses the package version as the source of truth.
- installs may still show one upstream ONNX-runtime deprecation warning, but Synapse behavior is unchanged.

Need another version line? Use [/docs/releases/version-selection](/docs/releases/version-selection).
