---
gsd_state_version: 1.0
milestone: v0.3.0
milestone_name: MCP Spec Compliance & Production Hardening
status: verifying
stopped_at: Completed 45-01-PLAN.md — Phase 45 plan 1 complete
last_updated: "2026-04-14T08:34:18.728Z"
last_activity: 2026-04-14
progress:
  total_phases: 9
  completed_phases: 7
  total_plans: 15
  completed_plans: 12
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-09 for v0.2.0)

**Core value:** A single local MCP server that handles both code retrieval AND rich structured memory — no cloud dependencies, no external databases, pure SQLite.
**Current focus:** Phase 46 — modern-interactive-cli

## Current Position

Phase: 47
Plan: Not started
Status: Phase complete — ready for verification
Last activity: 2026-04-16 - Fixed 4 KG output schema validation bugs (kg_query, kg_timeline, kg_as_of used TRIPLE_RESULT_SCHEMA instead of BUNDLE; kg_delete_entity used BATCH instead of ACK)

Progress (v0.2.0 only): [██████████] 100% (13/13 phases)

## v0.2.0 Execution Plan

**Lanes:**

- Lane A (foundation, strict sequence): 26 -> 27 -> 28 -> 29
- Lane B (retrieval, after 29): 30 and 31 in parallel
- Lane C (code intel, after 26): 32 independent
- Lane D (temporal + slim, after 29): 33 and 34 in parallel
- Lane E (advanced): 35 (after 34), 36 (after 26), 37 (after 30), 38 (last)

**Phases:**

| # | Name | REQ-IDs | Depends on |
|---|------|---------|------------|
| 26 | Batch Writes + Dedup + valid_from | BATCH-01..06 | — |
| 27 | Terse Response Format | TERSE-01..05 | 26 |
| 28 | Predicate Cardinality & Contradiction Fix | CARD-01..06 | 27 |
| 29 | Memory <-> KG Auto-Linking | FUSE-01..06 | 28 |
| 30 | Unified Context Primitive agent_prime | PRIME-01..06 | 29 |
| 31 | Unified Search find | FIND-01..04 | 29 |
| 32 | Symbol-Aware Code Intelligence | SYM-01..06 | 26 |
| 33 | Temporal Awareness whats_new | TEMPO-01..04 | 29 |
| 34 | Agent Surface Slim-Down | SLIM-01..07 | 29 |
| 35 | Cross-Project Bridges & Backfill | BRIDGE-01..03 | 34 |
| 36 | Proactive Hooks | HOOK-07..09 | 26 |
| 37 | Behavior Modification teach | TEACH-01..03 | 30 |
| 38 | Self-Audit Dashboard | AUDIT-01..04 | 37 |

## Performance Metrics

**Velocity (historical — v1.0 + v2.0):**

- Total plans completed: 18 (across phases 1-18)
- Average duration: ~2m30s per plan
- Recent trend: accelerating

**By Phase (v2.0 only):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 10 | 1 | 4m25s | 4m25s |
| 11 | 1 | 2m30s | 2m30s |
| 12 | 1 | 3m00s | 3m00s |
| 13 | 1 | 1m38s | 1m38s |
| 14 | 1 | 2m05s | 2m05s |
| 15 | 1 | 1m03s | 1m03s |
| 16 | 1 | 1m50s | 1m50s |
| 17 | 1 | 1m30s | 1m30s |
| 18 | 1 | 1m46s | 1m46s |

*Updated after each plan completion. v0.2.0 phases (26-38) will populate as they execute.*
| Phase 39 P01 | 960 | 3 tasks | 11 files |
| Phase 39-tool-annotations-mcp-spec P02 | 182 | 2 tasks | 1 files |
| Phase 40 P01 | 5m | 3 tasks | 4 files |
| Phase 40-structured-output-mcp-spec P02 | 21m | 3 tasks | 12 files |
| Phase 41 P01 | 200 | 3 tasks | 3 files |
| Phase 41 P02 | 221 | 2 tasks | 2 files |
| Phase 42 P01 | 2m23s | 2 tasks | 4 files |
| Phase 42 P02 | 3m 56s | 2 tasks | 6 files |
| Phase 45-actor-aware-memories P01 | 300 | 3 tasks | 9 files |
| Phase 47 P01 | 1 min | 2 tasks | 2 files |

## Accumulated Context

### Roadmap Evolution

- Phase 46 added: Modern Interactive CLI
- Phase 47 added: Rewrite CI/CD pipelines with auto-publish for beta and stable releases

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap v0.2.0]: 13-phase structure (26-38) derived from 13 REQ-ID categories in REQUIREMENTS.md — one phase per category, natural delivery boundary
- [Roadmap v0.2.0]: Phase 26 is foundational (batch writes + dedup + auto valid_from) — every later phase benefits from it
- [Roadmap v0.2.0]: Phases 26->27->28->29 form a strict foundation sequence; each depends on the prior
- [Roadmap v0.2.0]: Phase 28 absorbs quick task 260409-ohq — that PLAN.md is the starting point for Phase 28's first plan
- [Roadmap v0.2.0]: Phase 30 (agent_prime) depends on Phase 29 (fused memory-KG data); Phase 31 (find) runs in parallel with 30 after 29
- [Roadmap v0.2.0]: Phase 32 (symbol-aware code intel) runs independently after Phase 26 — does NOT block the retrieval lane
- [Roadmap v0.2.0]: Phase 34 (slim) must land before Phase 35 (bridges) because bridges need auto-populated nest/branch from SLIM-07
- [Roadmap v0.2.0]: Phase 37 (teach) depends on Phase 30 because teach memories surface through agent_prime
- [Roadmap v0.2.0]: Phase 38 (audit) runs last as the final integrity check for everything built in v0.2.0
- [Roadmap v0.2.0]: Tree-sitter introduced as a new runtime dependency ONLY in Phase 32 — explicitly allowed, all other phases honor the "no new runtime deps" rule
- [Roadmap v0.2.0]: All schema changes across v0.2.0 are additive-only migrations; no column removals, no data backfills at migration time
- [Roadmap v0.2.0]: MCP tool response shapes are additive — new fields are OK, removing or renaming existing fields is NOT
- [Roadmap v0.2.0]: Phases 19-25 belong to release/0.1.0 branch and stay reserved — v0.2.0 skips from 18 to 26
- [Phase 39]: Added IDEMPOTENT_WRITE_ANNOTATIONS as 4th annotation bucket (renamed DELETE→DESTRUCTIVE) for dedup-upsert writes
- [Phase 39]: update_status and update_self kept as inline exceptions (both have openWorldHint:true, hitting npm registry)
- [Phase 39-tool-annotations-mcp-spec]: Plan 02: Validation test uses full registerAppTools pipeline with noop fake services; asserts only RO/DH/IH (openWorldHint deferred)
- [Phase 40]: Dropped ENTITY_RESULT_SCHEMA from v0.3.0 — zero Plan 02 consumers per CONTEXT.md 'smallest set' rule
- [Phase 40]: Exported toolResult() from tool-utils via single-token change so Plan 02 unit tests import from public barrel without framework reach-back
- [Phase 40]: FREEFORM_RESULT_SCHEMA is the single named escape hatch — registrar fallback references it instead of inlining z.any(), zero orphans in tool-utils.ts
- [Phase 40-structured-output-mcp-spec]: All 72 tools wired to 8 output archetypes (17 SEARCH, 10 STATUS, 11 BATCH, 6 MEMORY, 7 ACK, 4 TRIPLE, 14 BUNDLE, 3 FREEFORM); FREEFORM budget 3 of 5; ENTITY archetype confirmed unnecessary
- [Phase 40-structured-output-mcp-spec]: graph-tools.ts schemas prop promoted from optional unknown to required SharedSchemas — harness test/terse-response.test.js updated to pass the 8 archetypes
- [Phase 41]: Explicit 4th resourceLinks parameter on toolResult() takes precedence over ToolResponsePayload.resource_links channel (zero-ambiguity merge rule for Plan 02)
- [Phase 41]: file URI format uses file://${path.resolve(p)} — POSIX yields canonical file:///abs, Windows yields file://C:\\ matching VS Code MCP convention
- [Phase 41]: Dedup by absolute path before buildResourceLink -- helpers stay per-path, not per-match
- [Phase 41]: Description format strings locked to CONTEXT.md: chunk X-Y of N lines / path match: frag / N match(es) for query
- [Phase 41]: Empty-result and error paths emit zero resource_links via natural code-flow (no defensive branch)
- [Phase 42]: v12 migration is additive only: created_at stays as row metadata, recorded_at becomes canonical transaction-time axis
- [Phase 42]: Both kg_triples INSERT sites stamp recorded_at from the same nowIso() now variable already in scope for created_at
- [Phase 42]: addTriple response shape left at 12 fields in Plan 01 — Plan 02 owns the CARD-06 reconciliation for a 13th field
- [Phase 42]: invalidateTriple UPDATE does not touch recorded_at — per CONTEXT.md it is permanently the row's original transaction time
- [Phase 42]: CARD-06 reconciliation option (c): addTriple returns 13 fields with recorded_at at position 10, no existing test pins 12-field shape
- [Phase 42]: queryTriplesAsOf event mode branch preserved byte-identical to pre-phase SQL so BATCH-06 tests pass unchanged; transaction mode is a dedicated SQL path on recorded_at with no valid_to interaction
- [Phase 45-actor-aware-memories]: actor_id is a peer of agent_id: agent_id is the visibility-scoping axis, actor_id is the attribution axis; auto-inferred from agent_id when omitted
- [Phase 45-actor-aware-memories]: actor_id filter on recall is exact-match only (not scope-broadening like agentId OR global fallback)

### Pending Todos

None — autonomous execution in progress.

### Blockers/Concerns

- **Potential sequence friction:** Phase 32 (tree-sitter code intel) is the biggest risk — new runtime dep, 5-language grammar setup, 500ms performance target on 1000-file repos. It runs independently after 26 so it does not block the retrieval lane, but it may stretch over multiple plans.
- **Phase 34 scope:** SLIM-01..07 is 7 requirements in one phase (largest of v0.2.0). If auto-inference rules prove thorny it may be split into 34.1 via `/gsd:insert-phase`.
- **Phase 27 benchmark:** TERSE-05 (70% token reduction) requires a fixed benchmark conversation to be defined during planning — no such benchmark exists yet, will need creation in Phase 27 Plan 1.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260409-kaa | Brand identity + docs update for restructuring | 2026-04-09 | f55da7e | [260409-kaa](./quick/260409-kaa-create-synapse-brand-identity-and-upda/) |
| 260409-nyr | Fix update cache version-drift bug + TTL default 60m + compareVersions regression guard | 2026-04-09 | acfbd85 | [260409-nyr](./quick/260409-nyr-fix-update-cache-semver-comparison-and-t/) |
| 260409-o8i | Pre-approve MCP KG/memory write tools in Synapse skill command permissions | 2026-04-09 | 0ad9ba0, ff6f2e8 | [260409-o8i](./quick/260409-o8i-pre-approve-kg-write-tools-in-skill-perm/) |
| 260409-ohq | Fix KG contradiction detection for functional predicates — ABSORBED into Phase 28 | 2026-04-09 | (pending) | [260409-ohq](./quick/260409-ohq-fix-kg-contradiction-detection-for-funct/) |
| 260415-isp | Fix synapse_find schema validation bug, harden agent_prime SOP hook, bump to next beta version | 2026-04-15 | d682eef | [260415-isp](./quick/260415-isp-fix-synapse-find-schema-validation-bug/) |
| 260415-jq9 | Audit and fix Windows compatibility blockers, add Windows CI workflow, bump to next beta | 2026-04-15 | e94bf97 → 0495e05 | [260415-jq9](./quick/260415-jq9-audit-and-fix-windows-compatibility-bloc/) |
| 260415-n69 | Fix broken retrieval tools schema regression, add runtime shape test, compact/lite response tiers | 2026-04-15 | (pending) | [260415-n69](./quick/260415-n69-fix-broken-retrieval-tools-schema-regres/) |
| 260416-ggw | Fix 4 KG output schema validation bugs: kg_query, kg_timeline, kg_as_of, kg_delete_entity | 2026-04-16 | 106b7f3 | [260416-ggw-fix-3-kg-mcp-output-schema-validation-bu](./quick/260416-ggw-fix-3-kg-mcp-output-schema-validation-bu/) |
| 260416-ggw+ | Fix search scoping (all_roots bypasses autoProjectSplit) + selftest entity leak cleanup | 2026-04-16 | c62e37c | (inline fix) |

## Session Continuity

Last session: 2026-04-13T10:27:43.734Z
Stopped at: Completed 45-01-PLAN.md — Phase 45 plan 1 complete
Resume file: None
Next command: `/gsd:plan-phase 27`
