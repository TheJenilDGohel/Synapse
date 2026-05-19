# Phase 08-03 Summary

**Objective**: Refine health check logic in 'synapse doctor' and 'synapse onboard' to distinguish critical vs optional failures.
**Status**: Completed.

- `scripts/runtime/doctor-synapse.mjs` now includes a `critical` property on all checks.
- Exit logic updated to only return non-zero if a critical check fails.
- UI updated with tiered symbols: `✓` (Pass), `⚠` (Optional Fail), `✗` (Critical Fail).
- `src/interfaces/cli/commands/onboard.ts` updated to parse the new tiered JSON output and report "Operational" if only non-critical issues exist.
- Verified by simulating missing `ripgrep` (optional) and seeing successful doctor exit and informative onboarding summary.