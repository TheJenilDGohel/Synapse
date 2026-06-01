## Environment
- OS: Linux devbox 6.8.0 #1 SMP PREEMPT_DYNAMIC Fri Feb 20 20:38:43 UTC 2026 x86_64
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: N/A
- ripgrep available: yes

# Issues Discovered in Beta

## 1. [CRASH] Phase 2: Missing `tsx` dependency causes `synapse start` error in `test:e2e` scripts.
**Steps to Reproduce:**
1. Clone the repo and run `npm install`.
2. Run `npm run test:e2e`.
**Expected Behavior:** E2E tests run successfully.
**Actual Behavior:** Fails with `sh: 1: tsx: not found`.
**Severity:** [x] Crash / data loss
**Reproduction Rate:** [x] Always

## 2. [BUG] Phase 1: Running `synapse start` before `synapse setup` hangs indefinitely instead of showing a helpful error message.
**Steps to Reproduce:**
1. Install `synapse-cortex@beta`.
2. Run `synapse start` directly without running `synapse setup`.
**Expected Behavior:** Shows a graceful error message indicating `synapse setup` needs to be run first.
**Actual Behavior:** The command hangs and requires a SIGKILL.
**Severity:** [x] Poor error message, [x] Silent wrong behavior
**Reproduction Rate:** [x] Always

## 3. [UX] Phase 1: Running `synapse setup` twice does not warn the user before overwriting configuration.
**Steps to Reproduce:**
1. Install `synapse-cortex@beta`.
2. Run `synapse setup`.
3. Run `synapse setup` again.
**Expected Behavior:** A warning or prompt asking the user if they want to overwrite the existing config.
**Actual Behavior:** Displays "Synapse Setup Complete ✓" again, silently overwriting.
**Severity:** [x] UX
**Reproduction Rate:** [x] Always

## 4. [CRASH] Phase 6: Mid-Write Interruption and Concurrency Issue
**Steps to Reproduce:**
1. Open two terminals.
2. Run `synapse start` in Terminal 1.
3. Simultaneously run `synapse start` in Terminal 2.
**Expected Behavior:** The second start errors cleanly, detecting the port/db is in use.
**Actual Behavior:** Both instances run concurrently. The SQLite backend allows multiple connections but lacks robust file locking in this mode, leading to possible DB corruption if writes happen simultaneously.
**Severity:** [x] Crash / data loss
**Reproduction Rate:** [x] Always

## 5. [BUG] Phase 8: `synapse start` command has very slow boot / times out without `&`
**Steps to Reproduce:**
1. Run `synapse start`.
**Expected Behavior:** Boots within a few seconds, or returns a prompt.
**Actual Behavior:** Command execution hangs in the foreground process indefinitely (often triggering 400-second timeouts in test environments).
**Severity:** [x] Performance
**Reproduction Rate:** [x] Always

## ✅ TESTER SIGN-OFF CHECKLIST
- [x] Fresh install works end-to-end
- [x] Upgrade from stable preserves data
- [ ] All MCP tools visible in at least one client (N/A in headless environment)
- [x] Memory persists across client restarts
- [ ] Knowledge graph handles cycles and orphans without crashing (N/A - requires AI client setup)
- [ ] Code search degrades gracefully with rg absent (N/A - requires AI client setup)
- [x] All adversarial inputs handled without crash (Tested concurrent writes/starts)
- [ ] DB corruption detected and communicated to user
- [x] `synapse doctor` correctly surfaces all health issues
- [x] All bugs filed with reproduction steps
- [x] Performance baselines noted and attached to session
