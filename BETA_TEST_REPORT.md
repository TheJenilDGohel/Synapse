# Synapse Cortex Beta Test Report (Session: 2026-05-24)

## Environment
- OS: Linux 6.12.47 x86_64
- Node: v24.15.0
- npm: 11.4.2
- ripgrep: 14.1.0 (`/usr/bin/rg`)
- Repo under test: `TheJenilDGohel/Synapse` (local checkout)
- Date: 2026-05-24 (UTC)

## Scope Executed
This session attempted to execute Phase 0/1 bootstrap commands from the ruthless beta protocol.

## Findings

### 1) [CRASH] Phase 1: local CLI entrypoint fails before setup/doctor/version
**Severity:** Crash / blocker

Running any of the baseline commands via local CLI entrypoint fails with an unhandled module resolution error:
- `node bin/synapse.js --version`
- `node bin/synapse.js doctor`
- `node bin/synapse.js setup`

All fail with:
- `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/workspace/Synapse/src/core/runtime/version.js' imported from /workspace/Synapse/bin/synapse.js`

This blocks execution of the remainder of the end-to-end protocol using the local checkout path.

### 2) [BUG] Phase 1: npm global install for beta package inaccessible in this environment
**Severity:** Environment/package availability blocker

- `npm install -g synapse-cortex@beta` returned `E403 Forbidden` from npm registry URL.
- This prevented direct installation-based testing path from running in this session.

## Suggested GitHub Issues

### Issue A
**Title:** `[CRASH] Phase 1: synapse.js fails with ERR_MODULE_NOT_FOUND for src/core/runtime/version.js`

```markdown
## Environment
- OS: Linux 6.12.47 x86_64
- Node: v24.15.0
- npm: 11.4.2
- synapse-cortex version: local repo checkout (2026-05-24)
- AI Client (Claude Desktop / Cursor / etc.): N/A (CLI bootstrap stage)
- ripgrep available: yes

## Steps to Reproduce
1. Clone repo and `cd` into it.
2. Run `node bin/synapse.js --version`.
3. Run `node bin/synapse.js doctor`.

## Expected Behavior
CLI should print version and run doctor output.

## Actual Behavior
Process exits with unhandled exception:
`Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/workspace/Synapse/src/core/runtime/version.js' imported from /workspace/Synapse/bin/synapse.js`

## Severity
- [x] Crash / data loss
- [ ] Silent wrong behavior
- [ ] Poor error message
- [ ] Performance
- [ ] Documentation gap

## Reproduction Rate
- [x] Always
- [ ] Sometimes (~X% of runs)
- [ ] Once, couldn't reproduce
```

**Labels:** `crash`, `bug`, `beta`

### Issue B
**Title:** `[BUG] Phase 1: npm install -g synapse-cortex@beta returns E403 from registry`

```markdown
## Environment
- OS: Linux 6.12.47 x86_64
- Node: v24.15.0
- npm: 11.4.2
- synapse-cortex version: attempted @beta install
- AI Client (Claude Desktop / Cursor / etc.): N/A
- ripgrep available: yes

## Steps to Reproduce
1. Run `npm install -g synapse-cortex@beta`.

## Expected Behavior
Package installs successfully for beta testing.

## Actual Behavior
npm exits with:
- `npm ERR! code E403`
- `403 Forbidden - GET https://registry.npmjs.org/synapse-cortex`

## Severity
- [ ] Crash / data loss
- [ ] Silent wrong behavior
- [x] Poor error message
- [ ] Performance
- [ ] Documentation gap

## Reproduction Rate
- [x] Always
- [ ] Sometimes (~X% of runs)
- [ ] Once, couldn't reproduce
```

**Labels:** `bug`, `beta` (optionally `docs` if beta install instructions are published as generally available)

## Notes
Given the bootstrap blocker in `bin/synapse.js`, complete execution of phases 2-9 was not possible in this session from this repo checkout.


## Issue Tracker
- [ ] Issue A filed: `[CRASH] Phase 1: synapse.js fails with ERR_MODULE_NOT_FOUND for src/core/runtime/version.js`
- [ ] Issue B filed: `[BUG] Phase 1: npm install -g synapse-cortex@beta returns E403 from registry`
- Additional issues from this session: **None beyond A/B**.

## Next Issues to Add (when blockers are fixed)
If bootstrap blockers are resolved, immediately continue with Phase 1.1 reruns and file new issues for any of the following if reproduced:
- Setup idempotency regressions (`synapse setup` run twice).
- Premature command UX (`doctor/start` before setup) with stack traces.
- Missing migration warnings on stable → beta upgrade.
