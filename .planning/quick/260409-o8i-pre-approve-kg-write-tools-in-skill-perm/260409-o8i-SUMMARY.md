---
phase: quick-260409-o8i
plan: 1
subsystem: tooling
tags: [claude-code, skills, permissions, mcp, allowed-tools, synapse]

# Dependency graph
requires: []
provides:
  - Per-command MCP tool pre-approvals for /synapse:fact, :remember, :ingest, :search, :recall, :context, :status
  - Unblocked subagent bulk KG/memory building (no more serial permission prompts)
affects: [skills/synapse, dogfooding, bulk-ingest-workflows]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-command allowed-tools scoping: commands list exactly the mcp__synapse__<tool> entries their <process> block invokes, nothing more"

key-files:
  created: []
  modified:
    - skills/synapse/commands/fact.md
    - skills/synapse/commands/remember.md
    - skills/synapse/commands/ingest.md
    - skills/synapse/commands/search.md
    - skills/synapse/commands/recall.md
    - skills/synapse/commands/context.md
    - skills/synapse/commands/status.md

key-decisions:
  - "Scoped allowlists strictly per command — only the MCP tools that command's <process> actually calls, not blanket approval"
  - "Excluded destructive tools (synapse_memory_delete, synapse_update_self, synapse_memory_remove_relation) from every allowlist"
  - "Left dashboard.md, onboard.md, selftest.md untouched — CLI-only commands, no MCP tool calls"
  - "Left synapse-runtime / synapse-node-compat / synapse-sql-adapter untouched — internal-dev skills with user-invocable: false"
  - "Used mcp__synapse__<tool> format (verified synapse is the MCP server name via src/runtime/version.ts SERVER_NAME)"

patterns-established:
  - "When adding an MCP tool call to a skill command, also extend that command's allowed-tools allowlist in the same edit"

requirements-completed: [QUICK-260409-o8i]

# Metrics
duration: 2min
completed: 2026-04-09
---

# quick-260409-o8i: Pre-approve KG/memory MCP write tools in Synapse skill command permissions Summary

**Per-command `mcp__synapse__*` pre-approvals added to 7 Synapse skill command manifests so subagent bulk KG/memory building stops stalling on serial permission prompts.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-09T12:03:03Z
- **Completed:** 2026-04-09T12:04:48Z
- **Tasks:** 3 (2 edit tasks + 1 verify task)
- **Files modified:** 7

## Accomplishments

- Closed the dogfooding bug where 3 of 4 background agents got blocked calling `synapse_kg_add_triple` via `/synapse:fact`.
- `/synapse:remember` pre-approves the full write chain (`memory_store` + `memory_suggest_relations` + `memory_add_relation`) so the bulk memory-building workflow runs end-to-end without prompts.
- `/synapse:ingest` pre-approves both `synapse_ingest_markdown` and `synapse_ingest_json` (picked at runtime from file extension).
- Read commands (`/synapse:search`, `/synapse:recall`, `/synapse:context`, `/synapse:status`) pre-approve their exact read-only MCP tool set so long-running read workflows also avoid stalls.
- Destructive tools (`synapse_memory_delete`, `synapse_update_self`, `synapse_memory_remove_relation`) explicitly excluded from every allowlist.
- CLI-only commands (`dashboard`, `onboard`, `selftest`) and the three internal-dev skills left untouched.

## Task Commits

Each task was committed atomically:

1. **Task 1: Pre-approve MCP write tools in fact/remember/ingest** — `0ad9ba0` (fix)
2. **Task 2: Pre-approve MCP read tools in search/recall/context/status** — `ff6f2e8` (fix)
3. **Task 3: Verification only** — no code commit (verify-only task)

**Plan metadata:** to be recorded in final metadata commit below.

## Files Created/Modified

### Write commands (Task 1)

- `skills/synapse/commands/fact.md` — added `mcp__synapse__synapse_kg_add_triple`
- `skills/synapse/commands/remember.md` — added `memory_store`, `memory_suggest_relations`, `memory_add_relation`
- `skills/synapse/commands/ingest.md` — added `synapse_ingest_markdown`, `synapse_ingest_json`

### Read commands (Task 2)

- `skills/synapse/commands/search.md` — added `search_files`, `search_code`, `memory_recall`, `kg_query`
- `skills/synapse/commands/recall.md` — added `memory_recall`, `memory_status`, `kg_query`
- `skills/synapse/commands/context.md` — added `synapse_task_context`
- `skills/synapse/commands/status.md` — added `server_status`, `memory_status`, `kg_stats`, `hooks_stats`

### Intentionally unchanged

- `skills/synapse/commands/dashboard.md` — CLI-only (Bash wrapper for `synapse dashboard`)
- `skills/synapse/commands/onboard.md` — CLI-only (Bash wrapper for `synapse onboard`)
- `skills/synapse/commands/selftest.md` — CLI-only (Bash wrapper for `synapse selftest`)
- `skills/synapse-runtime/` — internal development guide, `user-invocable: false`
- `skills/synapse-node-compat/` — internal development guide, `user-invocable: false`
- `skills/synapse-sql-adapter/` — internal development guide, `user-invocable: false`

## Decisions Made

- Scoped each allowlist to the exact tools that command's `<process>` block calls — no blanket approval, no "just in case" entries.
- Deliberately omitted `synapse_search_hybrid` from `search.md` and `synapse_index_status` from `status.md` because those tools are mentioned in the broader skill index but not actually invoked by the command's current `<process>` steps.
- Used `mcp__synapse__<tool>` naming (confirmed the MCP server name is `synapse` via `src/runtime/version.ts` → `SERVER_NAME = 'synapse'`).
- Preserved every existing built-in allowlist entry (`Read`, `Bash`, `Glob`, `Grep`).

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- `npm run lint` reported 6 pre-existing ESLint errors in `.js` files (`bin/_shared.js`, `dist/cli/commands/mcp.js`, `dist/cli/commands/onboard.js`, `dist/cli/router.js`, `dist/mcp/common/response-normalizers.js`) during Task 3 verification. All are unrelated to this plan's scope (Markdown frontmatter edits in `skills/synapse/commands/`) and pre-exist on HEAD~2. Recorded in `deferred-items.md` alongside this summary for a future cleanup quick task. Note: ESLint is also scanning `dist/` (generated output), which is likely a lint-config oversight — `dist/` should probably be in `.eslintignore`.
- Build not run (CLAUDE.md rule: "dont build app until prompted").

## Closes

Original dogfooding bug: 3 of 4 background subagents stalled on `synapse_kg_add_triple` permission prompts during bulk KG ingest in a prior session; one hit rate limits before unblocking. This plan makes every `synapse:*` user command self-sufficient within its existing capability boundary.

## Self-Check: PASSED

- 7 modified files all present with valid YAML frontmatter containing `allowed-tools:` and at least one `mcp__synapse__*` entry (verified via Node script in Task 3).
- Commit `0ad9ba0` exists on branch (Task 1 write commands).
- Commit `ff6f2e8` exists on branch (Task 2 read commands).
- `git diff HEAD~2 --name-only` output is exactly the 7 expected command files — no scope leakage.
- Destructive tools (`synapse_memory_delete`, `synapse_update_self`) not present in any of the 7 files.
- Out-of-scope files (`dashboard.md`, `onboard.md`, `selftest.md`, and the three non-mcp skill directories) confirmed clean vs HEAD.

---
*Quick task: 260409-o8i*
*Completed: 2026-04-09*
