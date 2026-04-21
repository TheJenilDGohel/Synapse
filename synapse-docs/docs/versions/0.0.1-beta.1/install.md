# 0.0.1-beta.1 Install

<div className="docPanel docPanel--compact">
  <p>
    Installation in the first beta is notably rougher than later releases: `npx` is central,
    ripgrep is treated as required, and the global-install-first guidance is not yet established.
  </p>
</div>

## Setup flow

Install this exact archived version first:

```bash
npm install -g synapse@0.0.1-beta.1
```

Then run setup/doctor:

```bash
npx -y synapse-setup
npx -y synapse-doctor
```

## Behavior notes

- setup validates Node, npx, and ripgrep before writing config
- setup generates `npx.cmd` on Windows and `npx` on Linux/macOS
- setup asks users to choose the index backend
- global-install-first guidance had not stabilized yet in this version
- `synapse-install-skill` is not part of this version line
- use [/docs/releases/version-selection](/docs/releases/version-selection) to choose another version line
