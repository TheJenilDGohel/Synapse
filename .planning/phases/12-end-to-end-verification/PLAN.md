# Phase 12 Execution Plan: End-to-End Verification

## Wave 1: Installer Stress Test
- [ ] Run `powershell -ExecutionPolicy Bypass -File scripts/install.ps1`.
- [ ] Verify directory exists at `$HOME/synapse`.
- [ ] Verify `$HOME/synapse/bin` is in the environment (mock check or $PROFILE inspect).
- [ ] Run `synapse version` globally to ensure binaries are linked correctly.

## Wave 2: AI-Native (Silent Mode) Verification
- [ ] Run `$env:AI_AGENT="true"; node dist/interfaces/cli/index.js onboard`.
- [ ] Capture the first 2 steps of the wizard.
- [ ] verify NO spinners appear in the output.
- [ ] verify NO box-drawing characters appear.

## Wave 3: Project Link (Boost) Test
- [ ] Run `node dist/interfaces/cli/index.js link`.
- [ ] Verify `.cursorrules` creation/update.
- [ ] Verify `.clauderules` creation/update.
- [ ] Confirm the content includes: "Primary: Synapse (Recall & Knowledge Layer)".

## Wave 4: Cleanup
- [ ] Remove the local sandbox `$HOME/synapse` to keep the user's system clean unless they want it kept.
- [ ] Finalize SUMMARY.md.
