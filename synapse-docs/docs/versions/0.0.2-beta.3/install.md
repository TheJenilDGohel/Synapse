# 0.0.2-beta.3 Install

<div className="docPanel docPanel--compact">
  <p>
    This beta still reflects the transition from `npx`-heavy setup toward the clearer global install
    flow used in later stable docs.
  </p>
</div>

This beta still uses the same general setup flow:

```bash
npm install -g synapse@0.0.2-beta.3
synapse-install-skill
npx -y synapse-setup
npx -y synapse-doctor
```

Global install was becoming the clearer path, but `npx` remained common in docs and workflow examples.

## Important install behavior

- generated MCP client snippets include `startup_timeout_sec: 30`
- ripgrep is no longer required for startup
- if `sqlite-vec` is unavailable, runtime falls back to the JSON backend

## Quick client note

This version is where startup became much more forgiving in restricted environments.

Need another version line? Use [/docs/releases/version-selection](/docs/releases/version-selection).
