# Phase 47: Rewrite CI/CD Pipelines with Auto-Publish for Beta and Stable Releases - Research

**Researched:** 2026-04-14
**Domain:** GitHub Actions CI/CD, npm publishing, release automation
**Confidence:** HIGH

## Summary

This phase replaces the existing 5 GitHub Actions workflows with a clean, from-scratch CI/CD pipeline designed for the synapse-mcp package's two-track release model: beta releases from `release/*` branches and stable releases from `main`. The current workflows are functional but have critical gaps -- the release workflow only triggers on `main` and `beta` branches (not `release/*`), uses a `beta` branch that is stale/divergent from the actual `release/*` branching model, and still references the now-deprecated NPM_TOKEN secret approach (npm classic tokens were permanently revoked December 2025).

The key technical challenges are: (1) migrating from NPM_TOKEN to OIDC trusted publishing or granular access tokens, (2) handling the @huggingface/transformers postinstall dependency that installs a ~200MB ML runtime not listed in package.json dependencies, (3) designing branch trigger patterns that match `release/*` for beta and `main` for stable, and (4) keeping changelog generation compatible with the existing manual CHANGELOG.md format.

**Primary recommendation:** Replace all 5 workflows with 3 workflows: `quality.yml` (lint/typecheck/test on PRs + pushes), `release.yml` (auto-publish on `main` + `release/*` with OIDC trusted publishing), and `security.yml` (CodeQL + OSSF Scorecard merged). Keep docs.yml unchanged. Use OIDC trusted publishing with npm 11.5.1+ upgrade step. Do NOT adopt semantic-release or release-please -- the project already has manual version management and a well-maintained CHANGELOG.md.

## Project Constraints (from CLAUDE.md)

- **Tech stack**: Node.js >=22.6.0, TypeScript, SQLite via node:sqlite, no new runtime dependencies
- **File size**: Keep files under 500 lines
- **No unnecessary docs/READMEs**: Do not create documentation files unless explicitly requested
- **No tests**: User directive -- never waste time creating tests
- **Build/test**: `npm run build` (tsc), `npm test` (tsx --test), `npm run lint` (eslint), `npm run quality` (full pipeline)
- **Security**: Never hardcode secrets, never commit .env files
- **Concurrency**: Batch all related operations in one message

## Standard Stack

### Core (No New Dependencies)

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| GitHub Actions | N/A | CI/CD platform | Already in use, no alternative needed |
| actions/checkout | v6 (SHA pinned) | Repo checkout | Already pinned in existing workflows |
| actions/setup-node | v6 (SHA pinned) | Node.js setup | Already pinned, supports npm cache |
| npm CLI | 11.5.1+ | Package publishing | Required for OIDC trusted publishing; Node 22 ships npm 10 so must upgrade in CI |
| gh CLI | built-in | GitHub release creation | Pre-installed on ubuntu-latest runners |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| github/codeql-action | v4 (SHA pinned) | Security scanning | Keep existing CodeQL workflow |
| ossf/scorecard-action | v2 (SHA pinned) | Supply chain security | Keep existing scorecard workflow |
| actions/upload-pages-artifact | v4 | Docs deploy | Keep existing docs workflow unchanged |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| OIDC trusted publishing | Granular access tokens (NPM_TOKEN) | Granular tokens have 90-day max lifetime, require manual rotation, weaker security posture -- OIDC is strictly better |
| Manual CHANGELOG.md | semantic-release | Would take over version management; project already has established manual versioning workflow with `bump:beta` script |
| Manual CHANGELOG.md | release-please | Creates PR-based release flow that conflicts with direct-push model; adds complexity for a single-package repo |
| Manual CHANGELOG.md | changesets | Designed for monorepos; overkill for single package |
| Custom version-change detection | semantic-release auto-versioning | Project already has `npm version prerelease --preid=beta` workflow; changing would disrupt established process |

### Version Verification

Versions verified against the existing workflow files in the repository. The project already uses:
- `actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd` (v6)
- `actions/setup-node@6044e13b5dc448c55e2357c09f80417699197238` (v6) in release.yml
- `actions/setup-node@53b83947a5a98c8d113130e565377fae1a50d02f` (v6) in quality.yml
- `github/codeql-action/*@c10b8064de6f491fea524254123dbe5e09572f13` (v4.35.1)
- `ossf/scorecard-action@4eaacf0543bb3f2c246792bd56e8cdeffafb205a` (v2.4.3)

Note: setup-node has two different SHAs across workflows -- should be unified to the newer one.

## Existing Workflow Audit

### Current State (5 workflows)

| File | Trigger | Purpose | Status | Issues |
|------|---------|---------|--------|--------|
| `release.yml` | push to main/beta + package.json changed | npm publish + GitHub release | Functional but misaligned | Triggers on `beta` branch (stale), not `release/*`; uses NPM_TOKEN (deprecated approach); `npm-publish` environment gate may not exist |
| `quality.yml` | PR + push to main/beta | Run `npm run quality` | Functional | Only triggers on main/beta, not release/* branches |
| `codeql.yml` | push main/beta + PR to main + weekly schedule | CodeQL security scan | Functional | Only scans main/beta, misses release/* |
| `docs.yml` | push to main (synapse-docs/ changed) | Docusaurus build + GitHub Pages deploy | Functional | No issues -- keep as-is |
| `scorecards.yml` | push to main + weekly schedule | OSSF Scorecard | Functional | Main-only is correct for scorecard |

### Critical Issues to Fix

1. **NPM_TOKEN is deprecated**: npm classic tokens were permanently revoked on December 9, 2025. The existing workflow uses `secrets.NPM_TOKEN` which is the old approach. Must migrate to either OIDC trusted publishing or granular access tokens.

2. **Branch mismatch**: Workflows trigger on `main` + `beta` but the actual development model uses `release/*` branches (release/0.1.0, release/0.2.0, release/0.3.0). The `beta` branch exists but is stale (last commit about beta.4 docs, divergent from current work).

3. **Missing release/* triggers**: Quality checks don't run on release/* branches, meaning code pushed there isn't validated before merge to main.

4. **Postinstall in CI**: `npm ci` runs the postinstall script which attempts to install @huggingface/transformers (~200MB). This works but is slow and unnecessary for lint/typecheck. For the release workflow it IS needed since `npm run quality` includes `npm run test:coverage` which may test embedding functionality.

5. **Duplicate setup-node SHAs**: Two different SHA pins for actions/setup-node@v6 across workflows.

## Architecture Patterns

### Recommended Workflow Structure

```
.github/workflows/
  quality.yml     # Lint, typecheck, test on PRs + pushes (all branches)
  release.yml     # Auto-publish to npm + GitHub release on main + release/*
  security.yml    # CodeQL + OSSF Scorecard (merged for simplicity)
  docs.yml        # Docusaurus deploy to GitHub Pages (unchanged)
```

### Pattern 1: Branch-Based Release Tracks

**What:** Different npm dist-tags based on which branch triggers the release.
**When to use:** Always -- this is the core release model.

```yaml
on:
  push:
    branches:
      - main
      - 'release/**'
    paths:
      - 'package.json'
```

Version detection logic:
- Version contains `-beta` -> npm tag `beta`, GitHub release marked as prerelease
- Version contains `-alpha` -> npm tag `alpha`, GitHub release marked as prerelease
- Version contains `-rc` -> npm tag `next`, GitHub release marked as prerelease
- No prerelease suffix -> npm tag `latest`, GitHub release is stable

This pattern already exists in the current release.yml and is correct -- just needs the branch triggers updated.

### Pattern 2: OIDC Trusted Publishing (npm)

**What:** Publish to npm without any stored secrets using GitHub Actions OIDC.
**When to use:** All npm publish operations.

```yaml
permissions:
  contents: write   # GitHub release creation
  id-token: write   # OIDC token for npm trusted publishing

steps:
  - uses: actions/setup-node@SHA # v6
    with:
      node-version: 22
      registry-url: 'https://registry.npmjs.org'

  # CRITICAL: Upgrade npm to 11.5.1+ for OIDC support
  - run: npm install -g npm@latest

  # CRITICAL: Do NOT set NODE_AUTH_TOKEN env var
  - run: npm publish --provenance --access public --tag $TAG
```

**Prerequisites on npmjs.com:**
1. Go to https://www.npmjs.com/package/synapse-mcp/access
2. Add a "Trusted Publisher" for GitHub Actions
3. Configure: org=wmt-mobile, repo=synapse, workflow=release.yml, environment=npm-publish (optional)

### Pattern 3: Version-Change Gate

**What:** Only publish when package.json version actually changed vs previous commit.
**When to use:** Prevents duplicate publishes on non-version-bump pushes.

The existing release.yml already implements this correctly with a `git show HEAD~1:package.json` comparison. Keep this pattern.

### Pattern 4: Tarball Verification Before Publish

**What:** Run `npm pack --dry-run` and verify file count + critical files present.
**When to use:** Before every publish to catch .npmignore or files[] regressions.

The existing release.yml checks for 50+ files and specific required entries (bin/synapse.js, src/app/mcp-server.ts, etc.). Keep this pattern.

### Anti-Patterns to Avoid

- **Using `beta` branch for beta releases**: The project uses `release/*` branches, not a single `beta` branch. Don't maintain a stale beta branch.
- **Setting NODE_AUTH_TOKEN with OIDC**: An empty string value causes npm to attempt token auth instead of OIDC fallback. Omit entirely.
- **Running postinstall in quality checks**: The postinstall installs @huggingface/transformers which adds ~120s. Use `npm ci --ignore-scripts` for lint/typecheck-only jobs, then install ML deps separately only when tests need them.
- **Using semantic-release for a single-package repo with manual versioning**: Would take over version management and conflict with the established `npm version prerelease --preid=beta` workflow.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| npm tag detection from version string | Custom regex parser | Simple grep/case logic (already in release.yml) | Only 4 cases: beta, alpha, rc, latest |
| Version change detection | Complex git diff parser | `git show HEAD~1:package.json` comparison (already in release.yml) | Proven pattern, handles edge cases |
| GitHub release notes | Custom changelog parser | `gh release create --generate-notes` | GitHub auto-generates from commits |
| Action SHA pinning | Manual SHA tracking | Dependabot github-actions updates (already configured) | Automated weekly SHA updates |
| Changelog generation | Custom commit parser | Manual CHANGELOG.md maintenance (existing approach) | Project already has rich, curated changelog |

**Key insight:** The existing release.yml has good patterns for version detection, collision checking, and tarball verification. The rewrite should preserve these patterns while fixing the branch triggers and auth mechanism.

## Common Pitfalls

### Pitfall 1: OIDC Token Generation Failure

**What goes wrong:** `npm publish` fails with "403 Forbidden" or "OIDC token generation failed"
**Why it happens:** Missing `id-token: write` permission, or NODE_AUTH_TOKEN env var is set (even as empty string)
**How to avoid:** Always include `id-token: write` in permissions block. Never set NODE_AUTH_TOKEN when using OIDC. Verify trusted publisher is configured on npmjs.com for the exact workflow filename.
**Warning signs:** "Unable to get OIDC token" in CI logs

### Pitfall 2: npm Version Too Old for OIDC

**What goes wrong:** `npm publish` ignores OIDC and falls back to token auth (which fails)
**Why it happens:** Node 22 ships with npm 10.x, but OIDC trusted publishing requires npm 11.5.1+
**How to avoid:** Add explicit `npm install -g npm@latest` step before publish
**Warning signs:** No OIDC-related log output during publish

### Pitfall 3: First Publish Requires Manual Setup

**What goes wrong:** OIDC trusted publishing doesn't work for the very first version of a new package
**Why it happens:** The package must exist on npm before trusted publishers can be configured
**How to avoid:** synapse-mcp is already published (latest: 0.2.0, beta: 0.0.7-beta.2) so this is not an issue. But if package name ever changes, first publish must be manual.
**Warning signs:** "Package not found" error when configuring trusted publisher

### Pitfall 4: Postinstall Breaks CI

**What goes wrong:** `npm ci` runs postinstall which installs @huggingface/transformers, adding 60-120s to every CI run and potentially failing on network issues
**Why it happens:** postinstall script runs `npm install --no-save @huggingface/transformers@^4.0.1` at install time
**How to avoid:** For quality-only jobs: use `npm ci --ignore-scripts` then selectively run needed postinstall. For release jobs: let postinstall run since tests may need embeddings. Add retry logic or timeout to handle transient network failures.
**Warning signs:** CI timeout, `npm ERR! network` during install

### Pitfall 5: Concurrency Race on Release

**What goes wrong:** Two pushes to same branch create overlapping publish attempts, one fails with "version already exists"
**Why it happens:** GitHub Actions runs in parallel by default
**How to avoid:** Use `concurrency` group with `cancel-in-progress: false` (never cancel a publish mid-flight). Already implemented in existing release.yml.
**Warning signs:** "Version X already exists on npm registry" error

### Pitfall 6: release/* Glob Matching

**What goes wrong:** Workflow triggers on branches named `release/something` but uses `branches: release/*` which doesn't match nested paths
**Why it happens:** GitHub Actions branch filters use glob patterns where `*` does NOT match `/`
**How to avoid:** Use `'release/**'` (double-star) to match `release/0.3.0` etc. Or use `'release/*'` which works for single-level like `release/0.3.0` since there's no deeper nesting.
**Warning signs:** Pushes to release/0.3.0 don't trigger the workflow

## Code Examples

### Example 1: OIDC npm Publish Step

```yaml
# Source: verified from npm docs + community reports (2026)
- name: Upgrade npm for OIDC support
  run: npm install -g npm@latest

- name: Publish to npm (OIDC)
  run: npm publish --provenance --access public --tag ${{ steps.tag.outputs.tag }}
  # NOTE: No NODE_AUTH_TOKEN env var -- OIDC handles auth automatically
```

### Example 2: Branch-Based Tag Detection

```yaml
# Source: existing release.yml, extended for release/* branches
- name: Determine npm tag
  id: tag
  run: |
    VER=$(node -p "require('./package.json').version")
    if echo "$VER" | grep -q -- "-beta"; then
      echo "tag=beta" >> "$GITHUB_OUTPUT"
      echo "prerelease=true" >> "$GITHUB_OUTPUT"
    elif echo "$VER" | grep -q -- "-alpha"; then
      echo "tag=alpha" >> "$GITHUB_OUTPUT"
      echo "prerelease=true" >> "$GITHUB_OUTPUT"
    elif echo "$VER" | grep -q -- "-rc"; then
      echo "tag=next" >> "$GITHUB_OUTPUT"
      echo "prerelease=true" >> "$GITHUB_OUTPUT"
    else
      echo "tag=latest" >> "$GITHUB_OUTPUT"
      echo "prerelease=false" >> "$GITHUB_OUTPUT"
    fi
```

### Example 3: Quality Workflow with Optimized Install

```yaml
# Source: pattern derived from existing quality.yml + postinstall analysis
jobs:
  quality:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@SHA # v6

      - uses: actions/setup-node@SHA # v6
        with:
          node-version: 22
          cache: npm

      - name: Install (skip postinstall for speed)
        run: npm ci --ignore-scripts

      - name: Typecheck
        run: npm run check

      - name: Lint
        run: npm run lint

      # Tests need embeddings -- install ML deps then run tests
      - name: Install ML dependencies
        run: node scripts/runtime/install-synapse-skill.mjs --quiet 2>/dev/null || true

      - name: Test
        run: npm test
```

### Example 4: Concurrency Configuration

```yaml
# Source: existing release.yml pattern -- preserve exactly
concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false  # NEVER cancel a publish in flight
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| npm classic tokens (NPM_TOKEN) | OIDC trusted publishing | Dec 2025 (tokens revoked) | MUST migrate; classic tokens no longer work |
| npm 10 (bundled with Node 22) | npm 11.5.1+ (manual upgrade in CI) | Jul 2025 (OIDC GA) | Explicit `npm install -g npm@latest` step needed |
| Granular tokens (90-day expiry) | OIDC trusted publishing | Jul 2025 | No token rotation needed; provenance automatic |
| `actions/checkout@v4` | `actions/checkout@v6` | 2025 | Already using v6 |
| `actions/setup-node@v4` | `actions/setup-node@v6` | 2025 | Already using v6 |

**Deprecated/outdated:**
- **npm classic tokens**: Permanently revoked December 9, 2025. Cannot be created or used.
- **`beta` branch trigger**: Project uses `release/*` branches, not a single `beta` branch. The `beta` branch in the repo is stale.

## Open Questions

1. **OIDC Trusted Publisher Configuration on npmjs.com**
   - What we know: Requires configuring on https://www.npmjs.com/package/synapse-mcp/access with org=wmt-mobile, repo=synapse, workflow=release.yml
   - What's unclear: Whether the wmt-mobile npm account has already configured trusted publishers, or if this is a first-time setup
   - Recommendation: Plan should include a manual prerequisite step for the human to configure trusted publishing on npmjs.com before first CI publish. Include fallback to granular access token (NPM_TOKEN secret) if OIDC setup is blocked.

2. **Fallback Auth Strategy**
   - What we know: OIDC is the best path, but requires npm-side configuration by a human
   - What's unclear: Whether the repo owner can configure OIDC immediately
   - Recommendation: Implement dual-mode: try OIDC first, fall back to NPM_TOKEN if set. The existing release.yml already has a fallback pattern (`npm publish --provenance ... || npm publish ...`).

3. **`npm-publish` Environment Gate**
   - What we know: Existing release.yml references `environment: npm-publish` for manual approval
   - What's unclear: Whether this environment exists in GitHub repo settings
   - Recommendation: Keep the environment reference but make it optional (the workflow works without it, it just skips the approval gate).

4. **Should `beta` Branch Be Removed?**
   - What we know: `beta` branch is stale, divergent from `release/*` model
   - What's unclear: Whether any external consumers depend on the `beta` branch
   - Recommendation: Remove `beta` from workflow triggers. Do NOT delete the branch (out of scope for CI/CD rewrite). Just stop triggering on it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All workflows | Yes (ubuntu-latest) | 22 via setup-node | -- |
| npm CLI | Publishing | Yes (bundled) | 10.x (Node 22 default) | Upgrade to 11.5.1+ in workflow |
| gh CLI | GitHub releases | Yes (ubuntu-latest) | pre-installed | -- |
| ESLint | Quality checks | Yes (devDep) | 10.2.0 | -- |
| TypeScript | Typecheck | Yes (devDep) | 6.0.2 | -- |
| madge | Circular dep check | Yes (devDep) | 8.0.0 | -- |
| depcheck | Unused dep check | Yes (devDep) | 1.4.7 | -- |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:**
- npm 11.5.1+ for OIDC: Not available by default on Node 22 runners. Fallback: `npm install -g npm@latest` in workflow.

## Sources

### Primary (HIGH confidence)
- Existing workflow files in `.github/workflows/` -- direct source of truth for current state
- `package.json` -- direct source for scripts, dependencies, publish config
- npm classic token revocation announcement (Dec 2025): https://github.blog/changelog/2025-12-09-npm-classic-tokens-revoked-session-based-auth-and-cli-token-management-now-available/
- npm trusted publishing GA (Jul 2025): https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/
- npm trusted publishing setup guide: https://philna.sh/blog/2026/01/28/trusted-publishing-npm/

### Secondary (MEDIUM confidence)
- OIDC troubleshooting patterns: https://dev.to/zhangjintao/from-deprecated-npm-classic-tokens-to-oidc-trusted-publishing-a-cicd-troubleshooting-journey-4h8b
- npm granular token 90-day cap: https://github.blog/changelog/2025-11-05-npm-security-update-classic-token-creation-disabled-and-granular-token-changes/

### Tertiary (LOW confidence)
- Exact npm version bundled with Node 22 on ubuntu-latest runners in April 2026 (may have been updated) -- verified locally as npm 11.4.2 with Node 22.16.0, but GitHub-hosted runners may differ

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies; just reconfiguring existing GitHub Actions workflows
- Architecture: HIGH - Existing workflows provide clear patterns; changes are well-scoped
- Pitfalls: HIGH - OIDC migration is well-documented; postinstall behavior verified from source code
- Auth migration: MEDIUM - OIDC setup requires human action on npmjs.com; fallback strategy needed

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (GitHub Actions ecosystem moves fast but npm OIDC is GA and stable)
