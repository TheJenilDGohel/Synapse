---
name: synapse:onboard
description: Run the guided first-run setup wizard that configures everything automatically
allowed-tools:
  - Bash
---

<objective>
Launch the guided onboarding wizard that auto-detects the environment, runs setup, installs skills to all detected AI clients, installs Claude Code hooks, and verifies everything works.
</objective>

<process>
1. Run `synapse onboard` via Bash tool.
2. The wizard handles everything automatically:
   - Detects Node.js version, ripgrep, and AI clients
   - Runs setup with smart defaults
   - Installs skills to detected AI clients
   - Installs Claude Code hooks for auto memory retrieval/capture
   - Runs doctor to verify
3. After completion, inform the user what was configured and suggest trying `/synapse:recall` or `/synapse:remember`.
</process>
