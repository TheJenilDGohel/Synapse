---
phase: 06
title: Root Namespace Cleanup
---

# Plan: Root Namespace Cleanup

## Objective
Consolidate configuration files, scripts, and loose files at the root directory into centralized folders to declutter the root. Assess redundant AI configuration files to simplify the identity.

## Requirements
- Move loose operational scripts (e.g. `fetch-issues.js`) into `scripts/`.
- Verify the true function of `.claude.md`, `CLAUDE.md`, and `SKILL.md`. As part of Antigravity GSD workflow, `SKILL.md` is the primary AI interface context file. We should consolidate `.claude.md` and `CLAUDE.md` to avoid repetition.
- Check `.opencode` and `.windsurf` and ensure `.gitignore` captures them properly. We do not need to delete them if they are user-specific editor config, just ensure they are ignored and unobtrusive.
- Rename or merge `synapse-docs` into `docs/` for standards if applicable.

## Files to Modify/Move
1. `fetch-issues.js` -> `scripts/fetch-issues.js`
2. `CLAUDE.md`, `.claude.md` -> Append useful contents to `SKILL.md` (or standard `CLAUDE.md` if retained) and delete duplicates.
3. `synapse-docs/` -> Move to `docs/`.
4. Update `package.json` to reflect `scripts/fetch-issues.js` if it's referenced in scripts.

## Success Criteria
- Root folder has immediately less visual clutter.
- No duplicate contexts.
- No broken NPM script endpoints.
