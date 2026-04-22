---
phase: 06
title: Root Namespace Cleanup
requirements_completed: []
---

# Phase 6: Root Namespace Cleanup

**One-liner**: Consolidate root scripts and docs, and merge duplicate AI configurations.
**Status**: in_progress

- Consolidated loose `fetch-issues.js` and `synapse-docs` into `scripts/` and `docs/` respectively.
- Assessed `CLAUDE.md`, `SKILL.md`, and `.claude.md`. Deleted redundant `.claude.md`.
- Appended `.opencode/` and `.windsurf/` to `.gitignore` to prevent tracking of IDE state without explicitly deleting them.
- Cleaned the root UI workspace and verified scripts.
