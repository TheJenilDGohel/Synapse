---
phase: 47-rewrite-ci-cd-pipelines-with-auto-publish-for-beta-and-stable-releases
plan: 01
subsystem: ci
tags:
  - ci
  - github-actions
requires: []
provides:
  - "Optimized quality pipeline with release/** branch triggers"
  - "CodeQL scanning with release/** branch triggers"
affects: []
tech-stack.added: []
patterns:
  - "Skip postinstall step for pure linting/typechecking via --ignore-scripts"
key-files.modified:
  - .github/workflows/quality.yml
  - .github/workflows/codeql.yml
key-decisions:
  - "Broke the quality pipeline into individual steps after removing the unifying `npm run quality` command to manage install variations securely."
requirements-completed:
  - CICD-01
  - CICD-02
  - CICD-03
---
# Phase 47 Plan 01: Rewrite CI/CD Pipelines Summary

Rewrote quality.yml to skip costly postinstall for lint/check jobs and updated pipeline triggers (quality and CodeQL) to test PRs against main and releases rather than the old beta branch.

**Duration:** 1 min
**Completed:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")
**Task count:** 2
**Files changed:** 2

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

Ready for the next plan.
