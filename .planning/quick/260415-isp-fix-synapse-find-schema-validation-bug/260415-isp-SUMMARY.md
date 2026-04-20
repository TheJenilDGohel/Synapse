---
quick_id: 260415-isp
title: Fix synapse_find schema validation bug, harden agent_prime SOP hook, bump to next beta
date: 2026-04-15
status: complete
---

# Quick Task 260415-isp — Summary

## What shipped

### Task 1 — `synapse_find` schema validation fix
- Root cause: `unifiedFind()` returns `{query, count, sources, items}`, but the tool was wired with `SEARCH_RESULT_SCHEMA` whose `data` union expects either a `PaginatedResult` shape or a bare array. MCP SDK rejected every successful response with an output validation error (the symptom the user hit: `synapse_find` always failed with "Output validation error").
- Fix in `src/mcp/tools/find-tools.ts`:
  - Wrap the find result into the canonical PaginatedResult shape: `{ total_count, count, limit, offset: 0, has_more: false, next_offset: null, items }`.
  - Carry `query` and per-source counts via `createToolResponse(data, { meta: { tool, query, count, sources } })` so they remain available to consumers without breaking the schema contract.
  - Clamp `requestedLimit` defensively in case the input is not coerced to a number.
- Validated the new shape against `SEARCH_RESULT_SCHEMA.data` with a runtime zod `safeParse` — both `data` and `meta` parsed `ok: true`.

### Task 2 — `synapse-pre-tool` hook hardening
- Root cause: The previous hook always emitted the same passive "SOP: ALWAYS call synapse_agent_prime" line buried in optional context. With nothing tracking session state, it nagged forever and was easy to ignore. (User report: ignored across 17 Flutter apps in one session.)
- Rewrite of `scripts/hooks/synapse-pre-tool.cjs`:
  - Detects `synapse_agent_prime` calls (any MCP wrapper variant) and writes a session-keyed marker file in `os.tmpdir()`.
  - On a substantive work tool (`Edit | Write | Bash | MultiEdit | Read | Grep`), checks the marker.
  - If **not primed** → emits a strong, formatted `[ACTION REQUIRED]` block via `additionalContext` demanding `agent_prime` be invoked before the next tool. Throttled to once per minute via a separate `synapse-shout-last.json` debounce file so it cannot runaway-spam.
  - If **primed** → falls back to the existing debounced `synapse memory prime` recall, with a friendlier "Session is primed" header so the AI is not perpetually scolded.
- Session key derives from `session_id` in the hook stdin (sha1, 12-char), with a cwd-hash fallback when the runtime does not provide one.
- Updated `scripts/hooks/install-hooks.cjs` matcher from `Edit|Write|Bash|MultiEdit` to `Edit|Write|Bash|MultiEdit|mcp__synapse__.*` so the hook can observe `agent_prime` calls and clear the marker.

### Task 3 — Version bump
- `package.json` `0.3.0-beta.2` → `0.3.0-beta.3`.
- New `0.3.0-beta.3` entry at the top of `CHANGELOG.md` documenting both fixes (Fixed: find schema; Changed: hook hardening).
- Stayed on the existing `release/0.3.0` branch per the project's "branch per version" convention.

## Verification

- `npm run check` (tsc --noEmit + node --check on every bin/script) → green.
- `npx tsx --test test/mcp-annotations.test.js test/mcp-tools.test.js` → 4/4 pass (74-tool annotation map + outputSchema archetype identity + register-and-execute smoke test).
- `SEARCH_RESULT_SCHEMA.data` runtime parse against the new find-tool payload → `ok: true`.
- End-to-end hook simulation:
  - First Edit (no prime) → strong reminder emitted.
  - `mcp__synapse__synapse_agent_prime` call → marker written, `{}` returned.
  - Subsequent Edit → soft "Session is primed" recall context.

## Files touched

- `src/mcp/tools/find-tools.ts`
- `scripts/hooks/synapse-pre-tool.cjs` (full rewrite)
- `scripts/hooks/install-hooks.cjs` (matcher update)
- `package.json` (version bump)
- `CHANGELOG.md` (new beta.3 entry)

## Out of scope / follow-ups

- `normalizeSearchHybridResult` / `normalizeSymbolResult` may have the same shape mismatch against `SEARCH_RESULT_SCHEMA` (they return `{query, results}` style objects, not PaginatedResult). They were not in the user report and changing them would expand the diff. Worth a follow-up audit pass.
- The "auto-update docs per version" memory implies docs/translations should refresh on every bump. That is a release-engineering job and was deferred from this quick task.
- npm publish is intentionally not run — user runs `npm run release:beta` separately.
