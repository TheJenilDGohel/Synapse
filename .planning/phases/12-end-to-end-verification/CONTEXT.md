# Phase 12: End-to-End Verification (Depth Test)

## Context
The "Transmission Layer" is code-complete. This phase validates the 5-minute onboarding promise and the AI-native optimization in a live environment. We will simulate a fresh install and execute the priority boost in the currrent repo.

## Scouting Findings
1. **Installer Pathing**: `scripts/install.ps1` targets `$HOME/synapse`. We need to verify that it correctly adds this to the PowerShell $PROFILE and that the global command is reachable.
2. **AI_AGENT Signal**: We need to verify that `process.env.AI_AGENT` is correctly propagated when running via `npx` or direct script execution.

## Decisions
- [ ] **Run Sandboxed Install**: Execute `powershell -ExecutionPolicy Bypass -File scripts/install.ps1` and verify global binary registration.
- [ ] **Run Silent Onboarding**: Run `AI_AGENT=true node bin/synapse.js onboard` and capture output to verify zero ANSI bloat.
- [ ] **Verify Neural Link**: Check `.clauderules` and `.cursorrules` in this directory after a "Boost" run.

## Success Criteria
- [ ] `synapse` command is available in a new shell session.
- [ ] `onboard` output is < 500 tokens when in Agent mode.
- [ ] `.cursorrules` contain the required Synapse priority directives.
