# Architecture Decisions Log

This document records significant architectural decisions, the reasoning behind them, and their tradeoffs.

## [2026-05-24] Graceful Degradation & Setup Experience (Phase 1)
**Decision:** `ripgrep`, `sqlite-vec`, and `@huggingface/transformers` are now optional dependencies. The system will automatically degrade gracefully if they are missing.
**Reason:** The setup process was a massive drop-off funnel. Installation failures (like EAI_AGAIN on nuget.org or missing compiler toolchains for sqlite-vec) completely blocked users from experiencing the core value (Memory & KG).
**Implementation:**
- If `ripgrep` is missing: Memory and KG still work fully. Lexical code search is disabled or falls back to a slower Node-based scan. `synapse doctor` marks this as a WARNING, not a FAILURE.
- If `sqlite-vec` or `transformers` are missing: Semantic search and reranking are disabled. The system falls back to the `json` index backend and BM25 search. `synapse doctor` marks this as INFO/WARNING, not a FAILURE.
**Tradeoff:** Users in "Lite Mode" get a degraded code search experience, but they actually get to *use* the memory and graph features instead of abandoning the tool entirely.

## [2026-05-24] Memory Conflict Resolution Strategy (Phase 2)
**Decision:** Adopted **Option A (Last-Write-Wins with Invalidation)** for standard memory entries.
**Reason:** Resolving contradictions silently via append-only logs degraded AI performance over time (as both old and new facts were surfaced). Explicitly asking the user to resolve every conflict introduces unacceptable friction during rapid task execution.
**Implementation:** 
- When a new memory is stored, a semantic similarity check identifies highly similar entries (`cosine_similarity >= 0.85` and `< 0.92`).
- The older, conflicting entry is marked with `status = 'invalidated'` and `invalidated_at = now()`.
- The `recall` function filters out invalidated entries (using `invalidated_at IS NULL`).
- Both the new and the old invalidated facts remain in the database to support historical queries.
**Tradeoff:** Relying purely on semantic similarity thresholds (0.85) without a deep LLM contradiction analysis means some entries might be incorrectly invalidated if they are semantically close but conceptually additive. If false positives occur, this threshold will need calibration or we may need to fall back to LLM-based contradiction detection for high-stakes entries.

## [2026-05-24] Schema Migration Resilience (Phase 4)
**Decision:** Implement auto-backup and rollback logic within the schema migration runner.
**Reason:** Mid-migration crashes (e.g. process killed, power loss) left SQLite databases in an inconsistent state, causing data loss upon restart. A robust developer tool must never lose user data during an upgrade.
**Implementation:**
- The `runMigrations` engine creates a copy of the SQLite database (`.vX.backup`) before executing a migration block.
- Migrations are run inside an SQLite `transaction`.
- If an unhandled exception occurs, the runner catches the error, restores the original database from the backup, and aborts startup to preserve data integrity.
- `synapse doctor` now explicitly reads and reports the `schema_version`.
**Tradeoff:** Creating a full backup copy for each migration step temporarily consumes 2x disk space during the upgrade process, which could be noticeable for multi-gigabyte knowledge graphs. Given the typical size of text-based DBs, data safety outweighs disk usage.

## [2026-05-24] Error Message Quality & First-Run UX (Phase 6)
**Decision:** Establish a strict error reporting standard and guided welcome experience.
**Reason:** Cryptic stack traces and "silent" first-run failures are the primary cause of user churn in developer tools. Users need to know exactly why a failure occurred and how to fix it without reading the source code.
**Implementation:**
- **Standardized Errors:** Introduced the `SynapseError` class. Every critical error now reports: `Component`, `What happened`, `Why`, and `Fix`.
- **First-Run Welcome:** If `synapse start` is run without a configuration file, it emits a stylized box containing an MCP configuration snippet for easy copy-pasting into Cursor/Claude Desktop.
- **Introspection:** Added the `synapse status` command to provide a quick health and data volume snapshot.
**Tradeoff:** Standardizing error messages is a large-scale refactoring task. I've implemented the framework and updated core CLI entrypoints; individual services will be migrated to the new standard incrementally.
