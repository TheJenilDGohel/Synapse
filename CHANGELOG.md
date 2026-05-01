<!-- cspell:ignore synapse SYNAPSE reranker RERANKER SARIF stopword optimised prefiltering -->

# Changelog

All notable changes to this project will be documented in this file.

## [0.0.1-beta] - 2026-05-01

### Initial Beta Release

- **Pillars of Intelligence**: Semantic Code Search, Temporal Knowledge Graph, and Persistent AI Memory.
- **Local-First Architecture**: Pure SQLite backend with zero cloud dependencies.
- **AST-Aware Intelligence**: Native support for 9+ languages (TypeScript, Python, Go, Rust, etc.).
- **Bio-Inspired UI**: Custom documentation suite with neural aesthetics.

## [0.3.2] - 2026-04-16

### Fixed

- **Windows: `sqlite-vec-extension.ts` bare `npm` spawn** — `detectGlobalNpmRoot()` and the sqlite-vec auto-installer used bare `'npm'` in `spawnSync`, which fails on Windows (needs `npm.cmd`). Now uses platform-aware `NPM_CMD` constant + `shell: isWindows` on the install call.
- **Windows: `agent-prime.ts` bash shell pipeline** — `getRecentChanges()` used a single `execSync` with bash-only `2>/dev/null || ... || echo` pipeline. Refactored to sequential try/catch calls that work on both bash and cmd.exe.

## [0.3.1] - 2026-04-16

### Fixed

- **Windows install crash** — `postinstall` script used bash-only `2>/dev/null || true` which fails on Windows cmd.exe with "'true' is not recognized". Replaced with a cross-platform `node -e` try/catch wrapper.

## [0.3.0] - 2026-04-16

### Stable Release

Promotes `0.3.0-beta.6` to stable after comprehensive audit and fix cycle.

Synapse v0.3.0 is the only MCP server with all three pillars: **code intelligence**, **knowledge graph**, and **persistent memory** — no cloud dependencies, no external databases, pure SQLite.

### Fixed (since beta.5)

- **KG output schema validation** — `synapse_kg_query`, `synapse_kg_timeline`, and `synapse_kg_as_of` were declared with `TRIPLE_RESULT_SCHEMA` but return bundle-shaped objects (`{entity_id, count, triples}`). Changed to `BUNDLE_RESULT_SCHEMA`. All three tools were 100% broken — every call returned an MCP output validation error.
- **`synapse_kg_delete_entity` output schema** — declared with `BATCH_RESULT_SCHEMA` (`deleted: number`) but service returns `deleted: boolean`. Changed to `ACK_RESULT_SCHEMA`.
- **Search scoping with `all_roots=true`** — `resolveSearchBases()` was running `splitRootIntoProjects()` even when `allRoots` was explicitly true, narrowing search to auto-detected project directories only (e.g., only `/R&D` instead of the full root). Now bypasses auto-split when `allRoots` is set. Also fixes `search_hybrid` `lexical_hits` always being 0 (same scoping issue downstream).
- **Selftest KG entity leak** — `checkKnowledgeGraph()` created test entities but never deleted them, causing orphaned `__selftest_entity_*` entries to accumulate on every selftest run. Added `deleteEntity` cleanup.
- **CI: skill metadata version sync** — bundled `.synapse-skill.json` files now match package version.
- **CI: mcp-annotations test expectations** — updated schema archetype map to match the KG schema fixes.

### Audit Results (at release)

- Health score: **99/100**
- Memory: 144 entries, 963 events across 13 projects
- Knowledge graph: 243 entities, 370 active triples, 55 predicates
- Index: 34,813 files, 107,292 chunks, AST chunking for 9 languages
- CI: Quality green on both Ubuntu and Windows (201 tests, 0 failures)

## [0.3.0-beta.5] - 2026-04-15

### 🚨 Critical: retrieval tools no longer broken

Dogfooding Synapse during a token-consumption deep dive surfaced the same class of schema regression I fixed in `synapse_find` earlier this release cycle — except this time it affected **10+ retrieval tools** simultaneously. `test/mcp-annotations.test.js` only asserts schema IDENTITY (`meta.outputSchema === expectedArchetype`), not that the handler's actual return value validates against the declared schema, so the bugs shipped with full green CI.

### Fixed

- **`synapse_memory_recall`, `synapse_memory_events`, `synapse_memory_suggest_relations`, `synapse_memory_related`, `synapse_search_hybrid`, `synapse_get_symbol`, `synapse_find_usages`, `synapse_find_callers`, `synapse_find_definition`, `synapse_find_implementations`, `synapse_rename_preview`** — every one of these tools was returning a response shape that failed runtime validation against `SEARCH_RESULT_SCHEMA` (their normalizers produced `{query, count, items}`, `{symbol, count, definitions}`, or `{query, results, lexical_hits, ...}` shapes, none of which match the declared PaginatedResult union). MCP SDK rejected every call with a structured-content validation error, making ~13% of Synapse's tool surface unusable.
  - Fix: added an `ensurePaginatedShape()` helper in `src/mcp/common/terse-utils.ts` and wired every broken normalizer through it. The helper overlays `total_count / count / limit / offset / has_more / next_offset / items` on top of the existing shape, so legacy field names (`results`, `callers`, `definitions`, `usages`, `suggestions`, `related`, `changes`, `implementations`) remain for backwards compat via the schema's `passthrough()`.

### Added

- **`test/mcp-runtime-shapes.test.js`** — a new runtime shape test that calls every `SEARCH` archetype normalizer with realistic fixture input and asserts the output validates against `SEARCH_RESULT_SCHEMA.data.parse()`. Catches the exact class of regression that just shipped: schema identity vs. runtime shape drift. 16 tests, all green. Any future normalizer whose output doesn't match the declared schema will fail loudly here.

- **`item_format: 'verbose' | 'compact' | 'lite'` on three read tools** (`synapse_memory_list`, `synapse_memory_recall`, `synapse_find`) — opt-in token savings:
  - `verbose` (default, unchanged): full item with `stripEmptyFields` applied.
  - `compact`: keeps `id / title / summary / tags / kind / importance / score` plus source-specific identifiers for code (`file / start_line / end_line`) and triples (`subject / predicate / object / triple_id`). **~50% smaller per item.**
  - `lite`: keeps `id / title / score` plus the source identifier. **~85% smaller per item.**
  - Recommended agent pattern: call list/recall/find in `compact` to enumerate, then call `memory_get` on the specific IDs you actually want full content for.
  - Implemented via `applyReadFormat()` / `applyReadFormatToItems()` in `terse-utils.ts`. Nested `.memory` wrappers (recall result pattern) are projected correctly so callers see the identifying fields regardless of which layer they live on.

### Changed

- **`stripEmptyFields()` expanded** to strip more noise from read responses:
  - Empty strings: added `agent_id`, `actor_id`, `source_ref` to the existing `nest / branch / topic / feature` list.
  - New: `null last_recalled_at`, `recall_count: 0`, empty `links` / `revisions` arrays.
  - Existing tests still pass; measured ~10% additional savings per memory item on top of the Phase 27 baseline.

### Known drift (still manual)

- `SERVER_VERSION` in `src/runtime/version.ts` and the 4 skill metadata files still require manual sync at bump time. Filed as a follow-up — should be auto-generated from `package.json` in a future `bump:beta` script.

## [0.3.0-beta.4] - 2026-04-15

### 🪟 Windows Compatibility Sweep

Synapse now installs and runs on Windows. Multiple critical Windows blockers were identified and fixed.

### Fixed

- **`bin/_boot.cjs` is no longer Windows-broken.** The previous loader detected which bin command was invoked by inspecting the symlink name in `process.argv[1]`. npm does not create symlinks on Windows — it generates `.cmd` shims that all spawn `node bin/_boot.cjs`, so every Windows user got `_boot` as the detected name and every bin command (`synapse`, `synapse`, `synapse-setup`, `synapse-doctor`, etc.) failed with a wrong-target ESM resolution error. `_boot.cjs` is now an exported `runTarget(scriptName)` runner, and each of the 8 bin entries has its own tiny shim under `bin/<name>.cjs` that hard-codes its target. Works identically on Linux, macOS, and Windows.
- **`expandHome()` cross-platform.** `src/runtime/config.ts` was reading `process.env.HOME` directly (undefined on Windows) and only matching `~/` (never `~\`). Replaced with `os.homedir()` and a regex that accepts both separators. User-supplied config paths starting with `~` now expand correctly on every OS.
- **`preinstall-cleanup.mjs` cross-platform paths.** Replaced `path.join('/', ...)` Unix root build with proper drive-aware reconstruction, swapped `URL().pathname` (which returns `/C:/...` on Windows) for `fileURLToPath()`, made the git-dep-prep detection use `path.join` instead of literal `/.npm/_cacache/tmp/`, and routed `npm root -g` through `npm.cmd` on Windows.
- **`spawnSync('rg', …)` resolves on Windows.** Node does not auto-resolve PATHEXT inside `child_process.spawn`, so `'rg'` was failing with `ENOENT` on Windows even when ripgrep was installed. Introduced `src/runtime/platform.ts` exporting `RG_BIN` (`rg.exe` on Windows, `rg` elsewhere) and routed every ripgrep spawn site through it (`lexical-search.ts` x2, `runtime/config.ts`, `cli/commands/selftest-checks.ts`). `search_code` and `search_hybrid` now work on Windows.
- **`spawnSync('synapse', …)` and `spawnSync('npm', …)` resolve on Windows.** Hooks (`synapse-pre-tool.cjs`, `synapse-post-tool.cjs`), the embeddings installer (`install-synapse-skill.mjs`), the global-stale-temp checker (`doctor-synapse.mjs`), and `quality-audit.mjs` all spawned bare `synapse` / `npm` strings without the `.cmd` suffix. They now use `process.platform === 'win32' ? 'X.cmd' : 'X'`.

### Changed

- **CI now runs on Windows AND Linux.** `.github/workflows/quality.yml` was upgraded from a single `ubuntu-latest` job to a `[ubuntu-latest, windows-latest]` matrix with `fail-fast: false`. Includes platform-aware ripgrep install (`apt-get` vs `choco`), the full quality pipeline (lint, typecheck, tests, circular-deps, unused-deps, package quality, audit), and a smoke test of the new bin shims on both OSes. Windows regressions will now be caught at PR time.
- **Added `.gitattributes`** with `* text=auto eol=lf` and explicit `eol=lf` for `.cjs/.mjs/.js/.ts/.json/.yml/.sh` so Windows users with `core.autocrlf=true` no longer receive CRLF in shebang lines or YAML/JSON files.

### New files

- `src/runtime/platform.ts` — centralised `isWindows`, `RG_BIN`, `NPM_BIN`, `NPX_BIN`, `SYNAPSE_BIN`, `platformBin()` helpers so the platform check lives in exactly one place.
- `bin/synapse.cjs`, `bin/synapse.cjs`, `bin/synapse-setup.cjs`, `bin/synapse-doctor.cjs`, `bin/synapse-upgrade.cjs`, `bin/synapse-install-skill.cjs`, `bin/synapse-task-context.cjs`, `bin/synapse-capture-outcome.cjs` — per-bin shims that route through `_boot.cjs`'s `runTarget`.

### Deeper Windows CI fixes (from the full green-build chase)

Enabling the Windows CI job exposed a second layer of Windows-hostile behaviour that the initial static audit did not catch. Ten Quality runs later, every one of these is fixed:

#### tsc & dependency resolution

- **`tsconfig.json` now declares `"types": ["node"]`** explicitly. On Windows in CI, the default tsc auto-include of `node_modules/@types/*` was not resolving `@types/node` even though the package was installed. Explicit type loading is the safe path.
- **`@huggingface/transformers` hoisted to `devDependencies`.** It was previously installed only via the `postinstall` best-effort path. Linux CI runs happened to have it cached in `node_modules` from previous runs (because `actions/setup-node@v6`'s `cache: npm` restores to the workspace root, not just `~/.npm`), so `await import('@huggingface/transformers')` type-resolved there. Windows had no cache and the postinstall silently failed, leaving tsc with two `TS2307` errors. Declaring it as a devDep means `npm ci` installs it via the lockfile on both OSes. Production users (`npm install -g`) still do not get it because `-g` only installs `dependencies`, preserving the original "not bundled to avoid onnxruntime TAR_ENTRY_ERRORS" intent.

#### SQLite handle lifecycle on Windows

- **`Adapter.close()` added to the memory subsystem.** Windows holds file locks on open SQLite handles, so every test that did `fs.rmSync(tempDir)` without first closing the store failed with `EBUSY: unlink 'memory.db'`. Linux happily unlinks files with open handles so this was latent. Added a best-effort optional `close()` method on the `Adapter` interface, wired `NodeSqliteAdapter` to call the underlying `node:sqlite DatabaseSync.close()`, and exposed `MemoryStore.close()` + `MemoryService.close()` that delegate.
- **WAL hygiene before close.** `node:sqlite`'s `close()` alone does not release the `.db-wal` / `.db-shm` auxiliary files on Windows. Added `PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode=DELETE;` before every `db.close()` in `NodeSqliteAdapter`, `SymbolIndexService`, and `SqliteVecIndexService` so the auxiliary files are released as well.
- **`SymbolIndexService` and `SqliteVecIndexService` now expose public `close()`.** Previously the vec index had a private `resetDb()` and the symbol index had nothing. Tests that created either service leaked handles into the temp dir.
- **Test teardowns updated across 17 files** via `fs.rmSync(..., { maxRetries: 10, retryDelay: 100 })` as a safety net, plus explicit `await store.close()` / `service.close()` calls before the `rmSync` where a store is in scope.

#### Cross-platform process spawning

- **`child_process.spawn` on Windows needs `shell: true` to launch `.cmd` / `.bat` wrappers.** Getting the binary name right (`npm.cmd` vs `npm`) is necessary but not sufficient — without a shell, Node's spawn fails silently with `ENOENT` and produces zero stdout/stderr, leaving the caller with an exit code and no explanation. Applied `shell: isWindows` to every site that targets a `.cmd` shim:
  - `scripts/quality/quality-package.mjs` — `npm pack` + `npx publint` (also added `pack.error` logging so the next silent failure is self-diagnosing)
  - `scripts/quality/quality-audit.mjs` — `npm audit`
  - `scripts/runtime/doctor-synapse.mjs` — `npm root -g`
  - `scripts/runtime/install-synapse-skill.mjs` — `npm install @huggingface/transformers` (the runtime skill installer path)
  - `scripts/hooks/synapse-pre-tool.cjs` — `synapse memory prime`
  - `scripts/hooks/synapse-post-tool.cjs` — `synapse capture-outcome`
- **`scripts/quality/quality-package.mjs`** was also still spawning bare `'npm'` for the `pack` step (missed in the initial sweep); now uses `NPM_BIN` plus `shell: isWindows`.

#### MCP resource links

- **`file://` URIs now produced via `pathToFileURL(path.resolve(p)).href`.** The previous `` `file://${path.resolve(p)}` `` produced `file://D:\tmp\helper.ts` on Windows, which is not a valid RFC 8089 file URI (backslashes, only two slashes before the drive letter). VS Code tolerates it but other MCP clients reject it. POSIX output is byte-identical to before.

#### Cross-platform test assertions

- `test/mcp-resource-links.test.js` — computes expected `file://` URIs dynamically via `pathToFileURL` instead of hardcoding POSIX.
- `test/bin-shared.test.js` — regex widened from `/bin\/synapse\.js$/` to `/bin[\\/]synapse\.js$/`.
- `test/config.test.js` — `expandHome` test no longer assumes `process.env.HOME` flows through; computes the expected value from `os.homedir()` at runtime.
- `test/release-test-installed-runtime.test.js` — switched from hardcoded forward-slash home paths to `path.join(os.homedir(), …)`.
- `test/update-service.test.js` — `line.includes('synapse install skills …')` and `line.includes('npm --help')` replaced with platform-aware regexes that accept either the bare binary or the `.cmd` shim; strict `command === 'npm'` in fake `commandRunner`s loosened to `String(command).startsWith('npm')`.
- `test/sqlite-vec-extension.test.js` — same strict-equality fix in the fake `installSpawn`.

#### Version constant sync

- **`SERVER_VERSION` in `src/runtime/version.ts`** was stale at `0.3.0-beta.2` even after the `package.json` bump. The constant is not generated from `package.json`, and the `bump:beta` npm script did not touch it. Bumped to match; still a manual process — filed as a follow-up to auto-sync at bump time.

#### Version bump

- **Skill metadata files (`skills/*/.synapse-skill.json`)** bumped from `0.3.0-beta.2` to `0.3.0-beta.4` to satisfy the `bundled skill metadata version matches package version` test.

### Result

`release/0.3.0` now passes the full Quality pipeline on both `ubuntu-latest` and `windows-latest` end-to-end. All 16 steps green on both OSes. Windows is a first-class CI target going forward — any regression will be caught at PR time.

## [0.3.0-beta.3] - 2026-04-15

### Fixed

- **`synapse_find` schema validation** — Tool was returning `{query, count, sources, items}` directly to MCP, which did not match the declared `SEARCH_RESULT_SCHEMA` (PaginatedResult or array). MCP SDK was rejecting every successful response with an output validation error. The handler now wraps results into the canonical PaginatedResult shape and surfaces `query` / per-source counts via `meta`.

### Changed

- **`synapse-pre-tool` hook hardened for agent_prime SOP enforcement** — The hook now tracks a session-scoped "primed" marker. The first work-tool call in an unprimed session emits a strong, formatted `[ACTION REQUIRED]` reminder demanding `mcp__synapse__synapse_agent_prime` be invoked before continuing; the reminder is throttled to once per minute and self-clears the moment `agent_prime` is observed. Once primed, the hook drops back to the existing soft memory-recall context. The installer matcher was extended to `Edit|Write|Bash|MultiEdit|mcp__synapse__.*` so the hook can observe `agent_prime` calls and clear the marker.

## [0.3.0-beta.2] - 2026-04-14

### 🔧 CI/CD & Release Pipeline Fixes

- **Fixed skill metadata version sync** — Skill `.synapse-skill.json` files now stay in sync with `package.json` version
- **Fixed depcheck false positives** — Optional dynamic imports (`@huggingface/transformers`, `tree-sitter-*`) excluded from dependency checks
- **Fixed npm publish auth** — `NODE_AUTH_TOKEN` now correctly passed to the publish step
- **Removed broken npm self-upgrade** — Node 22's bundled npm already supports OIDC provenance
- **Added manual release trigger** — `workflow_dispatch` enables on-demand releases from any branch

## [0.3.0-beta.1] - 2026-04-13

### 🔥 Expert Steering & Modernization Update

This major update transforms Synapse into an **Expert Steering** system for autonomous AI agents.

- **Expert SOP (Standard Operating Procedure)**: Embedded mandatory AI workflow instructions directly into client-native instruction files (`.mdc`, `AGENTS.md`).
- **AI Mentorship Tags**: Enriched all 74 tool descriptions with behavioral tags like `[MANDATORY_START]`, `[DEEP_ANALYSIS]`, and `[COMPLETE_MISSION]` to guide LLM selection logic.
- **Modernized TUI Dashboard**: A premium, interactive terminal interface (`synapse dashboard`) for real-time monitoring of memory, KG, and system health.
- **Smart Skill Installer**: Auto-detects Cursor, Windsurf, Cline, and Antigravity to install the zero-config Synapse Expert skill.

### Added

- `synapse_backup` — Point-in-time SQLite backup via VACUUM INTO with integrity check
- `synapse_restore` — Restore memory database from backup (integrity-verified before replace)
- `synapse backup create/restore/list` — CLI subcommands for backup management
- `actor_id` column on `memory_entries` — attribution axis for multi-agent systems
- `actor_id` filter on `memory_recall` and `memory_list` — exact-match attribution filtering
- `actor_id` field on `agent_prime` CompactMemory items

### Features

- **MCP 2025-06-18 spec compliance** — All 74 tools carry accurate `readOnlyHint`, `destructiveHint`, `idempotentHint` annotations
- **Structured output** — Every tool response includes `structuredContent` + `outputSchema` for typed parsing
- **Resource links** — File-returning tools emit `resource_link` objects (MCP resource protocol)
- **Bi-temporal KG** — `recorded_at` transaction-time axis alongside `valid_from`/`valid_to` on all KG triples
- **WAL mode** — Uniform SQLite production tuning across all 3 databases via shared `applySqliteTuning` helper. Batch insert benchmark: ~115ms for 500 triples
- **Backup/restore** — Atomic point-in-time backups using `VACUUM INTO`; integrity-verified restore with `restart_required` signal
- **Actor-aware memories** — `actor_id` attribution column auto-inferred from `agent_id`; filterable on recall and list

### Changed

- Tool count 72 → 74 (`synapse_backup`, `synapse_restore`)
- Schema version 12 → 13 (`actor_id` column on `memory_entries`)

## [0.2.0] - 2026-04-10

### Added

- `synapse_kg_add_entities_batch` — Batch entity creation (up to 500)
- `synapse_kg_add_triples_batch` — Batch triple creation with dedup
- `synapse_memory_store_batch` — Batch memory storage (up to 100)
- `synapse_agent_prime` — Unified context: memories + entities + files + changes + actions in 1 call
- `synapse_find` — Fused search across memory, code, and KG with RRF ranking
- `synapse_whats_new` — Cross-session delta: new memories, triples, files since timestamp
- `synapse_help` — Just-in-time task-scoped tool guidance
- `synapse_teach` — Durable behavior modifier via feedback memories
- `synapse_audit` — Self-audit dashboard: coverage, density, orphans, stale memories
- `synapse_file_changed` — Proactive memory hints when files are edited
- `synapse_kg_backfill_links` — Retroactive memory-to-KG entity linking
- `synapse_project_backfill` — Scan directory for projects, seed memories
- `synapse_find_callers` — Find all callers of a symbol
- `synapse_find_definition` — Find symbol definition
- `synapse_find_implementations` — Find interface/trait implementations
- `synapse_rename_preview` — Preview all references before renaming

### Features

- **Batch operations** — 300 API calls become 3 with batch write tools
- **Terse responses** — `terse: 'minimal'` on all write tools, 70%+ token reduction
- **Auto-inference** — memory_store needs only {title, content}, everything else inferred
- **Memory-KG fusion** — Memories auto-extract entities and create KG triples
- **Recall enrichment** — Top results include related_facts from 1-hop KG neighbors
- **Predicate cardinality** — Contradiction detection only for functional predicates
- **Symbol-aware code intel** — Regex-first with optional tree-sitter enhancement
- **Proactive hooks** — File-linked memory hints on read/edit
- **Teach memories** — Durable behavior modifiers surfaced through agent_prime
- **Self-audit** — Health score, coverage, density, orphan, stale memory detection
- **SKILL.md slim-down** — From ~360 to 46 lines
- **Cross-project bridges** — Insight generation for entities spanning multiple nests

## [0.1.0] - 2026-04-09

### Added

- Full TypeScript migration — 96 .ts files, 0 .js remaining in src/
- Shared CLI modules (src/cli/ansi.ts, src/cli/output.ts) eliminating 5x code duplication
- ora spinners for async CLI operations (onboard, selftest, hooks)
- Dynamic tool count in help/dashboard (no more hardcoded values)
- Embedding LRU cache (256 entries, SHA-256 keyed) for faster recall
- 3 composite SQLite indexes for KG and memory queries
- PRAGMA optimize for SQLite query planner statistics
- Async vector index persistence with write coalescing
- Batch embedding queries in dedup and relations
- TypeScript build infrastructure (tsconfig.json, tsc build, tsx runtime)
- tree-sitter ambient type declarations
- nest:* agentic orchestration commands (11 slash commands)

### Changed

- All src/ files migrated from JavaScript to TypeScript
- CLI error output unified via writeError() across all commands
- Help screen modernized with version banner and examples section
- Graph CTE cycle detection optimized (INSTR vs LIKE)
- MCP SDK updated to 1.29.0, ora to 9.3.0
- Bin shebangs updated to use tsx/esm loader
- Test runner switched from node --test to tsx --test

### Fixed

- KG tool null rejection on valid_from/valid_to/source_memory_id
- Dashboard UI duplication from concurrent refresh race condition
- Skill installer slash command sync when skill is up-to-date
- Duplicate log message in skill installer
- Redundant schema index creation

## [0.0.7-beta.3] - 2026-04-09

### Fixed

- Fixed `.nullable()` missing on `valid_from`, `valid_to`, and `source_memory_id` in `kg_add_triple` and `kg_invalidate` — AI clients sending null now accepted.
- Removed redundant index creation in `schema.js` already handled by migrations.

### Changed

- Skill installer now syncs slash commands even when skill is already up-to-date, auto-installs Claude Code hooks, and fixes duplicate log message on noop.

## [0.0.7-beta.2] - 2026-04-08

### Interactive CLI

- **TUI Dashboard** (`synapse dashboard`): Live-refreshing terminal dashboard with keyboard navigation. Memory stats, KG overview, nest distribution with progress bars, recent memories timeline, server status. Auto-refreshes every 5s. Keys: 1=Memory, 2=KG, 3=Recent, r=Refresh, q=Quit.
- **Onboarding Wizard** (`synapse onboard`): Guided first-run experience that auto-detects environment (Node, ripgrep, AI clients), runs setup, installs skills to all detected clients, installs Claude Code hooks, and runs doctor — all in one command.
- **Self-Test** (`synapse selftest`): End-to-end pipeline validation testing runtime, memory CRUD, knowledge graph, taxonomy, dedup, embeddings, search, skills, and hooks. Reports pass/warn/fail with colored output.
- **Redesigned CLI help**: Box-drawn header with MCP badge, category icons (●◆◇▸⚡), separator lines, quick start guide, and docs URL footer.

### Claude Code Integration

- **10 slash commands**: `/synapse:recall`, `/synapse:remember`, `/synapse:fact`, `/synapse:search`, `/synapse:status`, `/synapse:context`, `/synapse:ingest`, `/synapse:dashboard`, `/synapse:selftest`, `/synapse:onboard`. Auto-installed to `~/.claude/commands/synapse/` via `synapse skill install`.
- **Pre-tool hook**: Auto-retrieves relevant memories before Edit/Write/Bash tools (30s debounce).
- **Post-tool hook**: Auto-captures outcomes after Edit/Write/Bash tools (60s debounce) + writes agent diary entries.
- **Hook installer**: `synapse hooks install` wires hooks into `~/.claude/settings.json`.
- **Auto skill sync**: `postinstall` npm hook auto-syncs skills on `npm install -g`.

### Bug Fixes

- Fixed nested transaction deadlock — adapter supports re-entrant calls via SQLite SAVEPOINT.
- Fixed path traversal in MCP ingest tools — content-only, no file_path from MCP clients.
- Fixed LIKE cycle detection in graph traversal — delimiter-bounded matching prevents false substring matches.
- Fixed CI audit gate — transitive-only vulnerabilities no longer block pipeline.
- Fixed zod `z.unknown()` compatibility with MCP SDK — use `z.any()` instead.

### Dependencies

- Bumped `@huggingface/transformers` from 3.8.1 to 4.0.1.

## [0.0.7-beta.1] - 2026-04-08

### Security & Code Quality

- **Nested transaction safety**: `adapter.transaction()` now supports re-entrant calls via SQLite SAVEPOINT — prevents deadlock when `storeEntry`/`updateEntry`/`deleteEntry` are called within a transaction context.
- **Path traversal prevention**: MCP ingest tools (`synapse_ingest_markdown`, `synapse_ingest_json`) no longer accept `file_path` — content is passed directly, CLI handles file reading.
- **Graph traversal cycle detection fix**: LIKE-based cycle prevention now uses delimiter-bounded matching to prevent false substring matches (e.g., `foo` vs `foobar`).
- **Shared CLI flag parser**: Extracted `parseFlags` to `src/cli/parse-flags.js` — eliminates 5x copy-paste across CLI command modules.
- **Audit tolerance for transitive vulnerabilities**: `quality:audit` now only blocks on direct dependency critical/high vulnerabilities, not transitive ones from upstream SDK chains.

### Dependencies

- Bumped `@huggingface/transformers` from 3.8.1 to 4.0.1 (no breaking changes — `pipeline`, `env`, `AutoTokenizer`, `AutoModelForSequenceClassification` APIs unchanged).

### Knowledge Graph

- **Temporal knowledge graph** with entities and subject-predicate-object triples (`kg_entities`, `kg_triples` tables, schema v6).
- **Temporal validity** on all triples: `valid_from`/`valid_to` columns, point-in-time `as_of` queries, chronological timeline view, and KG statistics.
- **Multi-hop graph traversal** via SQLite recursive CTEs with cycle prevention (configurable 1-5 hops). No other local-first memory system offers this.
- **Contradiction detection** at write time: warns when a new triple conflicts with an existing valid triple on the same subject+predicate. Never blocks, just flags.
- **Cross-nest bridge discovery**: find entities connected across different memory domains.
- Entity auto-creation on first triple reference with normalized slug IDs.
- Triple provenance tracking via `source_memory_id` linking back to originating memory entries.

### Memory Organization

- **Nest/Branch hierarchy**: two-level memory taxonomy using Synapse's own organic metaphor (not copied from any competitor). Nests are top-level domains, branches are topics within nests.
- **Metadata-filtered recall**: memory recall filters by nest and/or branch for more precise retrieval.
- Taxonomy tools: list nests, list branches within a nest, get full taxonomy tree with counts.

### Agent Isolation

- **Agent-scoped memory**: `agent_id` column on memory entries for per-agent isolation (schema v8).
- **Private diary**: separate `agent_diary` table for agent scratchpad entries not visible to other agents.
- **Scoped recall**: agents see own memories + global memories, never other agents' private data.

### Semantic Dedup

- **Embedding similarity gate** on all memory writes (default 0.92 cosine threshold, configurable).
- Dedup runs automatically on `memory_store` and `memory_capture_event` operations.
- Explicit `check_duplicate` tool for pre-filing checks with match details.

### Conversation Ingestion

- **Markdown and JSON conversation import**: parse chat exports into per-turn memory entries with automatic nest/branch assignment.
- **Rule-based entity extraction**: creates knowledge graph triples from conversation content without LLM dependency.
- **Re-ingestion protection**: tracks ingested files by path + SHA-256 hash (schema v9, `conversation_sources` table).

### Hooks System

- **Pre/post operation hooks** for memory, KG, graph traversal, diary, ingestion, and dedup operations.
- Support for cancel, payload transform, one-time listeners, and catch-all wildcards (`before:*`, `after:*`).
- Two new MCP tools: `synapse_hooks_stats` and `synapse_hooks_list_events` for hook introspection.

### CLI-First Architecture

- **Unified noun-verb CLI**: `synapse <noun> <verb>` subcommand pattern with zero new dependencies (hand-rolled, not Commander.js).
- **Memory CLI**: `synapse memory add|search|list|show|delete` with full flag support.
- **Knowledge Graph CLI**: `synapse kg add|query|timeline|stats` for terminal-based KG operations.
- **Skill CLI**: `synapse skill install|list|remove` with multi-client detection.
- **MCP Lifecycle CLI**: `synapse mcp start|status|config` for server management.
- **Ingest CLI**: `synapse ingest <file>` with auto-format detection (Markdown/JSON).
- **Global flags**: `--json`, `--verbose`, `--quiet`, `--config` work on all commands.
- **Colored help**: organized by command categories (Core, Memory, KG, Skills, Diagnostics).
- **Shell completions**: `synapse completion bash|zsh|fish` for tab completion.
- **Legacy deprecation**: old `synapse-*` binaries now show yellow deprecation warnings and redirect to canonical commands.

### Migration Safety

- **Per-version transaction wrapping**: each schema migration runs inside its own SQLite transaction with immediate version stamping. Failure mid-migration rolls back cleanly.
- Schema versions: v5 (existing) through v9 (conversation sources), all additive and backward-compatible.

### MCP Tools

- **17 new MCP tools** registered (52 total):
  - 7 knowledge graph tools (`synapse_kg_*`)
  - 3 nest/branch tools (`synapse_nest_*`)
  - 2 graph traversal tools (`synapse_graph_*`)
  - 2 agent diary tools (`synapse_diary_*`)
  - 2 conversation ingestion tools (`synapse_ingest_*`)
  - 1 duplicate check tool (`synapse_memory_check_duplicate`)
  - 2 hook introspection tools (`synapse_hooks_*`)

### Documentation

- **Competitive comparison table** in README vs MemPalace, Zep, Graphiti, Mem0.
- Updated skill files (SKILL.md, tool-reference.md) with all 52 tool workflows.
- Expanded Memory section with KG, hierarchy, hooks, dedup, and ingestion details.

### New Files

- `src/services/memory/kg.js` — Knowledge graph entity and triple CRUD
- `src/services/memory/graph.js` — Recursive CTE traversal and bridge discovery
- `src/services/memory/taxonomy.js` — Nest/branch hierarchy helpers
- `src/services/memory/scopes.js` — Agent diary CRUD and scope isolation
- `src/services/memory/dedup.js` — Embedding similarity gate
- `src/services/memory/ingest.js` — Conversation parsing and ingestion pipeline
- `src/services/memory/hooks.js` — Pre/post operation hook system
- `src/mcp/tools/graph-tools.js` — MCP tool registration for all new features
- `src/cli/options.js` — Global CLI flag parser
- `src/cli/help.js` — Colored help renderer
- `src/cli/router.js` — Noun-verb subcommand dispatcher
- `src/cli/commands/memory.js` — Memory CLI implementation
- `src/cli/commands/kg.js` — Knowledge Graph CLI implementation
- `src/cli/commands/skill.js` — Skill management CLI
- `src/cli/commands/mcp.js` — MCP lifecycle CLI
- `src/cli/commands/ingest.js` — Conversation ingestion CLI
- `src/cli/commands/completion.js` — Shell completion generators

## [0.0.6-beta.1] - 2026-03-12

### CLI

- Added canonical `synapse task-context` and `synapse capture-outcome` commands for memory workflow automation.
- Soft-deprecated legacy helper binaries by turning `synapse-setup`, `synapse-doctor`, `synapse-upgrade`, `synapse-install-skill`, `synapse-task-context`, and `synapse-capture-outcome` into warning-forwarding compatibility wrappers.
- Kept the `synapse` MCP server binary unchanged so existing client configs continue to start the server without migration.

### Docs & Guidance

- Updated CLI help, runtime guidance, and README examples to prefer canonical `synapse ...` commands while documenting the compatibility aliases.
- Added beta release notes and version-matrix entries for `0.0.6-beta.1`.

### Release Tooling

- Bumped bundled skill metadata to the beta package version so packaged installs stay version-aligned.
- Removed stale hardcoded `0.0.5` defaults from release-prep helpers by aligning version output with the active package version.

## [0.0.5] - 2026-03-11

### Stable Release

- Promoted the `0.0.4-beta.9` runtime and packaging fixes into the stable `0.0.5` line.
- Fixed the installed-runtime release harness to derive Synapse paths from the active user home instead of a machine-specific path.
- Hardened installed-runtime validation with an MCP stdio handshake regression test and release-sweep coverage.
- Switched upgrade skill-sync flow to the primary `synapse install skills --force` command while keeping the legacy alias available.

## [0.0.4-beta.9] - 2026-03-10

### Runtime Fixes

- Fixed bundled skill version reporting so `synapse-install-skill` now reports the actual package version instead of stale metadata.
- Made the skill installer treat `package.json` as the version source of truth, preventing future drift between the package version and bundled skill metadata.

### Quality

- Added regression coverage to ensure bundled skill metadata stays aligned with the package version.

## [0.0.4-beta.8] - 2026-03-10

### Runtime Fixes

- Fixed MCP startup regressions introduced after `0.0.4-beta.6` where `create-services` and `register-tools` imported `SERVER_NAME` / `SERVER_VERSION` from the wrong module.
- Removed the blocking startup update warm-check from the stdio MCP server path so early tool calls no longer stall on synchronous npm version checks.
- Made sqlite-vec index status degrade safely when the database is locked instead of hanging or crashing MCP status tools.
- Updated the installed-runtime release sweep to use isolated temporary index storage, avoiding contention with the user's active Synapse database during validation.

### Quality

- Added import regression coverage for the app startup modules.
- Added sqlite-vec status regression coverage for locked-database handling.

## [0.0.4-beta.7] - 2026-03-10

### Runtime

- Introduced a dedicated `sqlite-vec` extension resolver (`src/runtime/sqlite-vec-extension.js`) that automatically locates the `vec0` native binary at startup — searches global npm root, the synapse vendor directory, `PATH`, and `node_modules` with cross-platform binary name resolution (`.so` / `.dylib` / `.dll`).
- Added `SYNAPSE_SQLITE_VEC_EXTENSION` env var for explicit extension path override; auto-detection is skipped when it is set.
- Extension source is now reported in `synapse_server_status` so operators can confirm how the extension was found.
- Setup wizard (`synapse setup`) gained `--sqlite-vec-extension` and `--skip-sqlite-vec-install` flags and a comprehensive `--help` / `-h` output covering all options.
- Doctor (`synapse doctor`) gained an explicit vec0 availability check.

### CLI

- `synapse-task-context` and `synapse-capture-outcome` now support `--help` / `-h` with full usage documentation printed to stdout.
- `synapse-capture-outcome` now accepts a `--tags` CSV argument for tagging captured events at the CLI level.

### Security & Dependencies

- Updated `express-rate-limit` and `ip-address` to patched versions.
- Switched the local embedding and reranking runtime from `@xenova/transformers` to `@huggingface/transformers`.
- Added published `npm-shrinkwrap.json` coverage so npm-distributed installs carry the intended transitive dependency graph.

### Install Behavior

- Removed the earlier `prebuild-install@7.1.3` warning path from the default install graph by moving off the older Xenova runtime chain.
- Current `0.0.4-beta.8` installs may still show a single upstream deprecation warning for `boolean@3.2.0` through `onnxruntime-node -> global-agent`; runtime behavior is unchanged.

### Quality

- Added test coverage for `sqlite-vec` extension detection, bin shared helpers, config parsing, skill install, and server status builder.
- Resolved lint regressions in release scripts and workspace helpers.

### Docs & Developer Experience

- Rewrote README with clearer information hierarchy, a new "Why Synapse?" section, engaging copy, and a correct full MCP JSON config block.
- Added `guides/architecture.md` — architecture overview with system, search, and memory pipeline diagrams for contributors.
- Added `.github/workflows/release.yml` — automatic GitHub pre-release on merge to `beta`, full release on merge to `main`, tagged by package version.

## [0.0.4-beta.6] - 2026-03-09

### Release Hardening
- Normalized MCP response contracts through shared wrapper-level helpers and tightened regression coverage for tool outputs.
- Improved retrieval miss guidance, explicit `read_file` path errors, and installed-runtime release harness checks so release sweeps require meaningful evidence.
- Hardened runtime environment handling around cache diagnostics, MCP background sweep behavior, and update workflow metadata.

### Product and UX
- Added `synapse_health` and richer `synapse_server_status` diagnostics for faster client-side troubleshooting.
- Updated end-user docs for current beta setup, release selection, installed-runtime validation, and supported auto-configured MCP clients.

### Internal Structure
- Reorganized the codebase into clearer `src/app`, `src/runtime`, `src/mcp`, and domain-scoped `src/services/*` modules.
- Grouped scripts by operational concern (`runtime`, `memory`, `release`, `quality`) and simplified bin entrypoints with shared helpers.

## [0.0.4-beta.5] - 2026-03-06

### Upgrade Notes
- Use `synapse upgrade` as the canonical upgrade command.
- `synapse update` is removed in this version.
- If this is the first run on a machine/user account, run:
  - `synapse setup`
  - `synapse doctor --verbose`

### Model Download and Cache
- Setup now warms embedding and reranker models on first run.
- `doctor` now checks whether model cache is writable for the current user.
- When default cache is not writable, Synapse now auto-falls back to a user-specific temp cache directory.
- If cache path is not writable, set:
  - `SYNAPSE_EMBED_CACHE_DIR`
  - `SYNAPSE_RERANKER_CACHE_DIR`
- For offline or restricted environments:
  - `synapse setup --skip-model-download=true`

### User-Visible Changes
- Cleaner upgrade validation and clearer upgrade error messages.
- Faster search behavior (ripgrep context parsing and fallback line matching).
- Docs updated and aligned to `0.0.4-beta.5` across release pages and install guidance.

### Breaking/Removed
- Removed deprecated `synapse update` alias.
- Removed experimental backup sync CLI and Google Drive integration.

## [0.0.4-beta.4] - 2026-03-03

### Added
- `synapse --version` CLI output for quick runtime/package verification.
- Automatic npm update checks with local cache/backoff via new `UpdateService`.
- New MCP tools:
  - `synapse_task_context` (runtime + memory status + recall bundle for substantive tasks)
  - `synapse_memory_status` (memory consent, backend compatibility, and database/store status)
  - `synapse_memory_list` (list stored memories with pagination/filtering)
  - `synapse_memory_get` (fetch one memory with revision history)
  - `synapse_memory_store` (manual durable memory write)
  - `synapse_memory_update` (update memory and append a revision)
  - `synapse_memory_delete` (delete a memory and its revisions)
  - `synapse_memory_recall` (recall relevant memories for a task/query)
  - `synapse_capture_outcome` (simple outcome capture into the memory event pipeline)
  - `synapse_memory_capture_event` (background event ingest with automatic promotion for high-signal events)
  - `synapse_memory_events` (inspect recent capture events and promotion outcomes)
  - `synapse_update_status` (cached npm version check with optional force refresh)
  - `synapse_update_self` (approved self-update + bundled skill sync, with dry-run support)
- New CLI wrappers for deterministic hook usage:
  - `synapse-task-context`
  - `synapse-capture-outcome`
- Local memory subsystem:
  - SQLite-backed canonical memory store with revisions, scoped metadata, recall counters, and dedupe fingerprinting
  - background capture event log with promotion/ignore decisions
  - Node 22+ `node:sqlite` support for production memory storage
- New runtime env settings:
  - `SYNAPSE_MEMORY_ENABLED`
  - `SYNAPSE_MEMORY_BACKEND`
  - `SYNAPSE_MEMORY_DB_PATH`
  - `SYNAPSE_MEMORY_AUTO_CAPTURE`
  - `SYNAPSE_MEMORY_CONSENT_DONE`
  - `SYNAPSE_UPDATE_PACKAGE`
  - `SYNAPSE_UPDATE_CHECK_INTERVAL_MINUTES`
  - `SYNAPSE_UPDATE_FAILURE_BACKOFF_MINUTES`
- OpenSSF Scorecard GitHub Actions workflow (`.github/workflows/scorecards.yml`) with SARIF upload to code scanning.
- GitHub CodeQL workflow (`.github/workflows/codeql.yml`) for static security analysis.
- Dependabot configuration (`.github/dependabot.yml`) for npm and GitHub Actions dependency updates.
- Additional automated tests for:
  - memory store lifecycle (create/list/update/recall/delete)
  - memory dedupe behavior
  - memory event promotion vs ignored-event behavior
  - config/runtime memory settings and migration coverage
  - hybrid search ranking mode metadata
  - sqlite backend status reporting when no native extension is configured
  - update interval clamping in runtime config
  - self-update dry-run behavior
  - install failure and skill-sync failure branches
- `npm run stress:synapse` synthetic stress runner for search + memory behavior checks.

### Changed
- Package/runtime version bumped to `0.0.4-beta.4`.
- Bundled skill install now checks installed skill metadata and only resyncs when the installed skill is missing, outdated, or `--force` is used.
- `synapse-setup` now asks for one-time user consent before enabling local memory and persists memory config into `synapse.config.json` and generated MCP snippets.
- README, bundled `SKILL.md`, and OpenAI agent manifest now document retrieval + memory flow, including pre-task recall and post-task capture guidance.
- Memory guidance now prefers the higher-level task-context and capture-outcome flow over hand-orchestrating low-level recall/capture tools.
- `synapse_search_hybrid` now reports `ranking_mode` so callers can tell whether results are hybrid, semantic-only, lexical-only, or empty.
- Memory recall responses now expose normalized `score` plus `raw_score` for easier interpretation.
- sqlite backend status now reports extension state precisely (`not-configured`, `not-attempted`, `loaded`, `load-failed`) instead of implying failure when no extension path is set.
- `synapse_server_status` now includes structured `updates` metadata so agents can prompt users proactively when a newer version is available.
- `synapse_usage_guide` and bundled `SKILL.md` expanded with explicit update flow, memory workflow guidance, and stronger evidence-first retrieval guidance.

## [0.0.3] - 2026-02-27

### Changed
- Promoted `0.0.2-beta.3` to the first stable release line as `0.0.3`.
- Updated package/runtime version references for stable (`package.json`, `package-lock.json`, `src/config.js`).
- Canonical tool names only: stable release exposes `synapse_*` tools without short aliases to avoid duplicate tool lists in MCP clients.

## [0.0.2-beta.3] - 2026-02-26

### Added
- **Shared tokenizer** (`src/services/tokenizer.js`): camelCase/PascalCase splitting (`getUserById` → `get`, `user`, `by`, `id`), digit-boundary splitting (`react18` → `react`, `18`), kebab-case splitting (`react-query` → `react`, `query`), compound alias tokens for exact-match bonus, and code stopword filtering. Both index backends now use this shared module.
- **Inverted index** (`term_index` table in SQLite): replaces the O(N) `LIKE '%"term"%'` full-table scan in semantic search with an indexed `term IN (...)` lookup. 100x+ faster at scale.
- **`use_regex` param on `synapse_search_code`**: pass `use_regex=true` to treat the query as a ripgrep-compatible regex (e.g. `async\s+function\s+get\w+`). Defaults to `false` (fixed-string, existing behavior). Invalid regex is rejected before reaching `rg`.
- **`context_lines` param on `synapse_search_code`** (0–10, default 0): each match result includes `context_before` and `context_after` arrays, reducing follow-up `synapse_read_file` round-trips by ~60%.
- **`failed_files` in `index_project` response**: both index backends now return `failed_files: [{path, error}]` for files that could not be read (oversized, permission-denied, binary). The rest of the index commits successfully.
- **`semantic_score_raw`** field on hybrid results: preserves the actual TF-IDF cosine score alongside the rank-based `semantic_score` used in RRF, enabling agents to filter by real relevance.
- **Quality pipeline**: ESLint flat config, madge (circular dependency check), depcheck, publint, and `npm run quality` orchestrator. GitHub Actions `quality.yml` CI workflow on push/PR.

### Changed
- **SQLite index schema version bumped to 2**: on first run after upgrade, stale v1 index data is automatically cleared. Run `synapse_index_project` once after upgrading to rebuild.
- **`refreshChunkNorms` optimised**: full table scan only fires when `changedTerms > 500`. Incremental updates (single file changed) now use a targeted term-indexed lookup — 10–100x faster for common case.
- **`synapse_search_hybrid` over-fetch** simplified: `Math.max(maxResults * 3, maxResults)` → `maxResults * 3` (redundant max removed).
- `startup_timeout_sec: 30` added to MCP client config snippets generated by setup wizard.
- Bin paths in `package.json` use relative form without leading `./` for npm compatibility.
- SKILL.md updated: `context_lines`/`use_regex` reference, glob fix note (`**/*.ts` not `*.ts`), ripgrep-optional section, schema migration troubleshooting, and `context_before`/`context_after` usage pattern.

### Fixed
- **Ripgrep no longer required at startup**: `main()` previously threw a fatal error when `rg` was not found, preventing the server from starting on NixOS, Alpine, or restricted environments. Now emits a stderr warning and falls back to the existing JS filesystem walker. `has_ripgrep: false` is surfaced in `synapse_server_status`.
- **Large-file error no longer aborts entire index run**: previously, a single unreadable file (e.g. minified bundle, SQL dump) would rollback the whole `indexProject` transaction. Each file is now processed in its own transaction with per-file error isolation.
- LIKE pattern quote fix: template literal `%"term"%` patterns no longer use unnecessary escape sequences.
- `response_format` stripping: replaced rest-destructure with explicit `delete` to avoid ES strict-mode issues in some runtimes.

## [0.0.2-beta.2] - 2026-02-25

### Added
- Added canonical MCP tool names with `synapse_*` prefix while keeping legacy aliases for backward compatibility.
- Added MCP tool annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) across exposed tools.
- Added `response_format` support (`json`/`markdown`) to tool responses.
- Added pagination metadata for list-style tools (`total_count`, `count`, `limit`, `offset`, `has_more`, `next_offset`, `items`).
- Added bundled skill distribution in package under `skills/synapse`.
- Added new command: `synapse-install-skill`.
- Added automatic bundled skill install on package install (`postinstall`) with opt-out `SYNAPSE_SKIP_SKILL_INSTALL=true`.
- Added comprehensive test suite for config, migrator, search, workspace, vector index, and sqlite index flows.

### Changed
- README rewritten with clearer global-first installation flow, setup/doctor guidance, troubleshooting, and release checklist.
- Setup wizard now prints a ready-to-paste global `mcpServers.synapse` JSON block directly after completion.
- Usage guide output now references canonical `synapse_*` tools.
- Release version updated to `0.0.2-beta.2` in package and runtime server status.

### Fixed
- Fixed hybrid retrieval merge so overlapping lexical + semantic hits are fused into hybrid results.
- Fixed cross-platform sqlite base-path matching for both slash and backslash descendants.
- Reworked sqlite index updates to incremental DF/norm refresh for better scalability.
- Added semantic SQL prefiltering to reduce query scan scope.
- Replaced sqlite transaction helper usage with explicit `BEGIN/COMMIT/ROLLBACK` for runtime compatibility.
- Improved oversized file handling in `read_file`: keep cap guard but return streamed line-window content with warning metadata instead of hard failure.

## [0.0.1-beta] - 2026-02-24

### Added
- Single-package Node.js layout at repository root (no `node-mcp/` subfolder).
- `synapse-doctor` command for environment and config diagnostics.
- Phase 1 local semantic indexing service (`synapse.index.json`) with chunked TF-IDF-style retrieval.
- New MCP tools:
  - `index_status`
  - `index_project`
  - `search_hybrid`
- Added pluggable index backend architecture with `sqlite-vec` (default) and `json` fallback.
- Added automatic config migration on startup with backup creation for safe upgrades.
- Release scripts for maintainable npm publishing:
  - `release:beta`
  - `release:latest`
  - `bump:beta`

### Changed
- Setup wizard now validates Node, npx, and ripgrep before writing config.
- Setup wizard now generates `npx.cmd` on Windows and `npx` on Linux/macOS.
- Setup wizard now asks users to choose index backend and persists indexing settings in generated config.
- Server now fails fast when ripgrep is missing.
- Package metadata updated for beta publishing from the root package.

### Fixed
- Resolved confusion around monorepo path by making root the npm package path.
