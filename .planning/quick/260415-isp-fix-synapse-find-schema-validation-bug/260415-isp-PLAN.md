---
quick_id: 260415-isp
title: Fix synapse_find schema validation bug, harden agent_prime SOP hook, bump to next beta
date: 2026-04-15
---

# Quick Plan 260415-isp

## Goal

Resolve two reported issues from prior session and ship them as `0.3.0-beta.3`:

1. `synapse_find` returns `{query, count, sources, items}` — does not match `SEARCH_RESULT_SCHEMA` (PaginatedResult or array). MCP SDK rejects the response with an output validation error.
2. `synapse-pre-tool.cjs` injects a weak "SOP: ALWAYS call synapse_agent_prime" reminder that is ignored across sessions because it is buried in optional context, has no session memory, and never escalates.

## Tasks

### Task 1 — Fix `synapse_find` schema mismatch

**Files:** `src/mcp/tools/find-tools.ts`, `src/services/unified-find/find.ts` (no signature change), optionally `src/mcp/common/normalizers/` (small helper).

**Action:**
- In `find-tools.ts` handler, transform the `FindResult` from `unifiedFind` into the SEARCH_RESULT_SCHEMA PaginatedResult shape:
  - `data = { total_count, count, limit, offset: 0, has_more: false, next_offset: null, items: result.items }`
  - Carry `query` and per-source counts via `createToolResponse(data, { meta: { query, sources, count, tool: 'synapse_find' } })`
- Use the existing `createToolResponse` import (already used elsewhere in retrieval.ts).
- Pull the user's requested `limit` (clamped) into `total_count` so meta and data agree.

**Verify:**
- `npm run check` passes (tsc + node --check on bin scripts).
- Validate the new shape against `SEARCH_RESULT_SCHEMA.data` manually with a tiny parse test (inline in `test/mcp-tools.test.js` or a new test file under `test/`).

**Done:**
- `synapse_find` response payload validates against `SEARCH_RESULT_SCHEMA`.
- No regression in existing tool tests.

### Task 2 — Harden `synapse-pre-tool.cjs` SOP reminder

**Files:** `scripts/hooks/synapse-pre-tool.cjs`, `scripts/hooks/install-hooks.cjs`.

**Action:**
- Add session-keyed marker file `${tmpdir}/synapse-prime-<session_id>.flag` (fall back to cwd hash when session_id missing in hook stdin).
- On hook fire:
  - If `tool_name` matches `mcp__synapse__.*synapse_agent_prime` (or any synapse_agent_prime variant), write the marker, exit `{}`. (Requires the matcher in install-hooks to also include `mcp__synapse__.*` so this path is reachable.)
  - If marker exists, behave as today (debounced contextual recall, no shouting).
  - If marker is missing AND `tool_name` is a substantive work tool (Edit/Write/Bash/MultiEdit), return a **strong** `additionalContext` block: line breaks, `[ACTION REQUIRED]` prefix, explicit "call mcp__synapse__synapse_agent_prime BEFORE the next Edit/Write/Bash" sentence, plus the same recalled memories block as today.
  - Cap the strong reminder at one shout per 60s to avoid runaway nagging if the AI ignores it; after that drop back to passive.
- Update `scripts/hooks/install-hooks.cjs` matcher from `Edit|Write|Bash|MultiEdit` to `Edit|Write|Bash|MultiEdit|mcp__synapse__.*` so the marker-write path is reachable.

**Verify:**
- `node --check scripts/hooks/synapse-pre-tool.cjs` and `node --check scripts/hooks/install-hooks.cjs` succeed.
- Manually echo a fake hook payload through the script to confirm:
  - First Edit call without prior prime → strong reminder.
  - After a `mcp__synapse__synapse_agent_prime` call payload → marker written.
  - Subsequent Edit call → no shouting.

**Done:**
- Hook script enforces session-scoped reminder behavior.
- Installer matcher updated.

### Task 3 — Bump version to `0.3.0-beta.3` and update CHANGELOG

**Files:** `package.json`, `CHANGELOG.md`.

**Action:**
- Set `version` to `0.3.0-beta.3` in `package.json`.
- Prepend a `0.3.0-beta.3` section to `CHANGELOG.md` summarising the two fixes (Fixed: synapse_find schema; Changed: agent_prime hook hardening).
- Stay on the existing `release/0.3.0` branch (per stored "branch per version" memory — branch already exists).

**Verify:**
- `node -e "console.log(require('./package.json').version)"` prints `0.3.0-beta.3`.
- CHANGELOG top entry matches new version.

**Done:**
- Version bump + changelog entry committed atomically with the fixes.

## Out of scope

- Fixing `normalizeSearchHybridResult` / `normalizeSymbolResult` shape mismatches (separate latent bugs — not reported, would expand the diff).
- Re-running the full doc translation matrix per the "auto-update docs per version" memory — that is a release-engineering task, not a quick fix; flag it as a follow-up.
- Republishing to npm — only bump + commit; user runs `release:beta` separately.
