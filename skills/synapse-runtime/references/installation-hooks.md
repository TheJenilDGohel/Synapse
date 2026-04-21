# Installation Hooks

Synapse uses a multi-tier hook system to ensure skills are always up to date.

## Hook Tiers
1. **Pre-install**: Verifies Node.js version and environment variables.
2. **Post-install (npm)**: Runs the skill installer to sync instructions to common agent directories (`~/.cursor`, `~/.claude`, etc.).
3. **Runtime Heartbeat**: The MCP server periodically checks if the skill version in the agent directory matches the installed package.

## Auto-Update Behavior
When `synapse` is updated via npm, the post-install hook triggers `install-synapse-skill.mjs` automatically unless `SYNAPSE_SKIP_SKILL_INSTALL` is set.
