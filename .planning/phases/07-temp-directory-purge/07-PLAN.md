---
phase: 07
title: Temporary Directory Purge
---

# Plan: Temporary Directory Purge

## Objective
Safely discard outdated temporary testing directories.

## Requirements
- Target `scratch/` which was used for scratchpad `.mjs` scripts (already tested and tracked).
- Target `graphify-out/` since Graphify artifacts can be regenerated any time on-demand and just clutter the repo.

## Success Criteria
- Root folder is devoid of `scratch/` and `graphify-out/`.
