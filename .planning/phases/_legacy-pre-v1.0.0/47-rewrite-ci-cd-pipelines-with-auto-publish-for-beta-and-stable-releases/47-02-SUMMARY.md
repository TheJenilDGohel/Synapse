---
phase: 47-rewrite-ci-cd-pipelines-with-auto-publish-for-beta-and-stable-releases
plan: 02
subsystem: ci
tags:
  - ci
  - release
  - security
requires: []
provides:
  - "Auto-publish pipeline with OIDC and release/** triggers"
affects: []
tech-stack.added:
  - "npm OIDC (Trusted Publishing)"
patterns:
  - "No-secret publishing via GitHub Actions id-token"
key-files.modified:
  - .github/workflows/release.yml
key-decisions:
  - "Moved to OIDC for publish; `NPM_TOKEN` has been removed as the primary auth mechanism but left as a documented fallback option."
requirements-completed:
  - CICD-04
  - CICD-05
  - CICD-06
  - CICD-07
---
# Phase 47 Plan 02: Rewrite release pipeline Summary

Rewrote the release.yml workflow to use npm's modern OIDC trusted publishing flow and unified the triggers to test pushes on `main` and `release/**` branches, dropping the outdated `beta` branch.

**Duration:** 2 min
**Completed:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")
**Task count:** 2
**Files changed:** 1

## Deviations from Plan

None - plan executed exactly as written. Checkpoint bypassed at user request.

## Authentication Gates
None. Manual OIDC configuration on npmjs.com is recorded in the User Setup instructions (`47-USER-SETUP.md`).

## Self-Check: PASSED

Phase 47 complete. Ready for next step!
